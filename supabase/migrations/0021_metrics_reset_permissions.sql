-- Separate from profiles/settings: other admins must not grant themselves access.
create table public.metrics_reset_permissions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);
alter table public.metrics_reset_permissions enable row level security;
revoke all on public.metrics_reset_permissions from anon, authenticated;

create function public.is_metrics_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.users where id = auth.uid()
    and lower(email) = 'leandromartello1987@gmail.com' and email_confirmed_at is not null);
$$;

create function public.can_reset_metrics()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_metrics_owner() or (
    public.is_admin() and exists (
      select 1 from public.metrics_reset_permissions where user_id = auth.uid()
    )
  );
$$;

create function public.list_metrics_reset_admins()
returns table (user_id uuid, email text, allowed boolean)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_metrics_owner() then
    raise exception 'Solo el titular puede administrar estos permisos.' using errcode = '42501';
  end if;
  return query
    select u.id, u.email::text, (p.user_id is not null)
    from auth.users u
    left join public.profiles profile on profile.id = u.id
    left join public.metrics_reset_permissions p on p.user_id = u.id
    where lower(u.email) <> 'leandromartello1987@gmail.com'
      and (profile.role = 'admin' or lower(u.email) = 'yesyrockmetal@gmail.com')
    order by u.email;
end;
$$;

create function public.set_metrics_reset_permission(p_user_id uuid, p_allowed boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_metrics_owner() then
    raise exception 'Solo el titular puede administrar estos permisos.' using errcode = '42501';
  end if;
  if p_allowed is null then raise exception 'Indicá el permiso.'; end if;
  if p_allowed then
    if not exists (
      select 1 from auth.users u left join public.profiles p on p.id = u.id
      where u.id = p_user_id and (p.role = 'admin' or lower(u.email) = 'yesyrockmetal@gmail.com')
    ) then raise exception 'El usuario debe ser administrador.'; end if;
    insert into public.metrics_reset_permissions(user_id) values (p_user_id)
      on conflict (user_id) do nothing;
  else
    delete from public.metrics_reset_permissions where user_id = p_user_id;
  end if;
end;
$$;

create function public.reset_metrics()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_reset_metrics() then
    raise exception 'No tenés permiso para resetear las métricas.' using errcode = '42501';
  end if;
  -- One transaction: both histories are cleared together, never sales/products.
  lock table public.site_visits, public.page_views in exclusive mode;
  delete from public.page_views where id is not null;
  delete from public.site_visits where id is not null;
end;
$$;

revoke all on function public.is_metrics_owner() from public, anon;
revoke all on function public.can_reset_metrics() from public, anon;
revoke all on function public.list_metrics_reset_admins() from public, anon;
revoke all on function public.set_metrics_reset_permission(uuid, boolean) from public, anon;
revoke all on function public.reset_metrics() from public, anon;
grant execute on function public.is_metrics_owner(), public.can_reset_metrics(),
  public.list_metrics_reset_admins(), public.set_metrics_reset_permission(uuid, boolean),
  public.reset_metrics() to authenticated;
