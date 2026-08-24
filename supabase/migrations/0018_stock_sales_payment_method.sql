-- ============================================================
-- Control_Stock_Cande: método de pago en las ventas del local
-- (efectivo / transferencia / mercadopago), para poder discriminarlas
-- en el cierre de caja diario. Mercado Pago se cobra con un 25% de
-- recargo sobre el precio de lista, ya calculado en el frontend
-- (RegisterSaleModal) y enviado como p_sale_price: acá solo se
-- persiste qué método se usó para poder agrupar después.
-- ============================================================

alter table public.stock_sales
  add column if not exists payment_method text
    check (payment_method in ('efectivo', 'transferencia', 'mercadopago'));

-- Ventas locales ya cargadas antes de esta migración: no sabemos con qué
-- método se cobraron, así que las dejamos en 'efectivo' (el método más
-- común de mostrador) para no perder el desglose histórico del cierre de
-- caja. Las ventas web (source = 'web') quedan sin método asignado: no
-- participan de la caja física del local.
update public.stock_sales
  set payment_method = 'efectivo'
  where source = 'local' and payment_method is null;

-- ------------------------------------------------------------
-- RPC: registrar una venta del local, ahora con método de pago.
-- ------------------------------------------------------------
create or replace function public.stock_register_sale(
  p_product_id uuid,
  p_variant_key text,
  p_qty integer,
  p_sale_price numeric,
  p_purchase_price numeric,
  p_payment_method text default 'efectivo'
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
  if p_payment_method not in ('efectivo', 'transferencia', 'mercadopago') then
    raise exception 'Método de pago inválido';
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
    purchase_price, sale_price, total_sale, total_profit, sold_by, payment_method
  ) values (
    p_product_id, prod.name, p_variant_key, p_qty,
    p_purchase_price, p_sale_price, p_qty * p_sale_price,
    p_qty * (p_sale_price - p_purchase_price), auth.uid(), p_payment_method
  ) returning * into new_sale;

  return new_sale;
end;
$$;

-- ------------------------------------------------------------
-- RPC: actualizar una venta, ahora también puede corregir el método
-- de pago (si no se manda, se conserva el que ya tenía la venta).
-- ------------------------------------------------------------
create or replace function public.stock_update_sale(
  p_sale_id uuid,
  p_new_quantity integer,
  p_new_sale_price numeric,
  p_new_purchase_price numeric,
  p_new_payment_method text default null
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
  if p_new_payment_method is not null and p_new_payment_method not in ('efectivo', 'transferencia', 'mercadopago') then
    raise exception 'Método de pago inválido';
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
    payment_method = coalesce(p_new_payment_method, payment_method),
    updated_at = now()
  where id = p_sale_id
  returning * into updated_sale;

  return updated_sale;
end;
$$;
