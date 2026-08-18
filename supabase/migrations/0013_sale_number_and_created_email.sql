-- ============================================================
-- Número interno de venta (secuencial) + trigger para enviar
-- el mail de confirmación de compra apenas se crea la venta.
-- ============================================================

alter table public.sales
  add column sale_number bigint generated always as identity unique;

-- ------------------------------------------------------------
-- sales: enviar email de confirmación de compra al crear la venta
-- (reemplaza el trigger anterior que sólo mandaba push al admin;
-- ahora dispara ambas edge functions)
-- ------------------------------------------------------------
create or replace function public.trigger_on_sale_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.call_edge_function('on-sale-created-notify', jsonb_build_object('record', to_jsonb(new)));
  perform public.call_edge_function('on-sale-created-email', jsonb_build_object('record', to_jsonb(new)));
  return new;
end;
$$;
