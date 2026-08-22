-- ------------------------------------------------------------
-- site_visits: métricas de tráfico (visitantes únicos por día)
-- Una fila por visitante por día (unique visitor_id + visit_date),
-- registrada vía RPC record_visit desde el cliente (público, incluye
-- visitantes anónimos). Lectura solo admin, base para la sección
-- de Métricas del panel de administración.
-- ------------------------------------------------------------

create table public.site_visits (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  visit_date date not null default (now() at time zone 'utc')::date,
  first_seen_at timestamptz not null default now(),
  path text,
  unique (visitor_id, visit_date)
);

create index site_visits_date_idx on public.site_visits(visit_date desc);

alter table public.site_visits enable row level security;

create policy "site_visits_insert_public" on public.site_visits
  for insert with check (true);

create policy "site_visits_select_admin" on public.site_visits
  for select using (public.is_admin());

-- Sin policy de update/delete = denegado por RLS desde el cliente.

create or replace function public.record_visit(p_visitor_id uuid, p_path text default null)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.site_visits (visitor_id, visit_date, path)
  values (p_visitor_id, (now() at time zone 'utc')::date, p_path)
  on conflict (visitor_id, visit_date) do nothing;
$$;

grant execute on function public.record_visit(uuid, text) to anon, authenticated;
