-- ============================================================
-- Integración de envíos con Correo Argentino (MiCorreo)
-- Credenciales: reutiliza public.integration_settings (key
-- 'correoArgentinoConfig'), ya cubierto por la RLS de 0002_rls.sql.
-- ============================================================

alter table public.sales
  add column if not exists correo_tracking_number text,
  add column if not exists correo_label_url text,
  add column if not exists correo_shipment_status text,
  add column if not exists correo_shipment_data jsonb;

comment on column public.sales.correo_tracking_number is 'Número de seguimiento devuelto por Correo Argentino al crear el envío.';
comment on column public.sales.correo_label_url is 'URL pública (Supabase Storage) del PDF de etiqueta con código de barras.';
comment on column public.sales.correo_shipment_status is 'Estado del envío con Correo Argentino: pending | created | error.';
comment on column public.sales.correo_shipment_data is 'Snapshot jsonb de la respuesta de cotización/creación de envío de Correo Argentino.';

-- ------------------------------------------------------------
-- Storage: bucket público "shipping-labels" para los PDF de etiquetas
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('shipping-labels', 'shipping-labels', true)
on conflict (id) do nothing;

create policy "storage_public_read_shipping_labels" on storage.objects
  for select using (bucket_id = 'shipping-labels');

create policy "storage_admin_write_shipping_labels" on storage.objects
  for insert with check (bucket_id = 'shipping-labels' and public.is_admin());

create policy "storage_admin_update_shipping_labels" on storage.objects
  for update using (bucket_id = 'shipping-labels' and public.is_admin());

create policy "storage_admin_delete_shipping_labels" on storage.objects
  for delete using (bucket_id = 'shipping-labels' and public.is_admin());
