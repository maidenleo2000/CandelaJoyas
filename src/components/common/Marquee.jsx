import { useContext } from 'react';
import { SettingsContext } from '../../contexts/SettingsContext';
import './Marquee.css';

export default function Marquee() {
  const { settings } = useContext(SettingsContext);

  if (!settings.showMarquee) return null;

  return (
    <div 
      className="marquee-container" 
      style={{ 
        backgroundColor: settings.marqueeBgColor || '#A08264',
        color: settings.marqueeTextColor || '#ffffff',
        fontSize: `${settings.marqueeFontSize || 0.85}rem`
      }}
    >
      <div
        className="marquee-content"
        style={{ animationDuration: `${settings.marqueeSpeed || 30}s` }}
      >
        <span className="marquee-text">{settings.marqueeText}</span>
        <span className="marquee-text">{settings.marqueeText}</span>
        <span className="marquee-text">{settings.marqueeText}</span>
        <span className="marquee-text">{settings.marqueeText}</span>
      </div>
    </div>
  );
}
