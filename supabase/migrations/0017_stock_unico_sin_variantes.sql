-- ============================================================
-- Productos sin colores ni talles: hasta ahora deduct_stock_for_sale
-- y restore_stock_for_sale saltaban el ítem (`continue`) cuando no
-- había selectedSize/selectedColor, así que el stock de un producto
-- sin variantes nunca se descontaba en ventas web. Ahora, cuando el
-- producto no tiene colores ni talles cargados, se usa la clave fija
-- "unico" (la misma convención que ya usa el admin al cargar el
-- stock de esos productos).
-- ============================================================

create or replace function public.deduct_stock_for_sale(sale_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  item jsonb;
  prod record;
  has_colors boolean;
  has_sizes boolean;
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

    has_colors := coalesce(array_length(prod.colors, 1), 0) > 0;
    has_sizes := coalesce(array_length(prod.sizes, 1), 0) > 0;

    if not has_colors and not has_sizes then
      stock_key := 'unico';
    elsif prod.stock_mode = 'color' then
      if (item->>'selectedColor') is null or (item->>'selectedColor') = '' then
        continue;
      end if;
      stock_key := (item->>'selectedColor');
    else
      if (item->>'selectedSize') is null then
        continue;
      end if;

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
  has_sizes boolean;
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

    has_colors := coalesce(array_length(prod.colors, 1), 0) > 0;
    has_sizes := coalesce(array_length(prod.sizes, 1), 0) > 0;

    if not has_colors and not has_sizes then
      stock_key := 'unico';
    elsif prod.stock_mode = 'color' then
      if (item->>'selectedColor') is null or (item->>'selectedColor') = '' then
        continue;
      end if;
      stock_key := (item->>'selectedColor');
    else
      if (item->>'selectedSize') is null then
        continue;
      end if;

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
