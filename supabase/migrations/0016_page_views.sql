-- ------------------------------------------------------------
-- page_views: registra cada navegación (no solo una por sesión/día
-- como site_visits) para poder armar rankings de páginas y productos
-- más visitados. Insert público (incluye visitantes anónimos),
-- lectura solo admin.
-- ------------------------------------------------------------

create table public.page_views (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  path text not null,
  product_id uuid references public.products(id) on delete set null,
  visit_date date not null default (now() at time zone 'utc')::date,
  viewed_at timestamptz not null default now()
);

create index page_views_path_idx on public.page_views(path);
create index page_views_product_idx on public.page_views(product_id);
create index page_views_date_idx on public.page_views(visit_date desc);

alter table public.page_views enable row level security;

create policy "page_views_insert_public" on public.page_views
  for insert with check (true);

create policy "page_views_select_admin" on public.page_views
  for select using (public.is_admin());

-- Sin policy de update/delete = denegado por RLS desde el cliente.

create or replace function public.record_page_view(p_visitor_id uuid, p_path text, p_product_id uuid default null)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.page_views (visitor_id, path, product_id)
  values (p_visitor_id, p_path, p_product_id);
$$;

grant execute on function public.record_page_view(uuid, text, uuid) to anon, authenticated;
