import { useContext, useEffect } from 'react';
import { SettingsContext } from '../contexts/SettingsContext';
import { Send } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import './Nosotras.css';

export default function Nosotras() {
  const { settings } = useContext(SettingsContext);
  
  useEffect(() => {
    const baseTitle = settings.siteTitle || 'Candela Joyas';
    document.title = `${settings.aboutTitle || 'Nosotras'} | ${baseTitle}`;
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
      <PageHeader title={settings.aboutTitle || 'Nosotras'} />

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
              <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
                <div className="form-group">
                  <label htmlFor="name">Nombre</label>
                  <input type="text" id="name" placeholder="Tu nombre" />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" placeholder="tu@email.com" />
                </div>
                <div className="form-group">
                  <label htmlFor="message">Mensaje</label>
                  <textarea id="message" rows={4} placeholder="¿En qué podemos ayudarte?"></textarea>
                </div>
                <button type="submit" className="btn btn-primary submit-btn">
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
