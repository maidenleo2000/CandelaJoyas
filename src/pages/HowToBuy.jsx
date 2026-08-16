import React, { useState, useEffect, useContext } from 'react';
import { ShoppingBag, ShoppingCart, UserCheck, MessageCircle, ChevronRight } from 'lucide-react';
import { supabase } from '../services/supabase';
import { SettingsContext } from '../contexts/SettingsContext';
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
      description: "Entrá al carrito, revisá tu pedido y completá tu nombre y teléfono. No necesitás crear una cuenta."
    },
    {
      icon: <MessageCircle size={32} />,
      title: "4. Finalizá por WhatsApp",
      description: "Hacé click en 'Enviar pedido'. Se abrirá un chat de WhatsApp con nosotros con todo el detalle de tu compra para coordinar pago y envío."
    }
  ];

  return (
    <div className="container how-to-buy-page animate-fade-in" style={{ maxWidth: `${pageWidth}px` }}>
      <div className="how-to-buy-header">
        <h1>¿Cómo Comprar?</h1>
        <p>Comprar en Genoveva InduStore es muy simple y rápido. Seguí estos pasos:</p>
      </div>

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
            <div className="step-connector desktop-only">
              <ChevronRight size={24} />
            </div>
          </div>
        ))}
      </div>

      {faqs.length > 0 && (
        <div className="faq-section glass">
          <h2>Preguntas Frecuentes</h2>
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
  );
}
