-- Supabase's safeupdate guard rejects DELETE without WHERE, including inside
-- security-definer functions. IDs are non-null primary keys, so this explicit
-- predicate clears the entire history while retaining the guard elsewhere.
create or replace function public.reset_metrics()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_reset_metrics() then
    raise exception 'No tenés permiso para resetear las métricas.' using errcode = '42501';
  end if;
  lock table public.site_visits, public.page_views in exclusive mode;
  delete from public.page_views where id is not null;
  delete from public.site_visits where id is not null;
end;
$$;

revoke all on function public.reset_metrics() from public, anon;
grant execute on function public.reset_metrics() to authenticated;
