import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabase';
import { AuthContext } from '../contexts/AuthContext';
import { Users, TrendingUp } from 'lucide-react';
import './MetricsTab.css';

function formatDateShort(isoDate) {
  const [, month, day] = isoDate.split('-');
  return `${day}/${month}`;
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
    </div>
  );
}
