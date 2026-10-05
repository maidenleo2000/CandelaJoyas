import { useState, useEffect, useContext, useMemo } from 'react';
import { Users, Eye, TrendingUp, FileText, Package, RefreshCw, Info, AlertTriangle } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { loadMetrics } from '../services/metrics';
import { summarizeMetrics, storeDay, METRICS_TIME_ZONE } from '../utils/metrics';
import './MetricsTab.css';
import './MetricsWorkspace.css';

const RANGES = [{ value: 'today', label: 'Hoy' }, { value: '7d', label: 'Últimos 7 días' }, { value: '30d', label: 'Últimos 30 días' }, { value: 'all', label: 'Todo el historial' }];
const number = value => new Intl.NumberFormat('es-AR').format(value);
const shortDate = day => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

function Ranking({ title, type, items, sortBy }) {
  const ordered = [...items].sort((a, b) => (sortBy === 'views' ? b.views - a.views : b.uniqueVisitors - a.uniqueVisitors) || a.label.localeCompare(b.label)).slice(0, 10);
  return <section className="metrics-panel metrics-ranking">
    <div className="metrics-panel-heading">{type === 'products' ? <Package size={19} /> : <FileText size={19} />}<h3>{title}</h3></div>
    {!ordered.length ? <p className="metrics-empty">Todavía no hay vistas registradas en este período.</p> : <div className="metrics-table-wrap"><table>
      <caption className="metrics-sr-only">{title}. Ordenado por {sortBy === 'views' ? 'vistas' : 'visitantes únicos'}.</caption>
      <thead><tr><th scope="col">Posición</th><th scope="col">{type === 'products' ? 'Producto' : 'Página'}</th><th scope="col">Vistas</th><th scope="col">Visitantes</th></tr></thead>
      <tbody>{ordered.map((item, index) => <tr key={item.key}><td><span className="metrics-rank-number">{index + 1}</span></td><th scope="row">{item.label}</th><td>{number(item.views)}</td><td>{number(item.uniqueVisitors)}</td></tr>)}</tbody>
    </table></div>}
  </section>;
}

export default function MetricsTab() {
  const { userRole, currentUser } = useContext(AuthContext);
  const [range, setRange] = useState('7d');
  const [sortBy, setSortBy] = useState('views');
  const [reload, setReload] = useState(0);
  const [state, setState] = useState({ data: null, loading: true, error: null, updatedAt: null, range: null });
  const userId = currentUser?.id;

  useEffect(() => {
    if (!userId || userRole !== 'admin') return;
    let disposed = false;
    let controller;
    let debounce;
    let day = storeDay();
    const refresh = async () => {
      controller?.abort();
      controller = new AbortController();
      const request = controller;
      setState(previous => ({ ...previous, data: null, range, loading: true, error: null }));
      try {
        const data = await loadMetrics(range, request.signal);
        if (disposed || request.signal.aborted) return;
        setState({ data, range, loading: false, error: null, updatedAt: new Date() });
      } catch (error) {
        if (disposed || request.signal.aborted) return;
        console.error('Error al leer métricas:', error);
        setState({ data: null, range, loading: false, error: 'No pudimos cargar las métricas. Volvé a intentarlo.', updatedAt: null });
      }
    };
    refresh();
    const scheduleRefresh = () => { window.clearTimeout(debounce); debounce = window.setTimeout(refresh, 600); };
    const channel = supabase.channel(`metrics-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'site_visits' }, scheduleRefresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'page_views' }, scheduleRefresh).subscribe();
    const timer = window.setInterval(() => {
      const currentDay = storeDay();
      if (currentDay !== day) { day = currentDay; refresh(); }
    }, 60000);
    return () => { disposed = true; controller?.abort(); window.clearTimeout(debounce); window.clearInterval(timer); supabase.removeChannel(channel); };
  }, [range, reload, userId, userRole]);

  const summary = useMemo(() => state.data && state.range === range ? summarizeMetrics(state.data.visits, state.data.views, range, state.data.now) : null, [state.data, state.range, range]);
  const loading = state.loading || state.range !== range;
  const max = summary ? Math.max(1, ...summary.trend.map(day => day.count)) : 1;
  const period = RANGES.find(option => option.value === range).label;
  const cards = [
    { label: 'Visitantes hoy', value: summary?.todayVisitors, hint: 'Día actual en Argentina', icon: 'users' },
    { label: 'Visitantes del período', value: summary?.periodVisitors, hint: 'Sin repetir entre distintos días', icon: 'users' },
    { label: 'Vistas del período', value: summary?.pageViews, hint: 'Incluye visitas repetidas a una página', icon: 'views' },
    { label: 'Visitantes históricos', value: summary?.totalVisitors, hint: 'Únicos en todo el historial registrado', icon: 'users' },
  ];

  if (!userId || userRole !== 'admin') return <p>No tenés acceso a estas métricas.</p>;

  return <div className="metrics-tab" aria-busy={loading}>
    <div className="metrics-toolbar">
      <div className="metrics-period-control"><label htmlFor="metrics-period">Período del informe</label><select id="metrics-period" value={range} onChange={event => setRange(event.target.value)}>{RANGES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
      <div className="metrics-update"><span>{state.updatedAt && !loading ? `Actualizado ${state.updatedAt.toLocaleTimeString('es-AR', { timeZone: METRICS_TIME_ZONE, hour: '2-digit', minute: '2-digit' })}` : 'Horario de Argentina'}</span><button type="button" onClick={() => setReload(value => value + 1)} disabled={loading}><RefreshCw size={16} className={loading ? 'metrics-spinning' : ''} />Actualizar</button></div>
    </div>
    {state.error && <div className="metrics-error" role="alert"><AlertTriangle size={20} /><p>{state.error} No se muestran ceros porque no pudimos verificar los datos.</p><button type="button" onClick={() => setReload(value => value + 1)}>Reintentar</button></div>}
    <div className="metrics-stats">{cards.map(card => <article className="metrics-stat-card" key={card.label}><div className="metrics-stat-label"><span>{card.label}</span>{card.icon === 'views' ? <Eye size={18} /> : <Users size={18} />}</div><strong>{card.value == null ? '—' : number(card.value)}</strong><p>{card.hint}</p></article>)}</div>
    {loading && <p className="metrics-loading" role="status">Cargando el informe completo…</p>}
    {summary && <>
      <section className="metrics-panel metrics-trend">
        <div className="metrics-panel-heading"><TrendingUp size={19} /><h3>Visitantes por día</h3><span>{range === 'all' ? 'Últimos 30 días' : period}</span></div>
        <p className="metrics-panel-description">Cada visitante se cuenta una vez por día. El mismo visitante puede aparecer en varios días.</p>
        <ul className={`metrics-trend-list ${summary.trend.length > 7 ? 'metrics-trend-long' : ''}`}>
          {summary.trend.map(({ day, count }) => <li key={day}><span className="metrics-trend-date">{shortDate(day)}{day === storeDay(state.data.now) && <small>Hoy</small>}</span><div className="metrics-trend-track" aria-hidden="true"><span style={{ width: `${count / max * 100}%` }} /></div><span className="metrics-trend-count" aria-label={`${count} visitantes el ${shortDate(day)}`}>{number(count)}</span></li>)}
        </ul>
        <div className="metrics-trend-footer"><span>{range === 'all' ? 'Visitas diarias en todo el historial' : 'Visitas diarias del período'}: <strong>{number(summary.dailyVisits)}</strong></span><span>Las barras se comparan con el día de mayor tráfico.</span></div>
      </section>
      <div className="metrics-ranking-heading"><div><h2>Lo más visitado</h2><p>{period} · Hasta 10 resultados por ranking</p></div><div><label htmlFor="metrics-sort">Ordenar por</label><select id="metrics-sort" value={sortBy} onChange={event => setSortBy(event.target.value)}><option value="views">Vistas de páginas</option><option value="unique">Visitantes únicos</option></select></div></div>
      <div className="metrics-top-grid"><Ranking title="Páginas más visitadas" type="pages" items={summary.pages} sortBy={sortBy} /><Ranking title="Productos más visitados" type="products" items={summary.products} sortBy={sortBy} /></div>
    </>}
    <aside className="metrics-methodology"><Info size={19} /><div><strong>Cómo leer estos números</strong><p>Un visitante es un navegador o una instalación de la app, no necesariamente una persona. Si alguien usa otro dispositivo o borra sus datos, puede contarse de nuevo. Las visitas del administrador no se registran.</p><p>Las fechas usan el horario de Argentina. Los datos históricos reflejan lo que se registró en su momento; las visitas que no se guardaron no pueden recuperarse.</p></div></aside>
  </div>;
}
