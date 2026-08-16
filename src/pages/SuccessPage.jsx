import { useEffect, useContext } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, ShoppingBag, ArrowRight, ExternalLink } from 'lucide-react';
import { CartContext } from '../contexts/CartContext';
import { supabase } from '../services/supabase';
import './SuccessPage.css';

const SuccessPage = () => {
  const [searchParams] = useSearchParams();
  const { clearCart } = useContext(CartContext);
  
  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');
  const externalReference = searchParams.get('external_reference');

  useEffect(() => {
    const updateOrderStatus = async () => {
      // Vaciar el carrito al llegar a la página de éxito si el pago fue aprobado
      if (status === 'approved') {
        clearCart();

        // Si tenemos la referencia de la orden, confirmamos el pago server-side:
        // el cliente anónimo no tiene permiso de leer/escribir "sales" directamente
        // (RLS), y además así el pago se verifica contra la API de Mercado Pago
        // en vez de confiar ciegamente en los query params de la URL.
        if (externalReference && !externalReference.startsWith('order_')) {
          try {
            const { data, error } = await supabase.functions.invoke('confirm-mp-payment', {
              body: { orderId: externalReference, paymentId },
            });
            if (error) throw error;

            if (data?.approved) {
              // Seguimiento de Google Ads (Conversión de Compra)
              if (window.gtag) {
                window.gtag('event', 'conversion', {
                    'send_to': 'AW-950364380/tOgJCLq21aYcENzRlcUD',
                    'value': data.total || 0,
                    'currency': 'ARS',
                    'transaction_id': paymentId
                });
              }
              console.log('Orden actualizada automáticamente a Cobrada con ID:', paymentId);
            } else {
              console.warn('El pago todavía no figura como aprobado en Mercado Pago:', data);
            }
          } catch (error) {
            console.error('Error al actualizar estado de orden:', error);
          }
        }
      }
    };

    updateOrderStatus();
  }, [status, externalReference, paymentId]);

  return (
    <div className="success-container">
      <div className="success-card">
        <div className="success-icon-wrapper">
          <CheckCircle2 size={80} className="success-icon" />
        </div>
        
        <h1 className="success-title">¡Pago Confirmado!</h1>
        <p className="success-subtitle">
          Gracias por tu compra. Tu pedido está siendo procesado.
        </p>

        <div className="success-details">
          <div className="detail-row">
            <span>Estado del pago:</span>
            <span className="status-badge approved">Aprobado</span>
          </div>
          {paymentId && (
            <div className="detail-row">
              <span>ID de Operación:</span>
              <code>{paymentId}</code>
            </div>
          )}
          {externalReference && (
            <div className="detail-row">
              <span>Referencia:</span>
              <code>{externalReference}</code>
            </div>
          )}
        </div>

        <div className="success-info-box">
          <p>
            Te hemos enviado un correo electrónico con los detalles de tu pedido. 
            Pronto nos pondremos en contacto contigo para coordinar la entrega.
          </p>
        </div>

        <div className="success-actions">
          <Link to="/" className="btn-primary">
            <ShoppingBag size={20} />
            Seguir Comprando
          </Link>
          <Link to="/como-comprar" className="btn-secondary">
            Ver guía de envíos
            <ArrowRight size={18} />
          </Link>
        </div>

        <div className="mp-verification">
          <a 
            href="https://www.mercadopago.com.ar/activities" 
            target="_blank" 
            rel="noopener noreferrer"
            className="mp-link"
          >
            Ver en mi cuenta de Mercado Pago
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;
