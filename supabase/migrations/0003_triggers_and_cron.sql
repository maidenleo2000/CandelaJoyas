-- ============================================================
-- Triggers que llaman Edge Functions (reemplazan onDocumentCreated /
-- onDocumentUpdated / onSchedule de Cloud Functions) usando pg_net.
--
-- IMPORTANTE: antes de que estos triggers/el cron funcionen hay que
-- cargar dos secretos en Vault (una sola vez, desde el SQL editor de
-- Supabase, ya con el proyecto creado y las funciones desplegadas):
--
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<service_role_key>', 'service_role_key');
--
-- Estos triggers y el cron NO se pueden probar hasta tener el
-- project_ref/keys reales, así que se dejan listos pero inertes.
-- ============================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;

create function public.call_edge_function(function_name text, payload jsonb)
returns void
language plpgsql
security definer set search_path = public, extensions, vault
as $$
declare
  base_url text;
  service_key text;
begin
  select decrypted_secret into base_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into service_key from vault.decrypted_secrets where name = 'service_role_key';

  if base_url is null or service_key is null then
    raise warning 'Vault secrets project_url/service_role_key no configurados; se omite la llamada a %', function_name;
    return;
  end if;

  perform net.http_post(
    url := base_url || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := payload
  );
end;
$$;

-- ------------------------------------------------------------
-- sales: notificar push al crear una venta
-- ------------------------------------------------------------
create function public.trigger_on_sale_created()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.call_edge_function('on-sale-created-notify', jsonb_build_object('record', to_jsonb(new)));
  return new;
end;
$$;

create trigger on_sale_created_notify
  after insert on public.sales
  for each row execute function public.trigger_on_sale_created();

-- ------------------------------------------------------------
-- sales: enviar email cuando el pago pasa a "approved"
-- ------------------------------------------------------------
create function public.trigger_on_sale_approved()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.payment_status is distinct from 'approved' and new.payment_status = 'approved' then
    perform public.call_edge_function('on-sale-approved-notify', jsonb_build_object('record', to_jsonb(new)));
  end if;
  return new;
end;
$$;

create trigger on_sale_approved_notify
  after update on public.sales
  for each row execute function public.trigger_on_sale_approved();

-- ------------------------------------------------------------
-- Cron cada 5 minutos: publicaciones sociales programadas
-- ------------------------------------------------------------
select cron.schedule(
  'process-scheduled-social-posts',
  '*/5 * * * *',
  $$ select public.call_edge_function('process-scheduled-social-posts', '{}'::jsonb); $$
);
