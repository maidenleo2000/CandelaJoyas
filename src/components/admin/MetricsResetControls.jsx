import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

export default function MetricsResetControls({ userId, onReset }) {
  const [access, setAccess] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        const [owner, permitted] = await Promise.all([
          supabase.rpc('is_metrics_owner'), supabase.rpc('can_reset_metrics'),
        ]);
        if (owner.error || permitted.error) throw owner.error || permitted.error;
        let rows = [];
        if (owner.data) {
          const result = await supabase.rpc('list_metrics_reset_admins');
          if (result.error) throw result.error;
          rows = result.data || [];
        }
        if (!disposed) {
          setAccess({ userId, owner: owner.data === true, allowed: permitted.data === true });
          setAdmins(rows);
        }
      } catch {
        if (!disposed) {
          setAccess(null);
          setError('No pudimos verificar los permisos de reseteo. Verificá que la actualización de la base esté aplicada.');
        }
      }
    };
    load();
    window.addEventListener('focus', load);
    return () => { disposed = true; window.removeEventListener('focus', load); };
  }, [userId, refresh]);

  const reset = async () => {
    if (!window.confirm('¿Resetear TODAS las métricas de la tienda? Se eliminarán los visitantes y las vistas de todo el historial, sin importar el período seleccionado. No se puede deshacer. Las ventas, productos y cuentas se conservan.')) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await supabase.rpc('reset_metrics');
      if (result.error) throw result.error;
      setMessage('Las métricas se resetearon. Las nuevas visitas se registrarán desde ahora.');
      onReset();
    } catch (cause) {
      console.error('Error al resetear métricas:', cause);
      const detail = cause?.message || 'No se recibió una respuesta del servidor.';
      setError(`No se pudieron resetear las métricas. ${detail}${cause?.code ? ` (Código: ${cause.code})` : ''}`);
      setRefresh(value => value + 1);
    } finally { setBusy(false); }
  };

  const changePermission = async (admin, allowed) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await supabase.rpc('set_metrics_reset_permission', { p_user_id: admin.user_id, p_allowed: allowed });
      if (result.error) throw result.error;
      setAdmins(previous => previous.map(row => row.user_id === admin.user_id ? { ...row, allowed } : row));
      setMessage(`Permiso ${allowed ? 'otorgado' : 'quitado'} a ${admin.email}.`);
    } catch {
      setError('No se pudo guardar el permiso. Volvé a intentar.');
    } finally { setBusy(false); }
  };

  const current = access?.userId === userId ? access : null;
  if (!current && !error) return null;
  if (current && !current.owner && !current.allowed && !error) return null;

  return <section className="metrics-panel metrics-reset" aria-label="Reseteo de métricas">
    {current?.allowed && <>
      <h3>Resetear métricas</h3>
      <p>Elimina todos los visitantes y las vistas del historial de la tienda. Las ventas, los productos y las cuentas se conservan.</p>
      <button type="button" disabled={busy} onClick={reset}>{busy ? 'Procesando…' : 'Resetear todas las métricas'}</button>
    </>}
    {current?.owner && <fieldset disabled={busy}>
      <legend>Administradores que pueden resetear métricas</legend>
      <p>Tu cuenta siempre tiene acceso. Solo vos podés dar o quitar este permiso. Los administradores habilitados podrán ver y usar el botón.</p>
      {!admins.length && <p>No hay otros administradores.</p>}
      {admins.map(admin => <label key={admin.user_id} className="metrics-reset-permission">
        <input type="checkbox" checked={admin.allowed} onChange={event => changePermission(admin, event.target.checked)} />
        <span>{admin.email}</span>
      </label>)}
    </fieldset>}
    {message && <p role="status">{message}</p>}
    {error && <div role="alert"><p>{error}</p><button type="button" disabled={busy} onClick={() => { setError(''); setRefresh(value => value + 1); }}>Reintentar permisos</button></div>}
  </section>;
}
