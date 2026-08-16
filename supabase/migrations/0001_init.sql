-- ============================================================
-- Esquema inicial: tablas equivalentes a las colecciones de Firestore
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- profiles (equivalente a la colección "users" de Firestore,
-- pero vinculada 1:1 a auth.users en vez de duplicar credenciales)
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'client' check (role in ('client', 'admin')),
  push_enabled boolean not null default false,
  fcm_tokens text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Crea automáticamente el perfil cuando se registra un usuario en auth.users
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    case
      when lower(new.email) in ('leandromartello1987@gmail.com', 'yesyrockmetal@gmail.com')
        then 'admin'
      else coalesce(new.raw_user_meta_data->>'role', 'client')
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- products
-- ------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null default 0,
  category text default '',
  image_url text default '',
  images jsonb not null default '[]'::jsonb,
  description text default '',
  colors text[] not null default '{}',
  sizes text[] not null default '{}',
  stock jsonb not null default '{}'::jsonb,
  is_on_sale boolean not null default false,
  is_paused boolean not null default false,
  is_hidden boolean not null default false,
  old_price numeric,
  new_price numeric,
  discount_percentage integer not null default 0,
  video_url text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_idx on public.products(category);
create index products_created_at_idx on public.products(created_at desc);

-- ------------------------------------------------------------
-- site_settings: fila única (id = 1) con toda la config del sitio
-- (incluye "categories" como hoy, dentro del jsonb)
-- ------------------------------------------------------------
create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id, data) values (1, '{}'::jsonb);

-- ------------------------------------------------------------
-- integration_settings: settings/socialAccounts y settings/metaAppConfig
-- Contienen secretos, nunca deben ser accesibles desde el cliente.
-- ------------------------------------------------------------
create table public.integration_settings (
  key text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- sales
-- ------------------------------------------------------------
create table public.sales (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null default 'Cliente',
  customer_phone text default 'No proporcionado',
  customer_email text default '',
  items jsonb not null default '[]'::jsonb,
  total numeric not null default 0,
  status text not null default 'Pendiente',
  payment_method text not null default 'whatsapp',
  payment_status text not null default 'not_applicable',
  shipping_method text not null default 'coordinate',
  shipping_address jsonb,
  shipping_cost numeric not null default 0,
  mercadopago_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sales_created_at_idx on public.sales(created_at desc);
create index sales_status_idx on public.sales(status);

-- ------------------------------------------------------------
-- faqs
-- ------------------------------------------------------------
create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- social_posts
-- ------------------------------------------------------------
create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  product_id text,
  product_name text default '',
  image_urls text[] not null default '{}',
  caption text default '',
  targets jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  scheduled_for timestamptz,
  published_at timestamptz,
  results jsonb,
  created_at timestamptz not null default now(),
  created_by text
);

create index social_posts_status_scheduled_idx on public.social_posts(status, scheduled_for);

-- ------------------------------------------------------------
-- RPC atómica para descontar stock al confirmar una venta
-- (reemplaza los runTransaction del cliente en SalesTab / SuccessPage)
-- ------------------------------------------------------------
create function public.deduct_stock_for_sale(sale_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  item jsonb;
  prod record;
  has_colors boolean;
  stock_key text;
  current_stock integer;
  new_stock integer;
begin
  for item in select jsonb_array_elements(items) from public.sales where id = sale_id
  loop
    if (item->>'id') is null or (item->>'selectedSize') is null then
      continue;
    end if;

    select * into prod from public.products where id = (item->>'id')::uuid for update;
    if not found then
      continue;
    end if;

    has_colors := coalesce(array_length(prod.colors, 1), 0) > 0;
    if has_colors and (item->>'selectedColor') is not null and (item->>'selectedColor') <> '' then
      stock_key := (item->>'selectedSize') || '_' || (item->>'selectedColor');
    else
      stock_key := (item->>'selectedSize');
    end if;

    current_stock := coalesce((prod.stock->>stock_key)::integer, 0);
    new_stock := greatest(0, current_stock - coalesce((item->>'quantity')::integer, 1));

    update public.products
      set stock = jsonb_set(stock, array[stock_key], to_jsonb(new_stock), true)
      where id = prod.id;
  end loop;
end;
$$;
