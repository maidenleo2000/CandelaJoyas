-- ------------------------------------------------------------
-- stock_mode: permite elegir si el stock de un producto se
-- controla en base al talle (comportamiento actual) o al color
-- (útil para joyas que no tienen talles, solo colores).
-- ------------------------------------------------------------
alter table public.products
  add column stock_mode text not null default 'talle'
  check (stock_mode in ('talle', 'color'));

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
    new_stock := greatest(0, current_stock - coalesce((item->>'quantity')::integer, 1));

    update public.products
      set stock = jsonb_set(stock, array[stock_key], to_jsonb(new_stock), true)
      where id = prod.id;
  end loop;
end;
$$;
