import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { saleFromRow, ORDER_STATUS_STEPS } from '../utils/salesMapper';
import toast from 'react-hot-toast';
import { User, Lock, Key, LogOut, Package, Truck, Calendar, CheckCircle, Clock, XCircle, ExternalLink } from 'lucide-react';
import '../pages/SalesTab.css';
import './AccountPage.css';

function OrderProgress({ status }) {
  if (status === 'Cancelada') {
    return (
      <div className="order-progress cancelled">
        <XCircle size={16} /> Pedido cancelado
      </div>
    );
  }

  const currentIndex = ORDER_STATUS_STEPS.indexOf(status);

  return (
    <div className="order-progress">
      {ORDER_STATUS_STEPS.map((step, idx) => (
        <div key={step} className={`order-progress-step ${idx <= currentIndex ? 'done' : ''}`}>
          <span className="order-progress-dot" />
          <span className="order-progress-label">{step}</span>
        </div>
      ))}
    </div>
  );
}

function OrderCard({ sale }) {
  const [expanded, setExpanded] = useState(false);
  const trackingNumber = sale.trackingNumber || sale.correoTrackingNumber;
  const trackingUrl = sale.trackingUrl || sale.correoLabelUrl;

  return (
    <div className="order-card glass">
      <div className="order-card-header" onClick={() => setExpanded(!expanded)}>
        <div>
          <div className="order-card-date">
            <Calendar size={14} /> {sale.createdAt.toLocaleDateString()}
          </div>
          <div className="order-card-items">{sale.items?.length || 0} producto(s) — ${sale.total?.toLocaleString()}</div>
        </div>
        <span className={`status-badge ${sale.status?.toLowerCase() || 'pendiente'}`}>
          {sale.status === 'Completada' ? <CheckCircle size={12} /> : <Clock size={12} />}
          {sale.status || 'Pendiente'}
        </span>
      </div>

      {expanded && (
        <div className="order-card-body animate-fade-in">
          <OrderProgress status={sale.status} />

          {trackingNumber && (
            <div className="order-tracking-box">
              <Truck size={16} />
              <div>
                <strong>{sale.trackingCarrier || 'Seguimiento'}: {trackingNumber}</strong>
                {trackingUrl && (
                  <a href={trackingUrl} target="_blank" rel="noreferrer" className="phone-link">
                    Ver seguimiento <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="order-items-list">
            {sale.items?.map((item, idx) => (
              <div key={idx} className="order-item-row">
                <span>{item.name} {item.selectedSize ? `(${item.selectedSize})` : ''} x{item.quantity}</span>
                <strong>${(item.price * item.quantity).toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  const navigate = useNavigate();
  const { currentUser, login, register, logout, changePassword } = useContext(AuthContext);

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(true);

  useEffect(() => {
    document.title = 'Mi Cuenta';
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setLoadingSales(false);
      return;
    }

    let cancelled = false;

    const fetchSales = async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error('Error fetching my orders:', error);
        toast.error('Error al cargar tus pedidos.');
      } else {
        setSales((data || []).map(saleFromRow));
      }
      setLoadingSales(false);
    };

    fetchSales();

    const channel = supabase
      .channel(`my_sales_changes-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales', filter: `user_id=eq.${currentUser.id}` }, () => fetchSales())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);
      toast.success('Sesión iniciada correctamente');
    } catch (error) {
      console.error(error);
      toast.error('Error al iniciar sesión. Revisá tus credenciales.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setIsSubmitting(true);
    try {
      await register(email, password, displayName);
      toast.success('¡Cuenta creada correctamente!');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Error al crear la cuenta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!currentUser) {
    return (
      <div className="account-login-container animate-fade-in">
        <div className="account-login-box glass">
          <div className="account-mode-tabs">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Ingresar</button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Crear Cuenta</button>
          </div>

          {mode === 'login' ? (
            <>
              <h2>Mi Cuenta</h2>
              <p>Ingresá para ver el estado de tus pedidos.</p>
              <form onSubmit={handleLogin} className="login-form">
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Ingresando...' : 'Iniciar Sesión'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2>Crear Cuenta</h2>
              <p>Registrate para hacer seguimiento de tus pedidos.</p>
              <form onSubmit={handleRegister} className="login-form">
                <input type="text" placeholder="Nombre y apellido" value={displayName} onChange={e => setDisplayName(e.target.value)} required />
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                <input type="password" placeholder="Contraseña (mínimo 6 caracteres)" value={password} onChange={e => setPassword(e.target.value)} required />
                <input type="password" placeholder="Repetir contraseña" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Creando cuenta...' : 'Crear Cuenta'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container account-page animate-fade-in">
      <div className="account-header">
        <div>
          <h1><User size={24} /> Mi Cuenta</h1>
          <p>{currentUser.email}</p>
        </div>
        <button className="btn btn-outline" onClick={handleLogout}>
          <LogOut size={18} /> Cerrar Sesión
        </button>
      </div>

      <div className="account-section glass">
        <h3><Package size={20} /> Mis Pedidos</h3>
        {loadingSales ? (
          <div className="loader" style={{ margin: '2rem auto' }}></div>
        ) : sales.length === 0 ? (
          <div className="no-results">
            <Package size={40} />
            <p>Todavía no realizaste ningún pedido.</p>
          </div>
        ) : (
          <div className="orders-list">
            {sales.map(sale => <OrderCard key={sale.id} sale={sale} />)}
          </div>
        )}
      </div>

      <div className="account-section glass">
        <h3><Lock size={20} /> Seguridad</h3>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const newPass = e.target.newPassword.value;
          const confirmPass = e.target.confirmPassword.value;

          if (!newPass || newPass.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres');
            return;
          }
          if (newPass !== confirmPass) {
            toast.error('Las contraseñas no coinciden');
            return;
          }

          try {
            await changePassword(newPass);
            e.target.reset();
          } catch {
            // Error already handled in context toast
          }
        }}>
          <div className="form-group">
            <label>Nueva Contraseña</label>
            <input name="newPassword" type="password" placeholder="Tu nueva clave" required />
          </div>
          <div className="form-group">
            <label>Repetir Nueva Contraseña</label>
            <input name="confirmPassword" type="password" placeholder="Repetí tu nueva clave" required />
          </div>
          <button type="submit" className="btn btn-primary">
            <Key size={18} /> Actualizar Contraseña
          </button>
        </form>
      </div>
    </div>
  );
}
