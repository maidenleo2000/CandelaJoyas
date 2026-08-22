import React, { useState, useEffect, useContext } from 'react';
import { ShoppingBag, ShoppingCart, UserCheck, MessageCircle, CreditCard, Truck } from 'lucide-react';
import { supabase } from '../services/supabase';
import { SettingsContext } from '../contexts/SettingsContext';
import PageHeader from '../components/common/PageHeader';
import './HowToBuy.css';

export default function HowToBuy() {
  const { settings } = useContext(SettingsContext);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);

  const pageWidth = settings.howToBuyWidth || 780;

  useEffect(() => {
    let cancelled = false;

    const fetchFaqs = async () => {
      const { data, error } = await supabase.from('faqs').select('*');
      if (cancelled) return;
      if (error) {
        console.error("Error loading FAQs:", error);
      } else {
        const faqsData = [...(data || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setFaqs(faqsData);
      }
      setLoading(false);
    };

    fetchFaqs();

    const channel = supabase
      .channel(`howtobuy_faqs_changes-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'faqs' }, () => fetchFaqs())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const enableWhatsApp = settings?.enableWhatsApp !== false;
  const enableMercadoPago = settings?.enableMercadoPago === true;
  const enableShippingOptions = settings?.enableMercadoEnvios || settings?.enableCorreoArgentino;
  const bothPaymentMethods = enableWhatsApp && enableMercadoPago;

  const paymentDescription = bothPaymentMethods
    ? "Elegí cómo pagar: por WhatsApp (para coordinar el pago con nosotros) o de forma segura con Mercado Pago (tarjetas o dinero en cuenta)."
    : enableMercadoPago
      ? "Pagá de forma segura con Mercado Pago: tarjetas de crédito, débito o dinero en cuenta."
      : "Coordiná el pago con nosotros directamente por WhatsApp.";

  const steps = [
    {
      icon: <ShoppingBag size={32} />,
      title: "1. Elegí tus productos",
      description: "Navegá por nuestro catálogo y seleccioná las prendas que más te gusten. Podés elegir talles y colores en la vista de cada producto."
    },
    {
      icon: <ShoppingCart size={32} />,
      title: "2. Agregalos al carrito",
      description: "Hacé click en 'Agregar al carrito'. Podés seguir comprando y sumando más productos a tu bolsa de compras."
    },
    {
      icon: <UserCheck size={32} />,
      title: "3. Completá tus datos",
      description: "Entrá al carrito, revisá tu pedido y completá tu nombre y teléfono. No necesitás crear una cuenta, pero si querés hacer seguimiento de tu pedido más adelante podés crear una en este paso."
    },
    {
      icon: <CreditCard size={32} />,
      title: "4. Elegí cómo pagar",
      description: paymentDescription
    },
    ...(enableMercadoPago && enableShippingOptions ? [{
      icon: <Truck size={32} />,
      title: "5. Elegí cómo recibirlo",
      description: "Si pagás con Mercado Pago, podés coordinar la entrega con nosotros, o elegir envío a domicilio por Mercado Envíos o Correo Argentino (el costo se calcula automáticamente según tu código postal)."
    }] : []),
    {
      icon: <MessageCircle size={32} />,
      title: `${enableMercadoPago && enableShippingOptions ? '6' : '5'}. Confirmá tu pedido`,
      description: enableWhatsApp
        ? "Hacé click en 'Confirmar Pedido'. Si elegiste WhatsApp, se abrirá un chat con nosotros con el detalle de tu compra; si elegiste Mercado Pago, te llevamos directo a pagar de forma segura."
        : "Hacé click en 'Confirmar Pedido' y te llevamos directo a Mercado Pago para completar el pago de forma segura."
    }
  ];

  return (
    <div className="how-to-buy-page animate-fade-in">
      <PageHeader
        title="¿Cómo Comprar?"
        subtitle={`Comprar en ${settings.siteTitle || 'Candela Joyas'} es muy simple y rápido. Seguí estos pasos:`}
      />

      <div className="container how-to-buy-content" style={{ maxWidth: `${pageWidth}px` }}>
      <div className="steps-container">
        {steps.map((step, index) => (
          <div key={index} className="step-card glass">
            <div className="step-icon-wrapper">
              {step.icon}
              <div className="step-number">{index + 1}</div>
            </div>
            <div className="step-info">
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      {faqs.length > 0 && (
        <div className="faq-section glass">
          <h2>Preguntas Frecuentes</h2>
          <p className="faq-section-subtitle">Todo lo que necesitás saber antes de comprar</p>
          <div
            className="faq-grid" 
            style={{ "--faq-cols": settings.faqColumns }}
          >
            {faqs.map(faq => (
              <div key={faq.id} className="faq-item">
                <h4>{faq.question}</h4>
                <p>{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
