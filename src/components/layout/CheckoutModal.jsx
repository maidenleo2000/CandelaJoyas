import React, { useState, useContext, useEffect, useRef } from 'react';
import { SettingsContext } from '../../contexts/SettingsContext';
import { AuthContext } from '../../contexts/AuthContext';
import { MessageCircle, CreditCard, Clock, Loader2, UserPlus, Copy, Check } from 'lucide-react';
import { quoteCorreoEnvio } from '../../services/shipping';
import { toast } from 'react-hot-toast';
import '../common/ConfirmModal.css'; // Reuse basic modal overlay styles

const ARGENTINA_PROVINCES = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes',
  'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones',
  'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe',
  'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
];

export default function CheckoutModal({ isOpen, onCancel, onConfirm, isSubmitting }) {
  const { settings } = useContext(SettingsContext);
  const { currentUser } = useContext(AuthContext);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [selectedMethod, setSelectedMethod] = useState(null); // 'whatsapp' or 'mercadopago'
  const [shippingMethod, setShippingMethod] = useState('coordinate'); // 'coordinate', 'mercadoenvios' or 'correoargentino'
  const [aliasCopied, setAliasCopied] = useState(false);

  // Crear cuenta al comprar como invitado (para poder hacer seguimiento del pedido después)
  const [wantAccount, setWantAccount] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');
  const [accountPasswordConfirm, setAccountPasswordConfirm] = useState('');
  const [accountError, setAccountError] = useState('');

  // Address fields for shipping
  const [address, setAddress] = useState({
    street: '',
    number: '',
    zip: '',
    city: '',
    province: ''
  });
  const [addressError, setAddressError] = useState('');

  // Correo Argentino live quote
  const [correoQuote, setCorreoQuote] = useState(null); // { cost, quoteId, raw }
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const quoteRequestId = useRef(0);

  useEffect(() => {
    if (shippingMethod !== 'correoargentino' || !settings?.enableCorreoArgentino) {
      setCorreoQuote(null);
      setQuoteError('');
      return;
    }
    if (!/^\d{4}$/.test(address.zip.trim())) {
      setCorreoQuote(null);
      return;
    }

    const requestId = ++quoteRequestId.current;
    const timer = setTimeout(async () => {
      setQuoting(true);
      setQuoteError('');
      try {
        const result = await quoteCorreoEnvio({
          postalCodeOrigin: settings.correoOriginPostalCode,
          postalCodeDestination: address.zip.trim(),
          weightKg: settings.correoDefaultWeightKg,
          lengthCm: settings.correoDefaultLengthCm,
          widthCm: settings.correoDefaultWidthCm,
          heightCm: settings.correoDefaultHeightCm,
        });
        if (quoteRequestId.current === requestId) {
          setCorreoQuote(result);
        }
      } catch (error) {
        if (quoteRequestId.current === requestId) {
          setCorreoQuote(null);
          setQuoteError(error.message || 'No se pudo cotizar el envío.');
        }
      } finally {
        if (quoteRequestId.current === requestId) setQuoting(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [shippingMethod, address.zip, settings?.enableCorreoArgentino]);

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

  const handleCopyAlias = async () => {
    try {
      await navigator.clipboard.writeText(settings.bankAlias);
      setAliasCopied(true);
      toast.success('Alias copiado');
      setTimeout(() => setAliasCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar el alias');
    }
  };

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

    const emailRequired = selectedMethod === 'mercadopago' || wantAccount;
    if (emailRequired) {
      if (!customerEmail.trim()) {
        setEmailError(selectedMethod === 'mercadopago' ? 'El email es obligatorio para pagos con Mercado Pago' : 'El email es obligatorio para crear tu cuenta');
        hasError = true;
      } else if (!/^\S+@\S+\.\S+$/.test(customerEmail)) {
        setEmailError('Ingresa un email válido');
        hasError = true;
      }
    }

    if (!currentUser && wantAccount) {
      if (!accountPassword || accountPassword.length < 6) {
        setAccountError('La contraseña debe tener al menos 6 caracteres');
        hasError = true;
      } else if (accountPassword !== accountPasswordConfirm) {
        setAccountError('Las contraseñas no coinciden');
        hasError = true;
      }
    }

    if (selectedMethod === 'mercadopago') {
      // Validate address if Mercado Envios or Correo Argentino is selected
      if (shippingMethod === 'mercadoenvios') {
        if (!address.street || !address.number || !address.zip || !address.city) {
          setAddressError('Todos los campos de dirección son obligatorios para el envío');
          hasError = true;
        }
      }
      if (shippingMethod === 'correoargentino') {
        if (!address.street || !address.number || !address.zip || !address.city || !address.province) {
          setAddressError('Todos los campos de dirección son obligatorios para el envío');
          hasError = true;
        } else if (!correoQuote) {
          setAddressError(quoteError || 'Esperá a que se calcule el costo de envío.');
          hasError = true;
        }
      }
    }

    if (hasError) return;
    if (!selectedMethod) {
      toast.error('Por favor, selecciona un método de pago');
      return;
    }

    const finalShippingMethod = selectedMethod === 'mercadopago' ? shippingMethod : 'coordinate';

    onConfirm({
      customerName,
      customerPhone,
      customerEmail: emailRequired ? customerEmail : '',
      paymentMethod: selectedMethod,
      shippingMethod: finalShippingMethod,
      address: (finalShippingMethod === 'mercadoenvios' || finalShippingMethod === 'correoargentino') ? address : null,
      shippingQuote: finalShippingMethod === 'correoargentino' ? correoQuote : null,
      createAccount: !currentUser && wantAccount,
      accountPassword: (!currentUser && wantAccount) ? accountPassword : undefined
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
            Por favor, ingresa tus datos para procesar el pedido.
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

          {(selectedMethod === 'mercadopago' || wantAccount) && (
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
                {selectedMethod === 'mercadopago'
                  ? 'Te enviaremos el comprobante y detalles del envío a esta dirección.'
                  : 'La usaremos para crear tu cuenta y que puedas seguir tu pedido.'}
              </small>
              {emailError && <small style={{ color: '#ff4d4d', marginTop: '0.3rem', display: 'block' }}>{emailError}</small>}
            </div>
          )}

          {!currentUser && (
            <div className="form-group animate-fade-in" style={{ marginBottom: '2rem', padding: '1rem', borderRadius: '12px', border: '1px solid #eee', background: '#fafafa' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={wantAccount}
                  onChange={(e) => {
                    setWantAccount(e.target.checked);
                    setAccountError('');
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <UserPlus size={18} /> Crear una cuenta para hacer seguimiento de este pedido
              </label>

              {wantAccount && (
                <div className="animate-fade-in" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <small style={{ color: 'var(--text-muted)' }}>
                    Te vamos a enviar un email de confirmación para activar la cuenta.
                  </small>
                  <input
                    type="password"
                    placeholder="Contraseña (mínimo 6 caracteres)"
                    value={accountPassword}
                    onChange={(e) => { setAccountPassword(e.target.value); setAccountError(''); }}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
                  />
                  <input
                    type="password"
                    placeholder="Repetir contraseña"
                    value={accountPasswordConfirm}
                    onChange={(e) => { setAccountPasswordConfirm(e.target.value); setAccountError(''); }}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
                  />
                  {accountError && <small style={{ color: '#ff4d4d' }}>{accountError}</small>}
                </div>
              )}
            </div>
          )}

          <div className="payment-method-selector" style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '1rem', fontWeight: '600', color: 'var(--color-dark)' }}>
              ¿Cómo vas a abonar?
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
                    <div style={{ fontWeight: '600' }}>Efectivo / Transferencia</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Coordinamos el pago por WhatsApp</div>
                  </div>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selectedMethod === 'whatsapp' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-primary)' }}></div>}
                  </div>
                </div>
              )}

              {selectedMethod === 'whatsapp' && settings?.bankAlias && (
                <div
                  className="animate-fade-in"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.8rem',
                    padding: '0.9rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(212, 163, 115, 0.08)',
                    border: '1px dashed var(--color-primary)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Alias para transferencia</div>
                    <div style={{ fontWeight: '700', fontFamily: 'monospace', fontSize: '1rem' }}>{settings.bankAlias}</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAlias}
                    className="btn btn-outline"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem 0.8rem', whiteSpace: 'nowrap' }}
                  >
                    {aliasCopied ? <Check size={16} /> : <Copy size={16} />}
                    {aliasCopied ? 'Copiado' : 'Copiar'}
                  </button>
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
                    <div style={{ fontWeight: '600' }}>En cuotas</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pago con tarjeta vía Mercado Pago</div>
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

          {selectedMethod === 'mercadopago' && (settings?.enableMercadoEnvios || settings?.enableCorreoArgentino) && (
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

                {settings?.enableMercadoEnvios && (
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
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Otros correos (Calculado por Mercado Pago)</div>
                    </div>
                  </div>
                )}

                {settings?.enableCorreoArgentino && (
                  <div
                    onClick={() => setShippingMethod('correoargentino')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.8rem',
                      cursor: 'pointer',
                      padding: '0.5rem'
                    }}
                  >
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #ff8800', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {shippingMethod === 'correoargentino' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff8800' }}></div>}
                    </div>
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '0.95rem' }}>Correo Argentino</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Costo calculado según tu código postal</div>
                    </div>
                  </div>
                )}
              </div>

              {(shippingMethod === 'mercadoenvios' || shippingMethod === 'correoargentino') && (
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
                  <div className="form-group" style={{ gridColumn: shippingMethod === 'correoargentino' ? 'span 1' : 'span 2' }}>
                    <input
                      type="text"
                      placeholder="Ciudad / Localidad"
                      value={address.city}
                      onChange={e => { setAddress({...address, city: e.target.value}); setAddressError(''); }}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ddd' }}
                    />
                  </div>
                  {shippingMethod === 'correoargentino' && (
                    <div className="form-group">
                      <select
                        value={address.province}
                        onChange={e => { setAddress({...address, province: e.target.value}); setAddressError(''); }}
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #ddd' }}
                      >
                        <option value="">Provincia</option>
                        {ARGENTINA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  )}
                  {shippingMethod === 'correoargentino' && (
                    <div style={{ gridColumn: 'span 2', fontSize: '0.85rem' }}>
                      {quoting && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                          <Loader2 size={14} className="spin" /> Calculando costo de envío...
                        </span>
                      )}
                      {!quoting && correoQuote && (
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>
                          Costo de envío: ${correoQuote.cost.toLocaleString()}
                        </span>
                      )}
                      {!quoting && quoteError && (
                        <span style={{ color: '#ff4d4d' }}>{quoteError}</span>
                      )}
                    </div>
                  )}
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
