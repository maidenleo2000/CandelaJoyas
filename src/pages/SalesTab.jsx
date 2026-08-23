import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabase';
import { AuthContext } from '../contexts/AuthContext';
import { SettingsContext } from '../contexts/SettingsContext';
import { toast } from 'react-hot-toast';
import { Search, Trash2, Edit2, CheckCircle, Clock, Eye, X, Phone, User, Calendar, CreditCard, ShoppingBag, MessageSquare, Hash, Truck } from 'lucide-react';
import { saleFromRow } from '../utils/salesMapper';
import './SalesTab.css';

export default function SalesTab() {
  const { userRole, currentUser } = useContext(AuthContext);
  const { settings } = useContext(SettingsContext);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [statusFilter, setStatusFilter] = useState(''); // Nuevo estado para filtrar por clic en tarjetas
  const [editFormData, setEditFormData] = useState({
    customerName: '',
    customerPhone: '',
    status: '',
    trackingNumber: '',
    trackingCarrier: '',
    trackingUrl: ''
  });
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'all'

  const fromRow = saleFromRow;

  useEffect(() => {
    // Si no hay usuario o no es admin, no hacemos la petición
    if (!currentUser || userRole !== 'admin') {
      // Si ya sabemos que es cliente, quitamos el loader
      if (userRole === 'client') setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchSales = async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error("Error fetching sales:", error);
        toast.error("Error al cargar las ventas.");
      } else {
        setSales((data || []).map(fromRow));
      }
      setLoading(false);
    };

    fetchSales();

    const channel = supabase
      .channel(`sales_admin_changes-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => fetchSales())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userRole, currentUser]);

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este registro de venta?")) {
      try {
        const { error } = await supabase.from('sales').delete().eq('id', id);
        if (error) throw error;
        setSales(prev => prev.filter(s => s.id !== id));
        toast.success("Venta eliminada correctamente");
      } catch (error) {
        toast.error("Error al eliminar la venta");
      }
    }
  };

  const handleEdit = (sale) => {
    setSelectedSale(sale);
    setEditFormData({
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      status: sale.status || 'Pendiente',
      trackingNumber: sale.trackingNumber || '',
      trackingCarrier: sale.trackingCarrier || '',
      trackingUrl: sale.trackingUrl || ''
    });
    setIsEditing(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('sales').update({
        customer_name: editFormData.customerName,
        customer_phone: editFormData.customerPhone,
        status: editFormData.status,
        tracking_number: editFormData.trackingNumber || null,
        tracking_carrier: editFormData.trackingCarrier || null,
        tracking_url: editFormData.trackingUrl || null,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedSale.id);
      if (error) throw error;
      setSales(prev => prev.map(s => s.id === selectedSale.id ? {
        ...s,
        customerName: editFormData.customerName,
        customerPhone: editFormData.customerPhone,
        status: editFormData.status,
        trackingNumber: editFormData.trackingNumber || null,
        trackingCarrier: editFormData.trackingCarrier || null,
        trackingUrl: editFormData.trackingUrl || null,
      } : s));
      toast.success("Venta actualizada correctamente");
      setIsEditing(false);
      setSelectedSale(null);
    } catch (error) {
      toast.error("Error al actualizar la venta");
    }
  };

  // Stats based on viewMode
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const baseSales = viewMode === 'month' 
    ? sales.filter(sale => sale.createdAt >= startOfMonth && sale.status !== 'Cancelada')
    : sales.filter(sale => sale.status !== 'Cancelada');

  const income = baseSales
    .filter(sale => sale.status === 'Completada')
    .reduce((acc, sale) => acc + (sale.total || 0), 0);

  const pendingCount = baseSales.filter(sale => ['Pendiente', 'Confirmada', 'Enviada'].includes(sale.status)).length;
  const completedCount = baseSales.filter(sale => sale.status === 'Completada').length;

  const updateSaleStatus = async (id, newStatus) => {
    try {
      // El stock ya se descuenta automáticamente al crear el pedido (status "Pendiente")
      // y se restaura automáticamente si se cancela (triggers en la base de datos, ver
      // migración 0011_stock_deduct_on_pending.sql). Este fallback solo cubre pedidos
      // que hayan quedado sin descontar (ej: creados antes de esa migración).
      const currentSale = sales.find(s => s.id === id);
      const deductingStatuses = ['Confirmada', 'Enviada', 'Completada'];
      const needsFallbackDeduction = settings.enableStockManagement
        && deductingStatuses.includes(newStatus)
        && !currentSale?.stockDeducted;

      if (needsFallbackDeduction) {
        const { error: rpcError } = await supabase.rpc('deduct_stock_for_sale', { sale_id: id });
        if (rpcError) throw rpcError;

        const { error } = await supabase.from('sales').update({
          status: newStatus,
          stock_deducted: true,
          updated_at: new Date().toISOString(),
        }).eq('id', id);
        if (error) throw error;

        setSales(prev => prev.map(s => s.id === id ? { ...s, status: newStatus, stockDeducted: true } : s));
        toast.success("Estado actualizado y stock descontado");
        return;
      }

      const { error } = await supabase.from('sales').update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
      setSales(prev => prev.map(s => s.id === id
        ? { ...s, status: newStatus, stockDeducted: newStatus === 'Cancelada' ? false : s.stockDeducted }
        : s));
      toast.success("Estado actualizado");
    } catch (error) {
      console.error("Error updating sale status:", error);
      toast.error("Error al actualizar estado");
    }
  };

  const filteredSales = sales.filter(sale => {
    // 1. Status Filter from Cards
    if (statusFilter === 'pending') {
      if (!['Pendiente', 'Confirmada', 'Enviada'].includes(sale.status)) return false;
    } else if (statusFilter === 'completed') {
      if (sale.status !== 'Completada') return false;
    }

    // 2. Search Term priority
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      return (
        sale.customerName?.toLowerCase().includes(lowerSearch) ||
        sale.customerPhone?.toLowerCase().includes(lowerSearch) ||
        (sale.mercadopagoPaymentId && String(sale.mercadopagoPaymentId).toLowerCase().includes(lowerSearch))
      );
    }
    
    // 3. Date Filter
    // If we are in 'month' mode and no specific dates are searched, filter by current month
    let matchesDate = true;
    
    if (startDate) {
      const sDate = new Date(startDate);
      sDate.setHours(0,0,0,0);
      matchesDate = matchesDate && sale.createdAt >= sDate;
    } else if (viewMode === 'month' && !searchTerm) {
      // Default to month view if no search or specific date
      matchesDate = matchesDate && sale.createdAt >= startOfMonth;
    }

    if (endDate) {
      const eDate = new Date(endDate);
      eDate.setHours(23,59,59,999);
      matchesDate = matchesDate && sale.createdAt <= eDate;
    }
    return matchesDate;
  });

  if (loading) return <div className="loader" style={{margin: '4rem auto'}}></div>;

  return (
    <div className="sales-tab animate-fade-in">
      <div className="sales-header">
        <div className="filters-container">
          <div className="search-bar-container">
            <Search size={20} className="search-icon" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o teléfono..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="date-filters">
            <div className="date-input-group">
              <label>Desde:</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="date-input-group">
              <label>Hasta:</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            {(startDate || endDate || searchTerm || statusFilter || viewMode === 'all') && (
              <button className="clear-filters-btn" onClick={() => { 
                setStartDate(''); 
                setEndDate(''); 
                setSearchTerm(''); 
                setStatusFilter('');
                setViewMode('month');
              }}>
                Limpiar Filtros
              </button>
            )}
          </div>
        </div>
        
        <div className="sales-stats">
          <div 
            className={`stat-card ${viewMode === 'all' ? 'active' : ''}`}
            onClick={() => {
              setViewMode('all');
              setStartDate('');
              setEndDate('');
              setStatusFilter('');
            }}
            style={{ cursor: 'pointer' }}
          >
            <span>Ventas Totales</span>
            <strong>{sales.filter(s => s.status !== 'Cancelada').length}</strong>
          </div>
          <div 
            className={`stat-card ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => {
              setViewMode('month');
              setStartDate('');
              setEndDate('');
              setStatusFilter('');
            }}
            style={{ cursor: 'pointer' }}
          >
            <span>Ventas del Mes</span>
            <strong>{sales.filter(sale => sale.createdAt >= startOfMonth && sale.status !== 'Cancelada').length}</strong>
          </div>
          <div 
            className={`stat-card stat-pending ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'pending' ? '' : 'pending')}
            style={{ cursor: 'pointer' }}
          >
            <span>{viewMode === 'month' ? 'Pendientes (Mes)' : 'Pendientes Totales'}</span>
            <strong>{pendingCount}</strong>
          </div>
          <div 
            className={`stat-card stat-completed ${statusFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'completed' ? '' : 'completed')}
            style={{ cursor: 'pointer' }}
          >
            <span>{viewMode === 'month' ? 'Completadas (Mes)' : 'Completadas Totales'}</span>
            <strong>{completedCount}</strong>
          </div>
          <div className="stat-card">
            <span>{viewMode === 'month' ? 'Ingresos (Mes)' : 'Ingresos Totales'}</span>
            <strong>${income.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      <div className="sales-grid">
        {filteredSales.length === 0 ? (
          <div className="no-results glass">
            <ShoppingBag size={48} />
            <p>Todavía no hay ventas registradas.</p>
          </div>
        ) : (
          <div className="sales-table-container glass">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Método / Ref. Pago</th>
                  <th>Envío</th>
                  <th>Productos</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr key={sale.id}>
                    <td data-label="Fecha">
                      <div className="date-cell">
                        <Calendar size={14} />
                        {sale.createdAt.toLocaleDateString()}
                      </div>
                    </td>
                    <td data-label="Cliente">
                      <div className="customer-cell">
                        <strong>{sale.customerName}</strong>
                        {sale.customerPhone && sale.customerPhone !== 'No proporcionado' && (
                          <a 
                            href={`https://wa.me/${sale.customerPhone.replace(/\D/g, '').length <= 10 ? '549' + sale.customerPhone.replace(/\D/g, '') : sale.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${sale.customerName}! Te contacto de Candela Joyas por tu pedido de: ${sale.items?.map(item => `${item.name} (x${item.quantity})`).join(', ')}. Si querés añadir más productos podés hacerlo desde el carrito, sino podemos coordinar ahora el pago y envío de la compra.`)}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="phone-link"
                            title="Enviar WhatsApp con detalle de pedido"
                          >
                            <Phone size={12} /> {sale.customerPhone}
                          </a>
                        )}
                        {sale.customerEmail && (
                          <div className="email-link" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                             <CreditCard size={10} /> {sale.customerEmail}
                          </div>
                        )}
                      </div>
                    </td>
                    <td data-label="Método">
                       <div className="method-cell">
                         {sale.paymentMethod === 'mercadopago' ? (
                           <span className="method-badge mp" title="Mercado Pago">
                             <CreditCard size={14} /> MP
                           </span>
                         ) : (
                           <span className="method-badge wa" title="WhatsApp">
                             <MessageSquare size={14} /> WA
                           </span>
                         )}
                       </div>
                       {sale.mercadopagoPaymentId && (
                         <div className="payment-id-subtext" style={{marginTop: '4px'}}>
                           <code className="mp-id-badge">{sale.mercadopagoPaymentId}</code>
                         </div>
                       )}
                    </td>
                    <td data-label="Envío">
                      <div className="shipping-cell">
                        {sale.shippingMethod === 'mercadoenvios' ? (
                          <span className="method-badge me" title="Mercado Envíos" style={{ background: '#fff3e0', color: '#e65100', border: '1px solid #ffe0b2' }}>
                            <Truck size={14} /> Correo
                          </span>
                        ) : sale.shippingMethod === 'correoargentino' ? (
                          <span className="method-badge ca" title="Correo Argentino" style={{ background: '#fff3e0', color: '#c25e00', border: '1px solid #ffe0b2' }}>
                            <Truck size={14} /> C. Argentino
                          </span>
                        ) : (
                          <span className="method-badge co" title="Coordinar" style={{ background: '#f3e5f5', color: '#7b1fa2', border: '1px solid #e1bee7' }}>
                            <User size={14} /> Acordar
                          </span>
                        )}
                      </div>
                    </td>
                    <td data-label="Productos">
                      <div className="items-cell">
                        {sale.items?.length || 0} items
                        <button className="view-details-btn" onClick={() => setSelectedSale(sale)}>
                          <Eye size={14} /> Ver
                        </button>
                      </div>
                    </td>
                    <td data-label="Total">
                      <div className="total-cell">
                        ${sale.total?.toLocaleString()}
                      </div>
                    </td>
                    <td data-label="Estado">
                      <div className="status-cell-quick">
                        <div className="status-and-payment">
                           <span className={`status-badge ${sale.status?.toLowerCase() || 'pendiente'}`}>
                               {sale.status === 'Completada' ? <CheckCircle size={12} /> : <Clock size={12} />}
                               {sale.status || 'Pendiente'}
                           </span>
                           {sale.paymentMethod === 'mercadopago' && (
                               <span className={`payment-status-small ${sale.paymentStatus || 'pending'}`}>
                                   {sale.paymentStatus === 'approved' ? '✓ Cobrado' : '⌛ Pendiente'}
                               </span>
                           )}
                        </div>
                        <select 
                          className="quick-status-select"
                          value={sale.status || 'Pendiente'}
                          onChange={(e) => updateSaleStatus(sale.id, e.target.value)}
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="Confirmada">Confirmada</option>
                          <option value="Enviada">Enviada</option>
                          <option value="Completada">Completada</option>
                          <option value="Cancelada">Cancelada</option>
                        </select>
                      </div>
                    </td>
                    <td data-label="Acciones">
                      <div className="actions-cell">
                        <button className="edit-btn" onClick={() => handleEdit(sale)}><Edit2 size={16} /></button>
                        <button className="delete-btn" onClick={() => handleDelete(sale.id)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sale Details View */}
      {selectedSale && !isEditing && (
        <div className="modal-overlay" onClick={() => setSelectedSale(null)}>
          <div className="modal-content sale-details-modal animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalle del Pedido</h3>
              <button className="close-btn" onClick={() => setSelectedSale(null)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <div className="details-info-grid">
                <div className="info-item">
                  <User size={18} />
                  <div>
                    <label>Cliente</label>
                    <strong>{selectedSale.customerName}</strong>
                  </div>
                </div>
                <div className="info-item">
                  <Phone size={18} />
                  <div>
                    <label>Teléfono</label>
                    <a 
                      href={`https://wa.me/${selectedSale.customerPhone.replace(/\D/g, '').length <= 10 ? '549' + selectedSale.customerPhone.replace(/\D/g, '') : selectedSale.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${selectedSale.customerName}! Te contacto de Candela Joyas por tu pedido de: ${selectedSale.items?.map(item => `${item.name} (x${item.quantity})`).join(', ')}. Si querés añadir más productos podés hacerlo desde el carrito, sino podemos coordinar ahora el pago y envío de la compra.`)}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="phone-link-large"
                      title="Enviar WhatsApp con detalle de pedido"
                    >
                    <strong>{selectedSale.customerPhone}</strong>
                  </a>
                </div>
              </div>
              {selectedSale.customerEmail && (
                <div className="info-item">
                  <CreditCard size={18} />
                  <div>
                    <label>Email</label>
                    <a href={`mailto:${selectedSale.customerEmail}`} className="phone-link-large">
                      <strong>{selectedSale.customerEmail}</strong>
                    </a>
                  </div>
                </div>
              )}
              <div className="info-item">
                <Calendar size={18} />
                  <div>
                    <label>Fecha</label>
                    <strong>{selectedSale.createdAt.toLocaleString()}</strong>
                  </div>
                </div>
                <div className="info-item">
                  <CreditCard size={18} />
                  <div>
                    <label>Total</label>
                    <strong className="text-primary">${selectedSale.total?.toLocaleString()}</strong>
                  </div>
                </div>
                {selectedSale.mercadopagoPaymentId && (
                  <div className="info-item">
                    <Hash size={18} />
                    <div>
                      <label>ID de Pago (MP)</label>
                      <code className="mp-id-large">{selectedSale.mercadopagoPaymentId}</code>
                    </div>
                  </div>
                )}
                <div className="info-item">
                  <Truck size={18} />
                  <div>
                    <label>Método de Envío</label>
                    <strong>
                      {selectedSale.shippingMethod === 'mercadoenvios' ? 'Mercado Envíos'
                        : selectedSale.shippingMethod === 'correoargentino' ? 'Correo Argentino'
                        : 'Coordinar con el vendedor'}
                    </strong>
                    {selectedSale.shippingAddress && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {selectedSale.shippingAddress.street} {selectedSale.shippingAddress.number}<br/>
                        CP: {selectedSale.shippingAddress.zip} | {selectedSale.shippingAddress.city}
                        {selectedSale.shippingAddress.province && ` | ${selectedSale.shippingAddress.province}`}
                      </div>
                    )}
                    {selectedSale.shippingMethod === 'correoargentino' && (
                      <div style={{ fontSize: '0.85rem', marginTop: '6px' }}>
                        {selectedSale.correoLabelUrl ? (
                          <a href={selectedSale.correoLabelUrl} target="_blank" rel="noreferrer" className="phone-link">
                            Ver etiqueta ({selectedSale.correoTrackingNumber})
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Etiqueta pendiente — generar desde la pestaña Envíos</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {(selectedSale.trackingNumber || selectedSale.trackingCarrier || selectedSale.trackingUrl) && (
                  <div className="info-item">
                    <Truck size={18} />
                    <div>
                      <label>Seguimiento</label>
                      <strong>
                        {selectedSale.trackingCarrier || 'Transportista'}
                        {selectedSale.trackingNumber && ` — ${selectedSale.trackingNumber}`}
                      </strong>
                      {selectedSale.trackingUrl && (
                        <div style={{ fontSize: '0.85rem', marginTop: '6px' }}>
                          <a href={selectedSale.trackingUrl} target="_blank" rel="noreferrer" className="phone-link">
                            Ver seguimiento
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="items-list-container">
                <h4>Productos</h4>
                <div className="sale-items-list">
                  {selectedSale.items?.map((item, idx) => (
                    <div key={idx} className="sale-item-row">
                      <div className="item-info">
                        <strong>{item.name}</strong>
                        <span>{settings.sizeLabel || 'Talle'}: {item.selectedSize || '-'} | {settings.colorLabel || 'Color'}: {item.selectedColor || '-'}</span>
                      </div>
                      <div className="item-price">
                        {item.quantity} x ${item.price?.toLocaleString()}
                        <strong>${(item.price * item.quantity).toLocaleString()}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sale Modal */}
      {isEditing && (
        <div className="modal-overlay" onClick={() => { setIsEditing(false); setSelectedSale(null); }}>
          <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Venta</h3>
              <button className="close-btn" onClick={() => { setIsEditing(false); setSelectedSale(null); }}><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdate} className="modal-body">
              <div className="form-group">
                <label>Nombre del Cliente</label>
                <input 
                  type="text" 
                  value={editFormData.customerName}
                  onChange={(e) => setEditFormData({...editFormData, customerName: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input 
                  type="text" 
                  value={editFormData.customerPhone}
                  onChange={(e) => setEditFormData({...editFormData, customerPhone: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Estado de la Venta</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="Confirmada">Confirmada</option>
                  <option value="Enviada">Enviada</option>
                  <option value="Completada">Completada</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </div>
              <div className="form-group">
                <label>N° de Seguimiento</label>
                <input
                  type="text"
                  value={editFormData.trackingNumber}
                  onChange={(e) => setEditFormData({...editFormData, trackingNumber: e.target.value})}
                  placeholder="Ej: AR123456789"
                />
              </div>
              <div className="form-group">
                <label>Transportista</label>
                <input
                  type="text"
                  value={editFormData.trackingCarrier}
                  onChange={(e) => setEditFormData({...editFormData, trackingCarrier: e.target.value})}
                  placeholder="Ej: Andreani, OCA, Correo Argentino..."
                />
              </div>
              <div className="form-group">
                <label>URL de Seguimiento</label>
                <input
                  type="text"
                  value={editFormData.trackingUrl}
                  onChange={(e) => setEditFormData({...editFormData, trackingUrl: e.target.value})}
                  placeholder="https://..."
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => { setIsEditing(false); setSelectedSale(null); }}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
