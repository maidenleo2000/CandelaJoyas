import { useState, useEffect, useContext } from 'react';
import { ChevronUp } from 'lucide-react';
import { SettingsContext } from '../../contexts/SettingsContext';
import './BackToTop.css';

export default function BackToTop() {
  const { settings } = useContext(SettingsContext);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!settings.showBackToTop) return null;

  return (
    <button
      className={`back-to-top ${isVisible ? 'visible' : ''}`}
      onClick={scrollToTop}
      aria-label="Volver arriba"
    >
      <ChevronUp size={24} />
    </button>
  );
}
