import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabase';
import { SettingsContext } from '../contexts/SettingsContext';
import { toast } from 'react-hot-toast';
import { Truck, Package, CheckCircle2, AlertTriangle, Clock, FileText, Loader2 } from 'lucide-react';
import CorreoArgentinoConfig from '../components/admin/CorreoArgentinoConfig';
import { createCorreoEnvio } from '../services/shipping';
import './SalesTab.css';

const fromRow = (row) => ({
  id: row.id,
  customerName: row.customer_name,
  customerPhone: row.customer_phone,
  shippingMethod: row.shipping_method,
  shippingAddress: row.shipping_address,
  shippingCost: row.shipping_cost,
  status: row.status,
  correoTrackingNumber: row.correo_tracking_number,
  correoLabelUrl: row.correo_label_url,
  correoShipmentStatus: row.correo_shipment_status,
  createdAt: row.created_at ? new Date(row.created_at) : new Date(),
});

export default function EnviosTab() {
  const { settings, updateSettings } = useContext(SettingsContext);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState(null);
  const [form, setForm] = useState({
    enableCorreoArgentino: settings?.enableCorreoArgentino === true,
    correoOriginPostalCode: settings?.correoOriginPostalCode || '',
    correoDefaultWeightKg: settings?.correoDefaultWeightKg ?? 1,
    correoDefaultLengthCm: settings?.correoDefaultLengthCm ?? 20,
    correoDefaultWidthCm: settings?.correoDefaultWidthCm ?? 20,
    correoDefaultHeightCm: settings?.correoDefaultHeightCm ?? 20,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchSales = async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('shipping_method', 'correoargentino')
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error('Error fetching envíos:', error);
        toast.error('Error al cargar los pedidos con envío por Correo Argentino.');
      } else {
        setSales((data || []).map(fromRow));
      }
      setLoading(false);
    };

    fetchSales();

    const channel = supabase
      .channel(`envios_admin_changes-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => fetchSales())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await updateSettings({
        enableCorreoArgentino: form.enableCorreoArgentino,
        correoOriginPostalCode: form.correoOriginPostalCode,
        correoDefaultWeightKg: Number(form.correoDefaultWeightKg) || 1,
        correoDefaultLengthCm: Number(form.correoDefaultLengthCm) || 20,
        correoDefaultWidthCm: Number(form.correoDefaultWidthCm) || 20,
        correoDefaultHeightCm: Number(form.correoDefaultHeightCm) || 20,
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleGenerateLabel = async (saleId) => {
    setGeneratingId(saleId);
    try {
      await createCorreoEnvio(saleId);
      toast.success('Etiqueta generada correctamente.');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'No se pudo generar la etiqueta.');
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="sales-tab animate-fade-in">
      <div className="admin-form-panel glass" style={{ marginBottom: '2rem' }}>
        <h3><Truck size={20} /> Configuración de Correo Argentino</h3>
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
          Activá el cálculo de envío y la generación de etiquetas con Correo Argentino (MiCorreo), y cargá tus credenciales.
        </p>

        <div className="form-group" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <input
            type="checkbox"
            id="enableCorreoArgentino"
            checked={form.enableCorreoArgentino}
            onChange={(e) => setForm({ ...form, enableCorreoArgentino: e.target.checked })}
          />
          <label htmlFor="enableCorreoArgentino" style={{ fontWeight: 500 }}>
            Habilitar envío con Correo Argentino en el checkout
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
          <div className="form-group">
            <label>Código postal de origen (tu depósito/local)</label>
            <input
              type="text"
              value={form.correoOriginPostalCode}
              onChange={(e) => setForm({ ...form, correoOriginPostalCode: e.target.value })}
              placeholder="Ej. 1425"
            />
          </div>
          <div className="form-group">
            <label>Peso por defecto del paquete (kg)</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={form.correoDefaultWeightKg}
              onChange={(e) => setForm({ ...form, correoDefaultWeightKg: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Largo por defecto (cm)</label>
            <input
              type="number"
              min="1"
              value={form.correoDefaultLengthCm}
              onChange={(e) => setForm({ ...form, correoDefaultLengthCm: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Ancho por defecto (cm)</label>
            <input
              type="number"
              min="1"
              value={form.correoDefaultWidthCm}
              onChange={(e) => setForm({ ...form, correoDefaultWidthCm: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Alto por defecto (cm)</label>
            <input
              type="number"
              min="1"
              value={form.correoDefaultHeightCm}
              onChange={(e) => setForm({ ...form, correoDefaultHeightCm: e.target.value })}
            />
          </div>
        </div>

        <button type="button" className="btn btn-primary" onClick={handleSaveSettings} disabled={savingSettings}>
          {savingSettings ? 'Guardando...' : 'Guardar Configuración'}
        </button>

        <CorreoArgentinoConfig />
      </div>

      <div className="admin-form-panel glass">
        <h3><Package size={20} /> Pedidos con envío por Correo Argentino</h3>

        {loading ? (
          <div className="loader" style={{ margin: '2rem auto' }}></div>
        ) : sales.length === 0 ? (
          <div className="no-results glass">
            <Package size={48} />
            <p>Todavía no hay pedidos con envío por Correo Argentino.</p>
          </div>
        ) : (
          <div className="sales-table-container">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Dirección</th>
                  <th>Costo Envío</th>
                  <th>Estado Envío</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td data-label="Fecha">{sale.createdAt.toLocaleDateString()}</td>
                    <td data-label="Cliente">
                      <strong>{sale.customerName}</strong><br />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sale.customerPhone}</span>
                    </td>
                    <td data-label="Dirección">
                      {sale.shippingAddress ? (
                        <span style={{ fontSize: '0.85rem' }}>
                          {sale.shippingAddress.street} {sale.shippingAddress.number}, {sale.shippingAddress.city} ({sale.shippingAddress.province})<br />
                          CP: {sale.shippingAddress.zip}
                        </span>
                      ) : '-'}
                    </td>
                    <td data-label="Costo Envío">${sale.shippingCost?.toLocaleString()}</td>
                    <td data-label="Estado Envío">
                      {sale.correoShipmentStatus === 'created' ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a' }}>
                          <CheckCircle2 size={16} /> Generado
                        </span>
                      ) : sale.correoShipmentStatus === 'error' ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626' }}>
                          <AlertTriangle size={16} /> Error
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#c25e00' }}>
                          <Clock size={16} /> Pendiente
                        </span>
                      )}
                      {sale.correoTrackingNumber && (
                        <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                          <code>{sale.correoTrackingNumber}</code>
                        </div>
                      )}
                    </td>
                    <td data-label="Acciones">
                      {sale.correoLabelUrl ? (
                        <a href={sale.correoLabelUrl} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize: '0.8rem' }}>
                          <FileText size={14} /> Ver etiqueta
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ fontSize: '0.8rem' }}
                          onClick={() => handleGenerateLabel(sale.id)}
                          disabled={generatingId === sale.id}
                        >
                          {generatingId === sale.id ? <Loader2 size={14} className="spin" /> : <Truck size={14} />}
                          {' '}{generatingId === sale.id ? 'Generando...' : 'Generar etiqueta'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
