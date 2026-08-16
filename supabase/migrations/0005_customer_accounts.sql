-- ============================================================
-- Cuentas de cliente: registro público + vínculo de pedidos +
-- seguimiento manual de envío.
-- ============================================================

-- ------------------------------------------------------------
-- Fix de seguridad: el trigger ya no debe honrar ningún "role"
-- enviado por el cliente en raw_user_meta_data (supabase.auth.signUp
-- permite mandar cualquier metadata arbitraria desde el navegador).
-- El único camino a 'admin' sigue siendo el email hardcodeado o una
-- actualización posterior hecha por un admin ya autenticado.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    case
      when lower(new.email) in ('leandromartello1987@gmail.com', 'yesyrockmetal@gmail.com')
        then 'admin'
      else 'client'
    end
  );
  return new;
end;
$$;

-- ------------------------------------------------------------
-- sales: vínculo opcional a la cuenta que hizo el pedido (el
-- checkout como invitado sigue guardando user_id = null)
-- ------------------------------------------------------------
alter table public.sales
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists sales_user_id_idx on public.sales(user_id);

-- ------------------------------------------------------------
-- sales: seguimiento manual genérico (cualquier transportista),
-- independiente de los campos correo_* que son específicos de la
-- integración automática con Correo Argentino.
-- ------------------------------------------------------------
alter table public.sales
  add column if not exists tracking_number text,
  add column if not exists tracking_carrier text,
  add column if not exists tracking_url text;

comment on column public.sales.tracking_number is 'Número de seguimiento ingresado manualmente por el admin (cualquier transportista).';
comment on column public.sales.tracking_carrier is 'Nombre del transportista/courier (texto libre).';
comment on column public.sales.tracking_url is 'URL pública de seguimiento del transportista, si aplica.';

-- ------------------------------------------------------------
-- RLS: un cliente logueado puede leer (solo lectura) sus propios
-- pedidos, además de la policy existente sales_select_admin.
-- ------------------------------------------------------------
create policy "sales_select_own" on public.sales
  for select using (user_id = auth.uid());
