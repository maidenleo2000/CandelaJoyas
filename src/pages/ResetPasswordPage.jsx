import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import './AccountPage.css';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Restablecer Contraseña';
  }, []);

  useEffect(() => {
    // Supabase procesa el link del mail y emite PASSWORD_RECOVERY con una
    // sesión temporal habilitada solo para cambiar la contraseña.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
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
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Contraseña actualizada correctamente');
      navigate('/mi-cuenta', { replace: true });
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Error al actualizar la contraseña');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="account-login-container animate-fade-in">
      <div className="account-login-box glass">
        <KeyRound size={40} style={{ color: 'var(--color-primary)', marginBottom: '1rem' }} />
        {ready ? (
          <>
            <h2>Nueva Contraseña</h2>
            <p>Ingresá tu nueva contraseña para tu cuenta.</p>
            <form onSubmit={handleSubmit} className="login-form">
              <input
                type="password"
                placeholder="Nueva contraseña (mínimo 6 caracteres)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Repetir nueva contraseña"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Actualizando...' : 'Actualizar Contraseña'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2>Link inválido o vencido</h2>
            <p>Volvé a solicitar el link de recuperación desde la pantalla de inicio de sesión.</p>
            <button type="button" className="btn btn-outline" style={{ width: '100%' }} onClick={() => navigate('/mi-cuenta')}>
              Ir a Mi Cuenta
            </button>
          </>
        )}
      </div>
    </div>
  );
}
