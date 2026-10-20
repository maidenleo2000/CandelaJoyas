import { useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { dailyChartGeometry, newestDaysFirst } from '../../utils/metricsChart';
import { storeDay } from '../../utils/metrics';
import './MetricsDailyActivity.css';

const number = value => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(value);
const fullDate = day => day.split('-').reverse().join('/');
const shortDate = day => fullDate(day).slice(0, 5);

export default function MetricsDailyActivity({ trend, period, now }) {
  const container = useRef(null);
  const [width, setWidth] = useState(800);
  const [selectedDay, setSelectedDay] = useState(null);
  const id = useId();
  useEffect(() => {
    const element = container.current;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const chart = dailyChartGeometry(trend, width, width < 500 ? 230 : 270);
  const selectedIndex = selectedDay ? trend.findIndex(row => row.day === selectedDay) : -1;
  const index = selectedIndex < 0 ? Math.max(0, trend.length - 1) : selectedIndex;
  const active = chart.points[index];
  const total = trend.reduce((sum, row) => sum + row.count, 0);
  const peak = trend.reduce((best, row) => row.count >= (best?.count || 0) ? row : best, null);
  const today = storeDay(now);
  const select = next => setSelectedDay(trend[next]?.day || null);
  const handlePointer = event => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * chart.width / bounds.width;
    select(Math.max(0, Math.min(trend.length - 1, Math.round((x - chart.left) / chart.plotWidth * (trend.length - 1)))));
  };

  return <section className="metrics-panel metrics-daily-activity" aria-labelledby={`${id}-heading`}>
    <div className="metrics-panel-heading"><TrendingUp size={19} aria-hidden="true" /><h3 id={`${id}-heading`}>Actividad diaria</h3><span>{period}</span></div>
    <p className="metrics-panel-description">Visitantes únicos por día. El gráfico sigue el período y los filtros seleccionados.</p>
    <div className="metrics-activity-summary">
      <div><span>Visitas diarias acumuladas</span><strong>{number(total)}</strong><small>Un visitante puede contar en varios días</small></div>
      <div><span>Promedio diario</span><strong>{number(trend.length ? total / trend.length : 0)}</strong><small>Visitantes por día</small></div>
      <div><span>Día con más actividad</span><strong>{number(peak?.count || 0)}</strong><small>{peak?.count ? fullDate(peak.day) : 'Sin visitas en este período'}</small></div>
    </div>
    {active && <div className="metrics-active-day"><span><strong>{fullDate(active.day)}</strong>{active.day === today && <small>Hoy</small>}</span><span><strong>{number(active.count)}</strong> {active.count === 1 ? 'visitante único' : 'visitantes únicos'}</span></div>}
    <div className="metrics-line-container" ref={container}>
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-labelledby={`${id}-title ${id}-description`} onPointerMove={handlePointer} onPointerDown={handlePointer}>
        <title id={`${id}-title`}>Visitantes únicos diarios · {period}</title>
        <desc id={`${id}-description`}>{trend.length ? `Desde ${fullDate(trend[0].day)} hasta ${fullDate(trend.at(-1).day)}. ${number(total)} visitas diarias acumuladas. El detalle debajo muestra cada día del más reciente al más antiguo.` : 'Sin registros.'}</desc>
        <defs><linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b18454" stopOpacity=".22" /><stop offset="100%" stopColor="#b18454" stopOpacity=".02" /></linearGradient></defs>
        {chart.yTicks.map(tick => <g key={tick.value}><line x1={chart.left} x2={chart.width - 24} y1={tick.y} y2={tick.y} className="metrics-chart-grid" /><text x={chart.left - 12} y={tick.y + 4} textAnchor="end" className="metrics-chart-label">{number(tick.value)}</text></g>)}
        {chart.area && <path d={chart.area} fill={`url(#${id}-fill)`} />}
        {chart.line && <path d={chart.line} className="metrics-chart-line" />}
        {trend.length <= 31 && chart.points.map(point => <circle key={point.day} cx={point.x} cy={point.y} r="3" className="metrics-chart-dot" />)}
        {active && <g><line x1={active.x} x2={active.x} y1="16" y2={chart.baseline} className="metrics-chart-cursor" /><circle cx={active.x} cy={active.y} r="6" className="metrics-chart-selected" /></g>}
        {chart.xTicks.map(tick => <text key={tick.day} x={tick.x} y={chart.height - 12} textAnchor="middle" className="metrics-chart-label">{shortDate(tick.day)}</text>)}
      </svg>
    </div>
    {active && <div className="metrics-chart-navigation">
      <button type="button" aria-label="Ver día anterior" disabled={index === 0} onClick={() => select(index - 1)}><ChevronLeft size={18} /></button>
      <label htmlFor={`${id}-day`} className="metrics-sr-only">Explorar visitantes por día</label>
      <input id={`${id}-day`} type="range" min="0" max={Math.max(0, trend.length - 1)} value={index} onChange={event => select(Number(event.target.value))} aria-valuetext={`${fullDate(active.day)}: ${number(active.count)} visitantes únicos`} />
      <button type="button" aria-label="Ver día siguiente" disabled={index === trend.length - 1} onClick={() => select(index + 1)}><ChevronRight size={18} /></button>
    </div>}
    <div className="metrics-chart-caption"><span><i aria-hidden="true" />Visitantes únicos</span><span>{trend.length ? `${fullDate(trend[0].day)} — ${fullDate(trend.at(-1).day)}` : 'Sin registros'}</span></div>
    <details className="metrics-daily-detail" open>
      <summary>Detalle por día <span>Más reciente primero</span></summary>
      <div className="metrics-daily-table-wrap" tabIndex="0" role="region" aria-label="Detalle diario, ordenado del más reciente al más antiguo">
        <table><caption className="metrics-sr-only">Visitantes únicos diarios. Fecha más reciente primero.</caption><thead><tr><th scope="col">Fecha</th><th scope="col">Visitantes únicos</th></tr></thead><tbody>{newestDaysFirst(trend).map(row => <tr key={row.day} className={row.day === active?.day ? 'metrics-daily-selected' : ''}><th scope="row">{fullDate(row.day)}{row.day === today && <small>Hoy</small>}</th><td>{number(row.count)}</td></tr>)}</tbody></table>
      </div>
    </details>
  </section>;
}
