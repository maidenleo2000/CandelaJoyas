-- ------------------------------------------------------------
-- Reservar stock apenas se crea el pedido (status 'Pendiente'),
-- para que otro cliente no pueda comprar lo mismo mientras el
-- primero paga/coordina. Si el pedido se cancela, se restaura
-- el stock automáticamente.
--
-- Se implementa con triggers en "sales" (no dependiendo del
-- cliente que llame a un RPC) para que funcione sin importar el
-- flujo que crea/actualiza la venta (WhatsApp, Mercado Pago,
-- panel de admin).
-- ------------------------------------------------------------

alter table public.sales
  add column stock_deducted boolean not null default false;

-- ------------------------------------------------------------
-- Restaura el stock de una venta (inverso de deduct_stock_for_sale)
-- ------------------------------------------------------------
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
end;
$$;

-- ------------------------------------------------------------
-- Trigger: descuenta stock al crear la venta (si la gestión de
-- stock está activa) y lo restaura si la venta se cancela.
-- ------------------------------------------------------------
create or replace function public.handle_sale_stock()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  stock_mgmt_enabled boolean;
begin
  if tg_op = 'INSERT' then
    select coalesce((data->>'enableStockManagement')::boolean, false) into stock_mgmt_enabled
      from public.site_settings where id = 1;

    if stock_mgmt_enabled and new.status <> 'Cancelada' then
      perform public.deduct_stock_for_sale(new.id);
      update public.sales set stock_deducted = true where id = new.id;
    end if;
    return new;

  elsif tg_op = 'UPDATE' then
    if new.status = 'Cancelada' and old.status <> 'Cancelada' and old.stock_deducted then
      perform public.restore_stock_for_sale(new.id);
      update public.sales set stock_deducted = false where id = new.id;
    end if;
    return new;
  end if;

  return new;
end;
$$;

create trigger on_sale_stock_change
  after insert or update on public.sales
  for each row execute function public.handle_sale_stock();
