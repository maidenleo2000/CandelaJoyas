-- ============================================================
-- Trigger para enviar un email al comprador cuando el estado del
-- pedido cambia a "Enviada", "Completada" o "Cancelada". Los
-- estados intermedios (Pendiente/Confirmada) no notifican por email
-- para no saturar de correos al cliente.
-- ============================================================

create function public.trigger_on_sale_status_changed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.status is distinct from new.status
     and new.status in ('Enviada', 'Completada', 'Cancelada') then
    perform public.call_edge_function('on-sale-status-changed', jsonb_build_object('record', to_jsonb(new)));
  end if;
  return new;
end;
$$;

create trigger on_sale_status_changed
  after update on public.sales
  for each row execute function public.trigger_on_sale_status_changed();
