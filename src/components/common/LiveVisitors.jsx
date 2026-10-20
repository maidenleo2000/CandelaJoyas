import { useContext, useState } from 'react';
import { ChevronUp, X } from 'lucide-react';
import { LiveVisitorsContext } from '../../contexts/LiveVisitorsContext';
import { SettingsContext } from '../../contexts/SettingsContext';
import './LiveVisitors.css';

const DISMISSED_KEY = 'tc_live_visitors_dismissed';

export default function LiveVisitors({ admin = false }) {
  const count = useContext(LiveVisitorsContext);
  const { settings, updateSettings } = useContext(SettingsContext);
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISSED_KEY) === 'true'; }
    catch { return false; }
  });
  const visible = settings.showLiveVisitors === true;
  const position = settings.liveVisitorsPosition === 'floating' ? 'floating' : 'footer';
  const floating = !admin && position === 'floating' && !dismissed;
  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISSED_KEY, 'true'); }
    catch { /* Keep the preference in memory when storage is unavailable. */ }
  };
  const restore = () => {
    setDismissed(false);
    try { sessionStorage.removeItem(DISMISSED_KEY); }
    catch { /* Keep the preference in memory when storage is unavailable. */ }
  };
  const save = async (changes) => {
    setSaving(true);
    try { await updateSettings(changes); }
    finally { setSaving(false); }
  };

  if (!admin && (!visible || !(count > 0))) return null;
  return <section className={`live-visitors ${admin ? 'live-visitors-admin' : `live-visitors-public live-visitors-${floating ? 'floating' : 'footer'}`}`} aria-label="Visitantes en vivo">
    {admin && <h2>Visitantes en vivo</h2>}
    <p role="status"><span className={`live-visitors-dot ${count === null ? 'live-visitors-offline' : ''}`} aria-hidden="true" />
      {count === null ? 'Conectando con el contador…' : count === 0 ? 'Sin visitantes activos en este momento' : floating ? `${count.toLocaleString('es-AR')} viendo ahora` : `${count.toLocaleString('es-AR')} ${count === 1 ? 'persona viendo' : 'personas viendo'} ahora`}
    </p>
    {floating && <button type="button" className="live-visitors-close" onClick={dismiss} aria-label="Cerrar contador flotante y dejarlo al pie de página" title="Dejar al pie de página"><X size={16} aria-hidden="true" /></button>}
    {!admin && position === 'floating' && !floating && dismissed && <button type="button" className="live-visitors-restore" onClick={restore} aria-label="Volver a mostrar el contador flotante" title="Volver a flotante"><ChevronUp size={18} aria-hidden="true" /></button>}
    {admin && <>
      <label className="live-visitors-toggle"><input type="checkbox" checked={visible} disabled={saving} onChange={() => save({ showLiveVisitors: !visible })} />Mostrar el contador a los clientes</label>
      <label className="live-visitors-position">Ubicación del contador en la tienda
        <select value={position} disabled={saving} onChange={event => save({ liveVisitorsPosition: event.target.value })}>
          <option value="footer">Sobre el pie de página (actual)</option>
          <option value="floating">Botón flotante</option>
        </select>
      </label>
      {position === 'floating' && <small>Flotante compacto, visible también al llegar al pie de página. Al cerrarlo, queda sobre el pie de página con una flecha para volver a flotante.</small>}
      <small>Se guarda automáticamente. Si no hay visitantes o se pierde la conexión, no se muestra nada en la tienda. Cuenta navegadores con la tienda visible, sin repetir pestañas ni incluir al administrador.</small>
    </>}
  </section>;
}
