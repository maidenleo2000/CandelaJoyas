-- ============================================================
-- Las ventas web (public.sales) descuentan stock de products
-- (deduct_stock_for_sale) pero nunca quedaban registradas en
-- public.stock_sales, así que Control_Stock_Cande nunca las veía
-- en su "Historial de Ventas": solo notaba el número bajar.
--
-- Esta migración hace que cada ítem descontado de una venta web
-- también inserte una fila en stock_sales (origen 'web', enlazada
-- a la venta original vía web_sale_id) y que, si el pedido se
-- cancela y el stock se restaura, esas filas se borren.
--
-- Al revés (venta local vía stock_register_sale) no cambia nada:
-- sigue sin tocar public.sales, tal como se pedía.
-- ============================================================

alter table public.stock_sales
  add column if not exists source text not null default 'local' check (source in ('local', 'web')),
  add column if not exists web_sale_id uuid references public.sales(id) on delete cascade;

create index if not exists stock_sales_web_sale_id_idx on public.stock_sales(web_sale_id);

create or replace function public.deduct_stock_for_sale(sale_id uuid)
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
  item_qty integer;
  item_price numeric;
begin
  for item in select jsonb_array_elements(items) from public.sales where id = sale_id
  loop
    if (item->>'id') is null then
      continue;
    end if;

    select * into prod from public.products where id = (item->>'id')::uuid for update;
    if not found then
      continue;
    end if;

    if prod.stock_mode = 'color' then
      if (item->>'selectedColor') is null or (item->>'selectedColor') = '' then
        continue;
      end if;
      stock_key := (item->>'selectedColor');
    else
      if (item->>'selectedSize') is null then
        continue;
      end if;

      has_colors := coalesce(array_length(prod.colors, 1), 0) > 0;
      if has_colors and (item->>'selectedColor') is not null and (item->>'selectedColor') <> '' then
        stock_key := (item->>'selectedSize') || '_' || (item->>'selectedColor');
      else
        stock_key := (item->>'selectedSize');
      end if;
    end if;

    item_qty := coalesce((item->>'quantity')::integer, 1);
    item_price := coalesce((item->>'price')::numeric, 0);

    current_stock := coalesce((prod.stock->>stock_key)::integer, 0);
    new_stock := greatest(0, current_stock - item_qty);

    update public.products
      set stock = jsonb_set(stock, array[stock_key], to_jsonb(new_stock), true)
      where id = prod.id;

    insert into public.stock_sales (
      product_id, product_name, variant_key, quantity,
      purchase_price, sale_price, total_sale, total_profit,
      source, web_sale_id
    ) values (
      prod.id, prod.name, stock_key, item_qty,
      coalesce(prod.purchase_price, 0), item_price, item_qty * item_price,
      item_qty * (item_price - coalesce(prod.purchase_price, 0)),
      'web', sale_id
    );
  end loop;
end;
$$;

create or replace function public.restore_stock_for_sale(sale_id uuid)
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
    if (item->>'id') is null then
      continue;
    end if;

    select * into prod from public.products where id = (item->>'id')::uuid for update;
    if not found then
      continue;
    end if;

    if prod.stock_mode = 'color' then
      if (item->>'selectedColor') is null or (item->>'selectedColor') = '' then
        continue;
      end if;
      stock_key := (item->>'selectedColor');
    else
      if (item->>'selectedSize') is null then
        continue;
      end if;

      has_colors := coalesce(array_length(prod.colors, 1), 0) > 0;
      if has_colors and (item->>'selectedColor') is not null and (item->>'selectedColor') <> '' then
        stock_key := (item->>'selectedSize') || '_' || (item->>'selectedColor');
      else
        stock_key := (item->>'selectedSize');
      end if;
    end if;

    current_stock := coalesce((prod.stock->>stock_key)::integer, 0);
    new_stock := current_stock + coalesce((item->>'quantity')::integer, 1);

    update public.products
      set stock = jsonb_set(stock, array[stock_key], to_jsonb(new_stock), true)
      where id = prod.id;
  end loop;

  delete from public.stock_sales where web_sale_id = sale_id;
end;
$$;
