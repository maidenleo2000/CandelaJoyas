import { useState, useEffect, useContext, useMemo } from 'react';
import { Users, Eye, FileText, Package, RefreshCw, Info, AlertTriangle, Download } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { loadMetrics } from '../services/metrics';
import { summarizeMetrics, storeDay, shiftDay, METRICS_TIME_ZONE } from '../utils/metrics';
import './MetricsTab.css';
import './MetricsWorkspace.css';
import LiveVisitors from '../components/common/LiveVisitors';
import MetricsResetControls from '../components/admin/MetricsResetControls';
import MetricsDailyActivity from '../components/admin/MetricsDailyActivity';

const RANGES = [{ value: 'today', label: 'Hoy' }, { value: '7d', label: 'Últimos 7 días' }, { value: '30d', label: 'Últimos 30 días' }, { value: 'all', label: 'Todo el historial' }, { value: 'custom', label: 'Fechas personalizadas' }];
const number = value => new Intl.NumberFormat('es-AR').format(value);
const shortDate = day => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

function Ranking({ title, type, items, sortBy }) {
  const ordered = [...items].sort((a, b) => (sortBy === 'views' ? b.views - a.views : b.uniqueVisitors - a.uniqueVisitors) || a.label.localeCompare(b.label)).slice(0, 10);
  return <section className="metrics-panel metrics-ranking">
    <div className="metrics-panel-heading">{type === 'products' ? <Package size={19} /> : <FileText size={19} />}<h3>{title}</h3></div>
    {!ordered.length ? <p className="metrics-empty">Todavía no hay vistas registradas en este período.</p> : <div className="metrics-table-wrap"><table>
      <caption className="metrics-sr-only">{title}. Ordenado por {sortBy === 'views' ? 'vistas' : 'visitantes únicos'}.</caption>
      <thead><tr><th scope="col">Posición</th><th scope="col">{type === 'products' ? 'Producto' : 'Página'}</th><th scope="col">Vistas</th><th scope="col">Únicos</th></tr></thead>
      <tbody>{ordered.map((item, index) => <tr key={item.key}><td><span className="metrics-rank-number">{index + 1}</span></td><th scope="row"><span>{item.label}</span><span className="metrics-ranking-bar" aria-hidden="true"><span style={{ width: `${(sortBy === 'views' ? item.views : item.uniqueVisitors) / Math.max(1, ...ordered.map(row => sortBy === 'views' ? row.views : row.uniqueVisitors)) * 100}%` }} /></span></th><td>{number(item.views)}</td><td>{number(item.uniqueVisitors)}</td></tr>)}</tbody>
    </table></div>}
  </section>;
}

export default function MetricsTab() {
  const { userRole, currentUser } = useContext(AuthContext);
  const [range, setRange] = useState('7d');
  const [sortBy, setSortBy] = useState('views');
  const [fromDay, setFromDay] = useState(() => shiftDay(storeDay(), -6));
  const [toDay, setToDay] = useState(() => storeDay());
  const [content, setContent] = useState('all');
  const [query, setQuery] = useState('');
  const [exporting, setExporting] = useState(null);
  const [exportError, setExportError] = useState('');
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

  const dateError = range === 'custom' && (!fromDay || !toDay || fromDay > toDay || toDay > storeDay() || (Date.parse(toDay) - Date.parse(fromDay)) / 86400000 > 365)
    ? 'Elegí fechas válidas: desde no puede superar hasta, ni incluir días futuros. Máximo 366 días por informe.' : '';
  const summary = useMemo(() => state.data && state.range === range && !dateError ? summarizeMetrics(state.data.visits, state.data.views, range, state.data.now, { fromDay, toDay, content, query }) : null, [state.data, state.range, range, fromDay, toDay, content, query, dateError]);
  const loading = state.loading || state.range !== range;
  const period = range === 'custom' ? `${shortDate(fromDay)}/${fromDay.slice(0, 4)} al ${shortDate(toDay)}/${toDay.slice(0, 4)}` : RANGES.find(option => option.value === range).label;
  const contentLabel = content === 'products' ? 'Solo productos' : content === 'pages' ? 'Solo páginas (sin productos)' : 'Todo el contenido';
  const filtered = content !== 'all' || Boolean(query.trim());
  const download = async format => {
    setExporting(format);
    setExportError('');
    try {
      const { exportMetrics } = await import('../utils/metricsExport');
      await exportMetrics(format, { summary, period, contentLabel, query: query.trim(), sortBy, generatedAt: state.updatedAt, allHistory: range === 'all' });
    } catch (error) {
      console.error('Error al exportar métricas:', error);
      setExportError('No pudimos generar el archivo. Volvé a intentarlo.');
    } finally { setExporting(null); }
  };
  const cards = [
    { label: 'Visitantes únicos', value: summary?.periodVisitors, hint: 'Cada navegador cuenta una sola vez en el período', icon: 'users', featured: true },
    { label: 'Vistas del período', value: summary?.pageViews, hint: 'Total de páginas y productos vistos', icon: 'views' },
    { label: 'Visitantes hoy', value: summary?.todayVisitors, hint: filtered ? 'Hoy · contenido filtrado' : 'Día actual · horario de Argentina', icon: 'users' },
    { label: 'Visitantes históricos', value: summary?.totalVisitors, hint: filtered ? 'Historial del contenido filtrado' : 'Únicos en todo el historial registrado', icon: 'users' },
  ];

  if (!userId || userRole !== 'admin') return <p>No tenés acceso a estas métricas.</p>;

  return <div className="metrics-tab" aria-busy={loading}>
    <header className="metrics-intro"><div><span className="metrics-eyebrow">ESTADÍSTICAS DE LA TIENDA</span><h2>Tu tienda en números</h2><p>Conocé cuántas visitas recibís y qué despierta más interés.</p></div><span className="metrics-timezone">Horario de Argentina</span></header>
    <div className="metrics-toolbar">
      <div className="metrics-period-control"><label htmlFor="metrics-period">Período del informe</label><select id="metrics-period" value={range} onChange={event => setRange(event.target.value)}>{RANGES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
      <div className="metrics-update"><span>{state.updatedAt && !loading ? `Actualizado ${state.updatedAt.toLocaleTimeString('es-AR', { timeZone: METRICS_TIME_ZONE, hour: '2-digit', minute: '2-digit' })}` : 'Horario de Argentina'}</span><button type="button" onClick={() => setReload(value => value + 1)} disabled={loading}><RefreshCw size={16} className={loading ? 'metrics-spinning' : ''} />Actualizar</button></div>
    </div>
    <div className="metrics-report-filters">
      {range === 'custom' && <><div><label htmlFor="metrics-from">Desde</label><input id="metrics-from" type="date" value={fromDay} max={toDay || storeDay()} onChange={event => setFromDay(event.target.value)} /></div><div><label htmlFor="metrics-to">Hasta (inclusive)</label><input id="metrics-to" type="date" value={toDay} min={fromDay} max={storeDay()} onChange={event => setToDay(event.target.value)} /></div></>}
      <div><label htmlFor="metrics-content">Contenido</label><select id="metrics-content" value={content} onChange={event => setContent(event.target.value)}><option value="all">Todo el contenido</option><option value="pages">Solo páginas</option><option value="products">Solo productos</option></select></div>
      <div className="metrics-search"><label htmlFor="metrics-search">Buscar página o producto</label><input id="metrics-search" type="search" placeholder="Nombre o ruta de la página…" value={query} onChange={event => setQuery(event.target.value)} /></div>
      <button type="button" onClick={() => { setRange('7d'); setContent('all'); setQuery(''); setFromDay(shiftDay(storeDay(), -6)); setToDay(storeDay()); }}>Restablecer filtros</button>
    </div>
    {dateError && <p className="metrics-error" role="alert">{dateError}</p>}
    <div className="metrics-export-toolbar"><p>{contentLabel}{query.trim() ? ` · Búsqueda: ${query.trim()}` : ''}. {filtered ? 'Todos los indicadores corresponden al contenido filtrado.' : 'El informe incluye el tráfico de toda la tienda.'}</p><div><button type="button" disabled={loading || !summary || Boolean(exporting)} onClick={() => download('xlsx')}><Download size={16} />{exporting === 'xlsx' ? 'Generando Excel…' : 'Excel'}</button><button type="button" disabled={loading || !summary || Boolean(exporting)} onClick={() => download('pdf')}><Download size={16} />{exporting === 'pdf' ? 'Generando PDF…' : 'PDF'}</button></div></div>
    {exporting && <p role="status" className="metrics-export-note">Preparando el reporte con gráfico y todos los resultados…</p>}
    {exportError && <p role="alert" className="metrics-error">{exportError}</p>}
    {state.error && <div className="metrics-error" role="alert"><AlertTriangle size={20} /><p>{state.error} No se muestran ceros porque no pudimos verificar los datos.</p><button type="button" onClick={() => setReload(value => value + 1)}>Reintentar</button></div>}
    <div className="metrics-section-label"><h3>Resumen del período</h3><span>{period}</span></div>
    <div className="metrics-stats">{cards.map(card => <article className={`metrics-stat-card ${card.featured ? 'metrics-stat-featured' : ''}`} key={card.label}><div className="metrics-stat-label"><span>{card.label}</span>{card.icon === 'views' ? <Eye size={18} /> : <Users size={18} />}</div><strong>{card.value == null ? '—' : number(card.value)}</strong><p>{card.hint}</p></article>)}</div>
    {loading && <p className="metrics-loading" role="status">Cargando el informe completo…</p>}
    {summary && <>
      <MetricsDailyActivity key={`${range}-${fromDay}-${toDay}-${content}-${query}`} trend={summary.trend} period={period} now={state.data.now} />
      <div className="metrics-ranking-heading"><div><h2>Lo más visitado</h2><p>{period} · Hasta 10 resultados por ranking</p></div><div><label htmlFor="metrics-sort">Ordenar por</label><select id="metrics-sort" value={sortBy} onChange={event => setSortBy(event.target.value)}><option value="views">Vistas de páginas</option><option value="unique">Visitantes únicos</option></select></div></div>
      <div className="metrics-top-grid"><Ranking title="Páginas más visitadas" type="pages" items={summary.pages} sortBy={sortBy} /><Ranking title="Productos más visitados" type="products" items={summary.products} sortBy={sortBy} /></div>
    </>}
    <details className="metrics-help"><summary><Info size={18} />Cómo se cuentan las visitas</summary><div className="metrics-methodology"><div><p>Un visitante es un navegador o una instalación de la app, no necesariamente una persona. Si alguien usa otro dispositivo o borra sus datos, puede contarse de nuevo. Las visitas del administrador no se registran.</p><p>Las fechas usan el horario de Argentina. Los datos históricos reflejan lo que se registró en su momento; las visitas que no se guardaron no pueden recuperarse.</p></div></div></details>
    <details className="metrics-settings"><summary>Configuración y administración de métricas<span>Contador en vivo y gestión del historial</span></summary><div className="metrics-settings-content"><LiveVisitors admin /><MetricsResetControls key={userId} userId={userId} onReset={() => setReload(value => value + 1)} /></div></details>
  </div>;
}
