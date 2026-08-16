-- ============================================================
-- RLS: replica firestore.rules / storage.rules
-- ============================================================

create function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      lower(coalesce(auth.jwt()->>'email', '')) in (
        'leandromartello1987@gmail.com',
        'yesyrockmetal@gmail.com'
      )
      or exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
      )
    );
$$;

-- ------------------------------------------------------------
-- products: lectura pública, escritura solo admin
-- ------------------------------------------------------------
alter table public.products enable row level security;

create policy "products_select_all" on public.products
  for select using (true);

create policy "products_write_admin" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- site_settings: lectura pública, escritura solo admin
-- ------------------------------------------------------------
alter table public.site_settings enable row level security;

create policy "site_settings_select_all" on public.site_settings
  for select using (true);

create policy "site_settings_write_admin" on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- integration_settings: nadie desde el cliente (solo service_role,
-- que bypassea RLS). Ni siquiera admins leen esto desde el navegador.
-- ------------------------------------------------------------
alter table public.integration_settings enable row level security;
-- Sin policies = deny-all para anon/authenticated.

-- ------------------------------------------------------------
-- sales: insert público (checkout de un visitante sin login),
-- select/delete solo admin, update admin o cuando pasa a "approved"
-- (mismo comportamiento algo laxo que la regla actual de Firestore)
-- ------------------------------------------------------------
alter table public.sales enable row level security;

create policy "sales_insert_public" on public.sales
  for insert with check (true);

create policy "sales_select_admin" on public.sales
  for select using (public.is_admin());

create policy "sales_delete_admin" on public.sales
  for delete using (public.is_admin());

create policy "sales_update_admin_or_approve" on public.sales
  for update using (true)
  with check (public.is_admin() or payment_status = 'approved');

-- ------------------------------------------------------------
-- faqs: lectura pública, escritura solo admin
-- ------------------------------------------------------------
alter table public.faqs enable row level security;

create policy "faqs_select_all" on public.faqs
  for select using (true);

create policy "faqs_write_admin" on public.faqs
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- social_posts: solo admin puede leer, escritura solo service_role
-- (Edge Functions)
-- ------------------------------------------------------------
alter table public.social_posts enable row level security;

create policy "social_posts_select_admin" on public.social_posts
  for select using (public.is_admin());
-- Sin policy de insert/update/delete = solo service_role puede escribir.

-- ------------------------------------------------------------
-- profiles: el usuario ve/edita su propia fila (sin poder cambiar
-- su propio role), admin ve y edita todas
-- ------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

create policy "profiles_write_admin" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- Storage: buckets públicos "products" y "settings"
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('settings', 'settings', true)
on conflict (id) do nothing;

create policy "storage_public_read" on storage.objects
  for select using (bucket_id in ('products', 'settings'));

create policy "storage_admin_write" on storage.objects
  for insert with check (bucket_id in ('products', 'settings') and public.is_admin());

create policy "storage_admin_update" on storage.objects
  for update using (bucket_id in ('products', 'settings') and public.is_admin());

create policy "storage_admin_delete" on storage.objects
  for delete using (bucket_id in ('products', 'settings') and public.is_admin());
