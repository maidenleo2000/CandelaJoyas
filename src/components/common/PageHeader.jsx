import { useContext } from 'react';
import { SettingsContext } from '../../contexts/SettingsContext';
import './PageHeader.css';

export default function PageHeader({ title, subtitle }) {
  const { settings } = useContext(SettingsContext);

  const style = {
    '--page-header-gradient-start': settings.pageHeaderGradientStart || settings.primaryColor || '#D4A373',
    '--page-header-gradient-end': settings.pageHeaderGradientEnd || settings.secondaryColor || '#FAEDCD',
    '--page-header-height': `${settings.pageHeaderHeight || 220}px`,
    '--page-header-title-color': settings.pageHeaderTitleColor || '#ffffff',
    '--page-header-subtitle-color': settings.pageHeaderSubtitleColor || '#ffffff',
  };

  return (
    <section className="page-header" style={style}>
      <div className="container">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </section>
  );
}
