import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const origin = 'https://candelajoyas.com.ar';
const defaultDescription = 'Anillos, aros, pulseras y cadenas de plata. Encontrá joyas para cada ocasión en Candela Joyas.';

function setMeta(attribute, key, content) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function usePageSeo({ title, description = defaultDescription, image, noindex = false, enabled = true }) {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!enabled) return;
    const url = `${origin}${pathname === '/' ? '/' : pathname.replace(/\/$/, '')}`;
    const summary = description.replace(/\s+/g, ' ').trim().slice(0, 170);
    const picture = image ? new URL(image, origin).href : `${origin}/favicon.png`;
    document.title = title;
    setMeta('name', 'description', summary);
    setMeta('name', 'robots', noindex ? 'noindex, follow' : 'index, follow');
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', summary);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', picture);
    setMeta('property', 'og:locale', 'es_AR');
    setMeta('property', 'og:site_name', 'Candela Joyas');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', summary);
    setMeta('name', 'twitter:image', picture);
    // La URL se establece al renderizar cada ruta; el HTML base no debe
    // declarar la portada como canónica de todos los productos.
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;
  }, [pathname, title, description, image, noindex, enabled]);
}
