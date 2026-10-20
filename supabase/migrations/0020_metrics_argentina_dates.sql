-- Keep older clients and direct inserts on the same Argentine calendar.
-- Preserve historical rows: shifting visit_date can merge distinct records.
alter table public.site_visits alter column visit_date
  set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;
alter table public.page_views alter column visit_date
  set default (now() at time zone 'America/Argentina/Buenos_Aires')::date;

create or replace function public.record_visit(p_visitor_id uuid, p_path text default null)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.site_visits (visitor_id, visit_date, path)
  values (p_visitor_id, (now() at time zone 'America/Argentina/Buenos_Aires')::date, p_path)
  on conflict (visitor_id, visit_date) do nothing;
$$;
