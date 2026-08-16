import { createContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

export const SettingsContext = createContext();

export default function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    siteTitle: 'GENOVEVA InduStore',
    primaryColor: '#D4A373',
    secondaryColor: '#FAEDCD',
    logoUrl: '',
    showHero: true,
    heroTitle: 'Nueva Colección Otoño / Invierno',
    heroSubtitle: 'Descubre diseños exclusivos pensados para realzar tu belleza.',
    heroTitleSize: '1.5', // rem
    heroSubtitleSize: '1', // rem
    showBackToTop: true,
    whatsappNumber: '',
    logoShape: 'normal',
    faviconUrl: '',
    // Footer Settings
    footerShowLinks: true,
    footerShowPolicies: true,
    footerShowContact: true,
    footerShowSocial: true,
    facebookLink: '',
    instagramLink: '',
    twitterLink: '',
    footerEmail: 'hola@boutiquefemme.com',
    footerPhone: '',
    whatsappFooterLabel: 'WhatsApp',
    whatsappModalMessage: '¿Deseas realizar una consulta por WhatsApp con nuestros vendedores?',
    footerAddress: 'Buenos Aires, Argentina',
    footerDescription: 'Elegancia y estilo para cada ocasión. Descubre las últimas tendencias en moda femenina.',
    // About Section
    showAbout: true,
    aboutTitle: 'Sobre Genoveva',
    aboutText: 'Genoveva InduStore nace con la misión de ofrecer moda inclusiva y real para todas las mujeres. Nuestro compromiso es la calidad y el diseño pensado para vos.',
    showContactForm: true,
    catalogTitle: 'Catálogo',
    // Video Slider Settings
    showVideoSlider: false,
    videoUrls: [],
    // Checkout Settings
    checkoutRequireName: true,
    checkoutRequirePhone: true,
    // Marquee Settings
    showMarquee: true,
    marqueeText: 'COMPRA MÍNIMA: 10 PRODUCTOS SURTIDOS — PRECIOS MAYORISTAS — ENVÍOS A TODO EL PAÍS',
    marqueeBgColor: '#A08264',
    marqueeTextColor: '#ffffff',
    marqueeFontSize: '0.85', // rem
    marqueeHeight: '36', // px
    // FAQ Settings
    faqColumns: 2,
    howToBuyWidth: 780,
    enableMercadoEnvios: false,
    shippingCost: 0,
    enableStockManagement: false,
    lowStockThreshold: 5,
  });
  const [loading, setLoading] = useState(true);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const applySettings = (data) => {
    document.title = data.siteTitle || 'Mi Tienda';
    const root = document.documentElement;
    if (data.primaryColor) {
        root.style.setProperty('--color-primary', data.primaryColor);
    }
    if (data.secondaryColor) {
        root.style.setProperty('--color-secondary', data.secondaryColor);
        root.style.setProperty('--color-light', data.secondaryColor);
    }
    if (data.faviconUrl) {
      let icon = document.querySelector("link[rel='icon']");
      if (!icon) {
        icon = document.createElement('link');
        icon.rel = 'icon';
        icon.type = 'image/png';
        document.head.appendChild(icon);
      }
      
      // Solo actualizar si la URL es diferente para evitar parpadeos y recargas innecesarias
      if (icon.getAttribute('href') !== data.faviconUrl) {
        icon.href = data.faviconUrl;
      }
    }

    if (data.marqueeHeight) {
      root.style.setProperty('--marquee-height', `${data.marqueeHeight}px`);
    }
  };

  const applyRow = (row) => {
    if (row?.data) {
      const merged = { ...settingsRef.current, ...row.data };
      setSettings(merged);
      applySettings(merged);
    }
  };

  useEffect(() => {
    // Aplicar configuración inicial por defecto inmediatamente
    applySettings(settings);

    let cancelled = false;

    supabase
      .from('site_settings')
      .select('data')
      .eq('id', 1)
      .single()
      .then(({ data: row, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Error reading settings (likely permissions):", error);
        } else {
          applyRow(row);
        }
        setLoading(false);
      });

    const channel = supabase
      .channel(`site_settings_changes-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload) => {
        applyRow(payload.new);
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const updateSettings = async (newSettings) => {
    try {
      const merged = { ...settingsRef.current, ...newSettings };
      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: 1, data: merged, updated_at: new Date().toISOString() });
      if (error) throw error;
      setSettings(merged);
      applySettings(merged);
      toast.success('Configuración de la tienda guardada');
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar la configuración');
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
      {!loading && children}
    </SettingsContext.Provider>
  );
}
