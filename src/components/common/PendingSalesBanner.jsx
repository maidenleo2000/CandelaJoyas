import { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { AuthContext } from '../../contexts/AuthContext';
import { ShoppingBag, ArrowRight, X } from 'lucide-react';
import './PendingSalesBanner.css';

export default function PendingSalesBanner() {
  const { userRole, currentUser } = useContext(AuthContext);
  const [pendingCount, setPendingCount] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Solo escuchar si es admin logueado
    if (!currentUser || userRole !== 'admin') {
      setPendingCount(0);
      return;
    }

    let cancelled = false;

    const fetchCount = async () => {
      const { count, error } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .in('status', ['Pendiente', 'Confirmada']);
      if (cancelled) return;
      if (!error) setPendingCount(count || 0);
    };

    fetchCount();

    const channel = supabase
      .channel(`pending_sales_changes-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => fetchCount())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [currentUser, userRole]);

  // Si no hay ventas pendientes, no es admin o estamos en el dashboard de ventas, no mostrar
  if (pendingCount === 0 || userRole !== 'admin' || !isVisible) return null;

  // No mostrar si ya estamos en la pestaña de ventas del admin para no redundar
  if (location.pathname === '/admin' && location.search.includes('tab=sales')) return null;

  return (
    <div className="pending-sales-banner animate-slide-down">
      <div className="banner-content" onClick={() => navigate('/admin?tab=sales')}>
        <div className="banner-info">
          <div className="banner-icon">
            <ShoppingBag size={18} />
            <span className="badge">{pendingCount}</span>
          </div>
          <p>
            Tenés <strong>{pendingCount} {pendingCount === 1 ? 'venta activa' : 'ventas activas'}</strong> por revisar o entregar.
          </p>
        </div>
        <div className="banner-action">
          <span>Ver ventas</span>
          <ArrowRight size={16} />
        </div>
      </div>
      <button className="banner-close" onClick={() => setIsVisible(false)} title="Cerrar aviso">
        <X size={18} />
      </button>
    </div>
  );
}
