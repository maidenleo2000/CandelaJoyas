import { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getMpConfigStatus, saveMpConfig } from '../../services/payments';

export default function MercadoPagoConfig() {
  const [status, setStatus] = useState(null); // { configured } | null mientras carga
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const s = await getMpConfigStatus();
      setStatus(s);
    } catch (error) {
      console.error(error);
      setStatus({ configured: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleSave = async () => {
    if (!tokenInput.trim()) {
      toast.error('Pegá tu Access Token de Mercado Pago.');
      return;
    }
    setSaving(true);
    try {
      await saveMpConfig(tokenInput.trim());
      toast.success('Access Token de Mercado Pago guardado.');
      setTokenInput('');
      setEditing(false);
      refresh();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo guardar el Access Token.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: '1rem', padding: '1.25rem', background: 'rgba(0, 158, 227, 0.05)', borderRadius: '8px', border: '1px solid rgba(0, 158, 227, 0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', color: '#007eb6', fontWeight: 'bold' }}>
        <Key size={18} /> Credenciales de Mercado Pago
      </div>

      {loading ? (
        <p style={{ fontSize: '0.85rem', color: '#666' }}>Verificando configuración...</p>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {status?.configured ? (
              <>
                <CheckCircle2 size={16} color="#16a34a" />
                <span style={{ color: '#16a34a' }}>Access Token configurado.</span>
              </>
            ) : (
              <>
                <AlertTriangle size={16} color="#dc2626" />
                <span style={{ color: '#dc2626' }}>Todavía no cargaste tu Access Token.</span>
              </>
            )}
          </div>

          {!editing ? (
            <button type="button" className="btn btn-outline" style={{ fontSize: '0.85rem' }} onClick={() => setEditing(true)}>
              {status?.configured ? 'Cambiar Access Token' : 'Cargar Access Token'}
            </button>
          ) : (
            <div className="animate-fade-in">
              <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem' }}>
                Lo encontrás en tu cuenta de Mercado Pago: developers.mercadopago.com → Tus integraciones → Credenciales (Access Token de producción).
              </p>
              <div className="input-with-icon" style={{ marginBottom: '0.75rem' }}>
                <Key size={18} className="input-icon" />
                <input
                  type={showToken ? 'text' : 'password'}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="APP_USR-..."
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(s => !s)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
                  title={showToken ? 'Ocultar' : 'Mostrar'}
                >
                  {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-primary" style={{ fontSize: '0.85rem' }} onClick={handleSave} disabled={saving}>
                  <Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button type="button" className="btn btn-outline" style={{ fontSize: '0.85rem' }} onClick={() => { setEditing(false); setTokenInput(''); }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
