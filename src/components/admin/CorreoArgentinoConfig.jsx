import { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCorreoConfigStatus, saveCorreoConfig } from '../../services/shipping';

export default function CorreoArgentinoConfig() {
  const [status, setStatus] = useState(null); // { configured } | null mientras carga
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ agreementNumber: '', userId: '', apiKey: '' });
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const s = await getCorreoConfigStatus();
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
    if (!form.agreementNumber.trim() || !form.userId.trim() || !form.apiKey.trim()) {
      toast.error('Completá el número de acuerdo, el usuario y la API Key de Correo Argentino.');
      return;
    }
    setSaving(true);
    try {
      await saveCorreoConfig(form);
      toast.success('Credenciales de Correo Argentino guardadas.');
      setForm({ agreementNumber: '', userId: '', apiKey: '' });
      setEditing(false);
      refresh();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudieron guardar las credenciales.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: '1rem', padding: '1.25rem', background: 'rgba(255, 136, 0, 0.05)', borderRadius: '8px', border: '1px solid rgba(255, 136, 0, 0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', color: '#c25e00', fontWeight: 'bold' }}>
        <Key size={18} /> Credenciales de Correo Argentino (MiCorreo)
      </div>

      {loading ? (
        <p style={{ fontSize: '0.85rem', color: '#666' }}>Verificando configuración...</p>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {status?.configured ? (
              <>
                <CheckCircle2 size={16} color="#16a34a" />
                <span style={{ color: '#16a34a' }}>Credenciales configuradas.</span>
              </>
            ) : (
              <>
                <AlertTriangle size={16} color="#dc2626" />
                <span style={{ color: '#dc2626' }}>Todavía no cargaste tus credenciales.</span>
              </>
            )}
          </div>

          {!editing ? (
            <button type="button" className="btn btn-outline" style={{ fontSize: '0.85rem' }} onClick={() => setEditing(true)}>
              {status?.configured ? 'Cambiar credenciales' : 'Cargar credenciales'}
            </button>
          ) : (
            <div className="animate-fade-in">
              <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem' }}>
                Registrate en integracion.correoargentino.com.ar (MiCorreo) para obtener tu número de acuerdo, usuario y API Key. La cuenta queda sujeta a aprobación de Correo Argentino.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  value={form.agreementNumber}
                  onChange={(e) => setForm({ ...form, agreementNumber: e.target.value })}
                  placeholder="Número de acuerdo / contrato"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ddd' }}
                />
                <input
                  type="text"
                  value={form.userId}
                  onChange={(e) => setForm({ ...form, userId: e.target.value })}
                  placeholder="Usuario"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ddd' }}
                />
                <div className="input-with-icon" style={{ position: 'relative' }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={form.apiKey}
                    onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                    placeholder="API Key"
                    style={{ width: '100%', padding: '0.6rem', paddingRight: '2.5rem', borderRadius: '6px', border: '1px solid #ddd' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(s => !s)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
                    title={showKey ? 'Ocultar' : 'Mostrar'}
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-primary" style={{ fontSize: '0.85rem' }} onClick={handleSave} disabled={saving}>
                  <Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button type="button" className="btn btn-outline" style={{ fontSize: '0.85rem' }} onClick={() => { setEditing(false); setForm({ agreementNumber: '', userId: '', apiKey: '' }); }}>
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
