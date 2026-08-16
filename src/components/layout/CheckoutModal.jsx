import React, { useState, useContext } from 'react';
import { SettingsContext } from '../../contexts/SettingsContext';
import { MessageCircle, CreditCard, Clock } from 'lucide-react';
import '../common/ConfirmModal.css'; // Reuse basic modal overlay styles

export default function CheckoutModal({ isOpen, onCancel, onConfirm, isSubmitting }) {
  const { settings } = useContext(SettingsContext);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [selectedMethod, setSelectedMethod] = useState(null); // 'whatsapp' or 'mercadopago'
  const [shippingMethod, setShippingMethod] = useState('coordinate'); // 'coordinate' or 'mercadoenvios'
  
  // Address fields for shipping
  const [address, setAddress] = useState({
    street: '',
    number: '',
    zip: '',
    city: ''
  });
  const [addressError, setAddressError] = useState('');

  if (!isOpen) return null;

  const enableWhatsApp = settings?.enableWhatsApp !== false;
  const enableMercadoPago = settings?.enableMercadoPago === true;

  // Initialize selected method if not set
  if (!selectedMethod) {
    if (enableWhatsApp) setSelectedMethod('whatsapp');
    else if (enableMercadoPago) setSelectedMethod('mercadopago');
  }

  const requireName = settings?.checkoutRequireName !== false;
  const requirePhone = settings?.checkoutRequirePhone !== false;

  const handleSubmit = (e) => {
    e.preventDefault();
    let hasError = false;

    if (requireName && !customerName.trim()) {
      setNameError('El nombre es obligatorio');
      hasError = true;
    }
    
    if (requirePhone && !customerPhone.trim()) {
      setPhoneError('El teléfono es obligatorio');
      hasError = true;
    }

    if (selectedMethod === 'mercadopago') {
      if (!customerEmail.trim()) {
        setEmailError('El email es obligatorio para pagos con Mercado Pago');
        hasError = true;
      } else if (!/^\S+@\S+\.\S+$/.test(customerEmail)) {
        setEmailError('Ingresa un email válido');
        hasError = true;
      }

      // Validate address if Mercado Envios is selected
      if (shippingMethod === 'mercadoenvios') {
        if (!address.street || !address.number || !address.zip || !address.city) {
          setAddressError('Todos los campos de dirección son obligatorios para el envío');
          hasError = true;
        }
      }
    }

    if (hasError) return;
    if (!selectedMethod) {
      toast.error('Por favor, selecciona un método de pago');
      return;
    }

    onConfirm({ 
      customerName, 
      customerPhone, 
      customerEmail: selectedMethod === 'mercadopago' ? customerEmail : '',
      paymentMethod: selectedMethod,
      shippingMethod: selectedMethod === 'mercadopago' ? shippingMethod : 'coordinate',
      address: shippingMethod === 'mercadoenvios' ? address : null
    });
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Finalizar Pedido</h3>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Por favor, ingresa tus datos para procesar el pedido por WhatsApp.
          </p>
          
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Nombre completo {requireName ? '*' : '(Opcional)'}
            </label>
            <input 
              type="text" 
              className={nameError ? 'error' : ''}
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                if (e.target.value) setNameError('');
              }}
              placeholder="Ej. Juan Pérez"
              autoFocus
              style={{
                width: '100%',
                padding: '0.8rem',
                borderRadius: '8px',
                border: nameError ? '1px solid #ff4d4d' : '1px solid #ddd',
                fontSize: '1rem'
              }}
            />
            {nameError && <small style={{ color: '#ff4d4d', marginTop: '0.3rem', display: 'block' }}>{nameError}</small>}
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Teléfono {requirePhone ? '*' : '(Opcional)'}
            </label>
            <input 
              type="tel" 
              className={phoneError ? 'error' : ''}
              value={customerPhone}
              onChange={(e) => {
                setCustomerPhone(e.target.value);
                if (e.target.value) setPhoneError('');
              }}
              placeholder="Ej. 11 1234 5678"
              style={{
                width: '100%',
                padding: '0.8rem',
                borderRadius: '8px',
                border: phoneError ? '1px solid #ff4d4d' : '1px solid #ddd',
                fontSize: '1rem'
              }}
            />
            {phoneError && <small style={{ color: '#ff4d4d', marginTop: '0.3rem', display: 'block' }}>{phoneError}</small>}
          </div>

          {selectedMethod === 'mercadopago' && (
            <div className="form-group animate-fade-in" style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Email de contacto *
              </label>
              <input 
                type="email" 
                className={emailError ? 'error' : ''}
                value={customerEmail}
                onChange={(e) => {
                  setCustomerEmail(e.target.value);
                  if (e.target.value) setEmailError('');
                }}
                placeholder="tu@email.com"
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  borderRadius: '8px',
                  border: emailError ? '1px solid #ff4d4d' : '1px solid #ddd',
                  fontSize: '1rem'
                }}
              />
              <small style={{ color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block', fontSize: '0.8rem' }}>
                Te enviaremos el comprobante y detalles del envío a esta dirección.
              </small>
              {emailError && <small style={{ color: '#ff4d4d', marginTop: '0.3rem', display: 'block' }}>{emailError}</small>}
            </div>
          )}

          <div className="payment-method-selector" style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '1rem', fontWeight: '600', color: 'var(--color-dark)' }}>
              Seleccioná el método de pago:
            </label>
            
            <div className="payment-options" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {enableWhatsApp && (
                <div 
                  className={`payment-option ${selectedMethod === 'whatsapp' ? 'active' : ''}`}
                  onClick={() => setSelectedMethod('whatsapp')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: selectedMethod === 'whatsapp' ? '2px solid var(--color-primary)' : '1px solid #eee',
                    background: selectedMethod === 'whatsapp' ? 'rgba(212, 163, 115, 0.05)' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ background: '#25D366', color: 'white', padding: '8px', borderRadius: '50%', display: 'flex' }}>
                    <MessageCircle size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600' }}>WhatsApp</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Acordar pago y envío por chat</div>
                  </div>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selectedMethod === 'whatsapp' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-primary)' }}></div>}
                  </div>
                </div>
              )}

              {enableMercadoPago && (
                <div 
                  className={`payment-option ${selectedMethod === 'mercadopago' ? 'active' : ''}`}
                  onClick={() => setSelectedMethod('mercadopago')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: selectedMethod === 'mercadopago' ? '2px solid #009EE3' : '1px solid #eee',
                    background: selectedMethod === 'mercadopago' ? 'rgba(0, 158, 227, 0.05)' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ background: '#009EE3', color: 'white', padding: '8px', borderRadius: '50%', display: 'flex' }}>
                    <CreditCard size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600' }}>Mercado Pago</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pagar de forma segura (Tarjetas/Dinero en cuenta)</div>
                  </div>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #009EE3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selectedMethod === 'mercadopago' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#009EE3' }}></div>}
                  </div>
                </div>
              )}

              {!enableWhatsApp && !enableMercadoPago && (
                <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' }}>
                  No hay métodos de pago habilitados en este momento. Por favor contactanos por otro medio.
                </div>
              )}
            </div>
          </div>

          {selectedMethod === 'mercadopago' && settings?.enableMercadoEnvios && (
            <div className="shipping-method-selector animate-fade-in" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'rgba(255, 136, 0, 0.05)', borderRadius: '12px', border: '1px solid rgba(255, 136, 0, 0.1)' }}>
              <label style={{ display: 'block', marginBottom: '1rem', fontWeight: '600', color: 'var(--color-dark)' }}>
                ¿Cómo querés recibir tu compra?
              </label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div 
                  onClick={() => setShippingMethod('coordinate')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    cursor: 'pointer',
                    padding: '0.5rem'
                  }}
                >
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #ff8800', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {shippingMethod === 'coordinate' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff8800' }}></div>}
                  </div>
                  <div>
                    <div style={{ fontWeight: '500', fontSize: '0.95rem' }}>Coordinar entrega con el vendedor</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Retiro en local o envío personalizado</div>
                  </div>
                </div>

                <div 
                  onClick={() => setShippingMethod('mercadoenvios')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    cursor: 'pointer',
                    padding: '0.5rem'
                  }}
                >
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #ff8800', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {shippingMethod === 'mercadoenvios' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff8800' }}></div>}
                  </div>
                  <div>
                    <div style={{ fontWeight: '500', fontSize: '0.95rem' }}>Mercado Envíos</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Correo Argentino / Otros (Calculado por Mercado Pago)</div>
                  </div>
                </div>
              </div>

              {shippingMethod === 'mercadoenvios' && (
                <div className="address-fields" style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <input 
                      type="text" 
                      placeholder="Calle" 
                      value={address.street}
                      onChange={e => { setAddress({...address, street: e.target.value}); setAddressError(''); }}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ddd' }}
                    />
                  </div>
                  <div className="form-group">
                    <input 
                      type="text" 
                      placeholder="Número" 
                      value={address.number}
                      onChange={e => { setAddress({...address, number: e.target.value}); setAddressError(''); }}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ddd' }}
                    />
                  </div>
                  <div className="form-group">
                    <input 
                      type="text" 
                      placeholder="Código Postal" 
                      value={address.zip}
                      onChange={e => { setAddress({...address, zip: e.target.value}); setAddressError(''); }}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ddd' }}
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <input 
                      type="text" 
                      placeholder="Ciudad / Localidad" 
                      value={address.city}
                      onChange={e => { setAddress({...address, city: e.target.value}); setAddressError(''); }}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ddd' }}
                    />
                  </div>
                  {addressError && <small style={{ color: '#ff4d4d', gridColumn: 'span 2' }}>{addressError}</small>}
                </div>
              )}
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Procesando...' : 'Confirmar Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
