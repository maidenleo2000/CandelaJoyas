import React, { useState, useEffect, useContext, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { AuthContext } from '../contexts/AuthContext';
import { Users, TrendingUp, FileText, Package } from 'lucide-react';
import './MetricsTab.css';

function formatDateShort(isoDate) {
  const [, month, day] = isoDate.split('-');
  return `${day}/${month}`;
}

const STATIC_PAGE_LABELS = {
  '/': 'Inicio',
  '/nosotras': 'Sobre Nosotras',
  '/como-comprar': 'Cómo Comprar',
  '/mi-cuenta': 'Mi Cuenta',
  '/success': 'Compra Exitosa',
};

function labelForPath(path) {
  if (STATIC_PAGE_LABELS[path]) return STATIC_PAGE_LABELS[path];
  if (path.startsWith('/product/')) return 'Producto (detalle)';
  return path;
}

const DATE_RANGE_OPTIONS = [
  { value: 'today', label: 'Hoy' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: 'all', label: 'Todo' },
];

function dateFromForRange(range) {
  if (range === 'all') return null;
  const days = range === 'today' ? 0 : range === '7d' ? 6 : 29;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function TopVisitedSection() {
  const [dateRange, setDateRange] = useState('7d');
  const [sortBy, setSortBy] = useState('views');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetchRows = async () => {
      let query = supabase
        .from('page_views')
        .select('path, product_id, visitor_id, products(name)')
        .order('viewed_at', { ascending: false })
        .limit(5000);
      const dateFrom = dateFromForRange(dateRange);
      if (dateFrom) query = query.gte('visit_date', dateFrom);

      const { data, error } = await query;
      if (cancelled) return;

      if (error) {
        console.error('Error fetching page views:', error);
      } else {
        setRows(data || []);
      }
      setLoading(false);
    };

    fetchRows();

    const channel = supabase
      .channel(`page_views_admin-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'page_views' }, () => fetchRows())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [dateRange]);

  const topPages = useMemo(() => {
    const map = new Map();
    rows.forEach(row => {
      const entry = map.get(row.path) || { key: row.path, label: labelForPath(row.path), views: 0, visitors: new Set() };
      entry.views += 1;
      entry.visitors.add(row.visitor_id);
      map.set(row.path, entry);
    });
    return Array.from(map.values())
      .map(e => ({ key: e.key, label: e.label, views: e.views, uniqueVisitors: e.visitors.size }))
      .sort((a, b) => sortBy === 'views' ? b.views - a.views : b.uniqueVisitors - a.uniqueVisitors)
      .slice(0, 10);
  }, [rows, sortBy]);

  const topProducts = useMemo(() => {
    const map = new Map();
    rows.forEach(row => {
      if (!row.product_id) return;
      const entry = map.get(row.product_id) || {
        key: row.product_id,
        label: row.products?.name || 'Producto eliminado',
        views: 0,
        visitors: new Set(),
      };
      entry.views += 1;
      entry.visitors.add(row.visitor_id);
      map.set(row.product_id, entry);
    });
    return Array.from(map.values())
      .map(e => ({ key: e.key, label: e.label, views: e.views, uniqueVisitors: e.visitors.size }))
      .sort((a, b) => sortBy === 'views' ? b.views - a.views : b.uniqueVisitors - a.uniqueVisitors)
      .slice(0, 10);
  }, [rows, sortBy]);

  return (
    <div className="metrics-top-section">
      <div className="metrics-filters">
        <select value={dateRange} onChange={e => setDateRange(e.target.value)}>
          {DATE_RANGE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="views">Ordenar por vistas</option>
          <option value="unique">Ordenar por visitantes únicos</option>
        </select>
      </div>

      {loading ? (
        <p className="metrics-empty">Cargando ranking...</p>
      ) : (
        <div className="metrics-top-grid">
          <div className="metrics-top-card">
            <h3><FileText size={18} /> Páginas más visitadas</h3>
            {topPages.length === 0 ? (
              <p className="metrics-empty">Sin datos para este período.</p>
            ) : (
              <ol className="metrics-top-list">
                {topPages.map(item => (
                  <li key={item.key}>
                    <span className="metrics-top-label">{item.label}</span>
                    <span className="metrics-top-value">{sortBy === 'views' ? `${item.views} vistas` : `${item.uniqueVisitors} visitantes`}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="metrics-top-card">
            <h3><Package size={18} /> Productos más visitados</h3>
            {topProducts.length === 0 ? (
              <p className="metrics-empty">Sin datos para este período.</p>
            ) : (
              <ol className="metrics-top-list">
                {topProducts.map(item => (
                  <li key={item.key}>
                    <span className="metrics-top-label">{item.label}</span>
                    <span className="metrics-top-value">{sortBy === 'views' ? `${item.views} vistas` : `${item.uniqueVisitors} visitantes`}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MetricsTab() {
  const { userRole, currentUser } = useContext(AuthContext);
  const [todayCount, setTodayCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [last7Days, setLast7Days] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || userRole !== 'admin') {
      if (userRole === 'client') setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchMetrics = async () => {
      const todayIso = new Date().toISOString().slice(0, 10);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const sevenDaysAgoIso = sevenDaysAgo.toISOString().slice(0, 10);

      const [todayRes, totalRes, recentRes] = await Promise.all([
        supabase.from('site_visits').select('*', { count: 'exact', head: true }).eq('visit_date', todayIso),
        supabase.from('site_visits').select('*', { count: 'exact', head: true }),
        supabase.from('site_visits').select('visit_date').gte('visit_date', sevenDaysAgoIso).order('visit_date'),
      ]);

      if (cancelled) return;

      if (todayRes.error || totalRes.error || recentRes.error) {
        console.error('Error fetching metrics:', todayRes.error || totalRes.error || recentRes.error);
      } else {
        setTodayCount(todayRes.count || 0);
        setTotalCount(totalRes.count || 0);

        const counts = {};
        (recentRes.data || []).forEach(row => {
          counts[row.visit_date] = (counts[row.visit_date] || 0) + 1;
        });
        setLast7Days(Object.entries(counts).map(([date, count]) => ({ date, count })));
      }

      setLoading(false);
    };

    fetchMetrics();

    const channel = supabase
      .channel(`site_visits_admin-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_visits' }, () => fetchMetrics())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userRole, currentUser]);

  if (loading) {
    return <div className="metrics-tab"><p>Cargando métricas...</p></div>;
  }

  return (
    <div className="metrics-tab animate-fade-in">
      <div className="metrics-stats">
        <div className="stat-card">
          <span>Visitantes hoy</span>
          <strong>{todayCount}</strong>
        </div>
        <div className="stat-card">
          <span>Visitantes totales</span>
          <strong>{totalCount}</strong>
        </div>
      </div>

      <div className="metrics-trend">
        <h3><TrendingUp size={18} /> Últimos 7 días</h3>
        {last7Days.length === 0 ? (
          <p className="metrics-empty">Todavía no hay datos de visitas.</p>
        ) : (
          <ul className="metrics-trend-list">
            {last7Days.map(({ date, count }) => (
              <li key={date}>
                <span className="metrics-trend-date">{formatDateShort(date)}</span>
                <span className="metrics-trend-bar" style={{ width: `${Math.min(count * 8, 100)}%` }} />
                <span className="metrics-trend-count"><Users size={14} /> {count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <TopVisitedSection />
    </div>
  );
}
