import { useContext } from 'react';
import { SettingsContext } from '../../contexts/SettingsContext';
import { useMaintenanceStatus } from '../../hooks/useMaintenanceStatus';
import { Wrench } from 'lucide-react';
import './MaintenancePage.css';

function formatRemaining(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

export default function MaintenancePage() {
  const { settings } = useContext(SettingsContext);
  const { remainingMs, expired } = useMaintenanceStatus(settings);

  const hasBackgroundImage = Boolean(settings.maintenanceBackgroundImage);

  const style = {
    '--maintenance-gradient-start': settings.primaryColor || '#D4A373',
    '--maintenance-gradient-end': settings.secondaryColor || '#FAEDCD',
    ...(hasBackgroundImage && { backgroundImage: `url(${settings.maintenanceBackgroundImage})` }),
  };

  const showCountdown = remainingMs !== null && !expired;
  const { days, hours, minutes, seconds } = showCountdown ? formatRemaining(remainingMs) : {};

  return (
    <div className={`maintenance-page ${hasBackgroundImage ? 'has-bg-image' : ''}`} style={style}>
      <div className="maintenance-box">
        {settings.logoUrl && (
          <img src={settings.logoUrl} alt={settings.siteTitle} className="maintenance-logo" />
        )}
        <div className="maintenance-icon"><Wrench size={40} /></div>
        <h1>{settings.maintenanceTitle || 'Sitio en Mantenimiento'}</h1>
        <p>{settings.maintenanceMessage}</p>

        {showCountdown && (
          <div className="maintenance-countdown">
            <div className="countdown-unit">
              <span className="countdown-value">{String(days).padStart(2, '0')}</span>
              <span className="countdown-label">Días</span>
            </div>
            <div className="countdown-unit">
              <span className="countdown-value">{String(hours).padStart(2, '0')}</span>
              <span className="countdown-label">Hs</span>
            </div>
            <div className="countdown-unit">
              <span className="countdown-value">{String(minutes).padStart(2, '0')}</span>
              <span className="countdown-label">Min</span>
            </div>
            <div className="countdown-unit">
              <span className="countdown-value">{String(seconds).padStart(2, '0')}</span>
              <span className="countdown-label">Seg</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
