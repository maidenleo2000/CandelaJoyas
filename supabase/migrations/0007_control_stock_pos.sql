-- ============================================================
-- Control_Stock_Cande: panel interno del local físico, migrado
-- desde Firebase (Firestore) a este mismo proyecto Supabase para
-- que products/stock sean una única fuente de verdad entre la
-- tienda online y el control de stock presencial.
--
-- Todo lo nuevo y exclusivo de control-stock lleva el prefijo
-- "stock_" para no invadir el namespace de la tienda. La única
-- tabla existente que se modifica es "products" (columnas nuevas,
-- todas nullable/con default), y "profiles" (se amplía el rol).
-- ============================================================

-- ------------------------------------------------------------
-- profiles: sumamos el rol 'vendor' (staff del local, sin acceso
-- de cliente de la tienda). 'client' y 'admin' siguen igual.
-- ------------------------------------------------------------
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('client', 'admin', 'vendor'));

create function public.is_store_staff()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'vendor'
    );
$$;

-- ------------------------------------------------------------
-- stock_categories / stock_subcategories: equivalentes a las
-- colecciones Firestore "categories"/"subcategories". Uso interno
-- de control-stock (no las usa el storefront de la tienda, que
-- sigue manejando sus propias categorías en site_settings.data).
-- ------------------------------------------------------------
create table public.stock_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stock_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.stock_categories(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stock_subcategories_category_id_idx on public.stock_subcategories(category_id);

-- ------------------------------------------------------------
-- products: columnas nuevas para el catálogo interno del local.
-- Se reutilizan las columnas ya existentes "category" (texto) y
-- "colors" (array) y la convención de "stock" jsonb por variante
-- que ya usa la tienda: mientras el producto no tenga materiales
-- definidos, se guarda como stock->>'unico'.
-- ------------------------------------------------------------
alter table public.products
  add column if not exists purchase_price numeric,
  add column if not exists min_stock_threshold integer not null default 0,
  add column if not exists subcategory text default '',
  add column if not exists category_id uuid references public.stock_categories(id) on delete set null,
  add column if not exists subcategory_id uuid references public.stock_subcategories(id) on delete set null;

-- Se suma a la política "products_write_admin" existente (no la
-- reemplaza): ahora también puede escribir products el staff del
-- local (rol admin o vendor de control-stock).
create policy "products_write_store_staff" on public.products
  for all using (public.is_store_staff()) with check (public.is_store_staff());

-- ------------------------------------------------------------
-- stock_sales: ventas del local físico (una fila por línea de
-- venta), equivalente a la colección Firestore "sales" de
-- control-stock. Independiente de public.sales (pedidos web).
-- ------------------------------------------------------------
create table public.stock_sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  variant_key text not null default 'unico',
  quantity integer not null,
  purchase_price numeric not null default 0,
  sale_price numeric not null default 0,
  total_sale numeric not null default 0,
  total_profit numeric not null default 0,
  sold_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stock_sales_created_at_idx on public.stock_sales(created_at desc);
create index stock_sales_product_id_idx on public.stock_sales(product_id);

-- ------------------------------------------------------------
-- stock_app_settings: branding de control-stock (reemplaza el doc
-- Firestore settings/branding). Fila única id=1.
-- ------------------------------------------------------------
create table public.stock_app_settings (
  id smallint primary key default 1 check (id = 1),
  site_name text not null default 'Control Stock',
  logo_url text not null default '',
  favicon_url text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.stock_app_settings (id) values (1);

-- ------------------------------------------------------------
-- RLS de las tablas nuevas: todas exclusivas del staff del local.
-- ------------------------------------------------------------
alter table public.stock_categories enable row level security;
alter table public.stock_subcategories enable row level security;
alter table public.stock_sales enable row level security;
alter table public.stock_app_settings enable row level security;

create policy "stock_categories_all_store_staff" on public.stock_categories
  for all using (public.is_store_staff()) with check (public.is_store_staff());

create policy "stock_subcategories_all_store_staff" on public.stock_subcategories
  for all using (public.is_store_staff()) with check (public.is_store_staff());

create policy "stock_sales_all_store_staff" on public.stock_sales
  for all using (public.is_store_staff()) with check (public.is_store_staff());

create policy "stock_app_settings_all_store_staff" on public.stock_app_settings
  for all using (public.is_store_staff()) with check (public.is_store_staff());

-- ------------------------------------------------------------
-- Storage: control-stock reutiliza el bucket público "settings"
-- (prefijo de archivo "control-stock/..."), sumando is_store_staff()
-- a las policies de escritura que ya existían para is_admin().
-- ------------------------------------------------------------
create policy "storage_store_staff_write" on storage.objects
  for insert with check (bucket_id = 'settings' and public.is_store_staff());

create policy "storage_store_staff_update" on storage.objects
  for update using (bucket_id = 'settings' and public.is_store_staff());

create policy "storage_store_staff_delete" on storage.objects
  for delete using (bucket_id = 'settings' and public.is_store_staff());

-- ------------------------------------------------------------
-- Realtime: igual que se hizo para "sales" en 0006, sin esto las
-- suscripciones postgres_changes de control-stock no reciben
-- eventos en vivo.
-- ------------------------------------------------------------
alter table public.stock_categories replica identity full;
alter table public.stock_subcategories replica identity full;
alter table public.stock_sales replica identity full;

alter publication supabase_realtime add table public.stock_categories;
alter publication supabase_realtime add table public.stock_subcategories;
alter publication supabase_realtime add table public.stock_sales;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products'
  ) then
    alter table public.products replica identity full;
    alter publication supabase_realtime add table public.products;
  end if;
end $$;

-- ------------------------------------------------------------
-- RPC: agregar stock (Surtir Stock / quick add)
-- ------------------------------------------------------------
create function public.stock_quick_add(
  p_product_id uuid,
  p_variant_key text,
  p_qty integer
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  current_stock integer;
begin
  if not public.is_store_staff() then
    raise exception 'No autorizado';
  end if;
  if p_qty <= 0 then
    raise exception 'La cantidad a agregar debe ser mayor a cero';
  end if;

  select coalesce((stock->>p_variant_key)::integer, 0) into current_stock
    from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Producto no encontrado';
  end if;

  update public.products
    set stock = jsonb_set(coalesce(stock, '{}'::jsonb), array[p_variant_key], to_jsonb(current_stock + p_qty), true),
        updated_at = now()
    where id = p_product_id;
end;
$$;

-- ------------------------------------------------------------
-- RPC: registrar una venta del local (descuenta stock + inserta
-- en stock_sales de forma atómica)
-- ------------------------------------------------------------
create function public.stock_register_sale(
  p_product_id uuid,
  p_variant_key text,
  p_qty integer,
  p_sale_price numeric,
  p_purchase_price numeric
)
returns public.stock_sales
language plpgsql
security definer set search_path = public
as $$
declare
  prod record;
  current_stock integer;
  new_sale public.stock_sales;
begin
  if not public.is_store_staff() then
    raise exception 'No autorizado';
  end if;
  if p_qty <= 0 then
    raise exception 'La cantidad debe ser mayor a cero';
  end if;

  select * into prod from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Producto no encontrado';
  end if;

  current_stock := coalesce((prod.stock->>p_variant_key)::integer, 0);
  if current_stock < p_qty then
    raise exception 'No hay stock suficiente para esta venta';
  end if;

  update public.products
    set stock = jsonb_set(coalesce(stock, '{}'::jsonb), array[p_variant_key], to_jsonb(current_stock - p_qty), true),
        updated_at = now()
    where id = p_product_id;

  insert into public.stock_sales (
    product_id, product_name, variant_key, quantity,
    purchase_price, sale_price, total_sale, total_profit, sold_by
  ) values (
    p_product_id, prod.name, p_variant_key, p_qty,
    p_purchase_price, p_sale_price, p_qty * p_sale_price,
    p_qty * (p_sale_price - p_purchase_price), auth.uid()
  ) returning * into new_sale;

  return new_sale;
end;
$$;

-- ------------------------------------------------------------
-- RPC: eliminar una venta y reponer el stock
-- ------------------------------------------------------------
create function public.stock_delete_sale(p_sale_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  sale record;
  current_stock integer;
begin
  if not public.is_store_staff() then
    raise exception 'No autorizado';
  end if;

  select * into sale from public.stock_sales where id = p_sale_id;
  if not found then
    raise exception 'Venta no encontrada';
  end if;

  select coalesce((stock->>sale.variant_key)::integer, 0) into current_stock
    from public.products where id = sale.product_id for update;

  if found then
    update public.products
      set stock = jsonb_set(coalesce(stock, '{}'::jsonb), array[sale.variant_key], to_jsonb(current_stock + sale.quantity), true),
          updated_at = now()
      where id = sale.product_id;
  end if;

  delete from public.stock_sales where id = p_sale_id;
end;
$$;

-- ------------------------------------------------------------
-- RPC: actualizar cantidad/precios de una venta, ajustando el
-- delta de stock correspondiente.
-- ------------------------------------------------------------
create function public.stock_update_sale(
  p_sale_id uuid,
  p_new_quantity integer,
  p_new_sale_price numeric,
  p_new_purchase_price numeric
)
returns public.stock_sales
language plpgsql
security definer set search_path = public
as $$
declare
  sale record;
  current_stock integer;
  qty_delta integer;
  updated_sale public.stock_sales;
begin
  if not public.is_store_staff() then
    raise exception 'No autorizado';
  end if;
  if p_new_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor a cero';
  end if;

  select * into sale from public.stock_sales where id = p_sale_id;
  if not found then
    raise exception 'Venta no encontrada';
  end if;

  qty_delta := p_new_quantity - sale.quantity;

  select coalesce((stock->>sale.variant_key)::integer, 0) into current_stock
    from public.products where id = sale.product_id for update;

  if found then
    if qty_delta > 0 and current_stock < qty_delta then
      raise exception 'No hay stock suficiente para aumentar la venta';
    end if;

    update public.products
      set stock = jsonb_set(coalesce(stock, '{}'::jsonb), array[sale.variant_key], to_jsonb(current_stock - qty_delta), true),
          updated_at = now()
      where id = sale.product_id;
  end if;

  update public.stock_sales set
    quantity = p_new_quantity,
    sale_price = p_new_sale_price,
    purchase_price = p_new_purchase_price,
    total_sale = p_new_quantity * p_new_sale_price,
    total_profit = p_new_quantity * (p_new_sale_price - p_new_purchase_price),
    updated_at = now()
  where id = p_sale_id
  returning * into updated_sale;

  return updated_sale;
end;
$$;
