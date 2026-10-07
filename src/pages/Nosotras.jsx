import { useContext, useEffect } from 'react';
import { SettingsContext } from '../contexts/SettingsContext';
import { Send } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import './Nosotras.css';

export default function Nosotras() {
  const { settings } = useContext(SettingsContext);
  const contactEmail = (settings.contactFormEmail || '').trim();
  const hasContactEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail);
  
  useEffect(() => {
    const baseTitle = settings.siteTitle || 'Candela Joyas';
    document.title = `${settings.aboutTitle || 'Sobre Nosotros'} | ${baseTitle}`;
  }, [settings.siteTitle, settings.aboutTitle]);

  if (!settings.showAbout) {
    return (
      <div className="container empty-state">
        <h3>Esta sección no está disponible actualmente.</h3>
      </div>
    );
  }

  return (
    <div className="nosotras-page animate-fade-in">
      <PageHeader title={settings.aboutTitle || 'Sobre Nosotros'} />

      <section className="container nosotras-content">
        <div className="about-card glass">
          <div className="about-text-content">
            <p>{settings.aboutText}</p>
          </div>
        </div>

        {settings.showContactForm && (
          <div className="contact-section">
            <div className="contact-card glass">
              <h2>Contactanos</h2>
              <form
                className="contact-form"
                action={hasContactEmail ? `https://formsubmit.co/${encodeURIComponent(contactEmail)}` : undefined}
                method="POST"
                onSubmit={(e) => { if (!hasContactEmail) e.preventDefault(); }}
              >
                <input type="hidden" name="_captcha" value="true" />
                <input type="hidden" name="_subject" value={`Consulta desde ${settings.siteTitle || 'Candela Joyas'}`} />
                <input type="hidden" name="_template" value="table" />
                <input type="text" name="_honey" className="contact-honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                <div className="form-group">
                  <label htmlFor="name">Nombre</label>
                  <input type="text" id="name" name="name" placeholder="Tu nombre" autoComplete="name" required maxLength={120} />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" name="email" placeholder="tu@email.com" autoComplete="email" required maxLength={254} />
                </div>
                <div className="form-group">
                  <label htmlFor="message">Mensaje</label>
                  <textarea id="message" name="message" rows={4} placeholder="¿En qué podemos ayudarte?" required maxLength={5000}></textarea>
                </div>
                <p className="form-hint">
                  {hasContactEmail
                    ? 'Al continuar, completarás una verificación de seguridad en FormSubmit para enviar tu mensaje.'
                    : 'El formulario de contacto todavía no está disponible. Intentá por otro medio de contacto.'}
                </p>
                <button type="submit" className="btn btn-primary submit-btn" disabled={!hasContactEmail}>
                  Enviar Mensaje <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
