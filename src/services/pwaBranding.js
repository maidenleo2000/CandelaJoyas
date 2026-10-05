import { Capacitor } from '@capacitor/core';
import { invalidateInstallPrompt } from './pwa';

let revision = 0;
let previousBrand = '';
const BRAND_CACHE = 'candela-brand-v1';

function makeIcon(image, size, maskable = false) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  context.fillStyle = '#FDFBF7';
  context.fillRect(0, 0, size, size);
  const available = size * (maskable ? 0.68 : 0.9);
  const scale = Math.min(available / image.naturalWidth, available / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo generar el icono de la tienda.')), 'image/png'));
}

async function waitForWorker() {
  await navigator.serviceWorker.ready;
  if (navigator.serviceWorker.controller) return;
  await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
}

export async function syncPwaBrand(settings) {
  if (Capacitor.isNativePlatform() || !('serviceWorker' in navigator) || !window.isSecureContext) return;
  const logo = settings.logoUrl || settings.faviconUrl || '/pwa/icon-512.png';
  const name = settings.siteTitle || 'Candela Joyas';
  const brand = JSON.stringify([logo, name, settings.primaryColor]);
  if (brand === previousBrand) return;
  previousBrand = brand;
  const currentRevision = ++revision;
  invalidateInstallPrompt();
  try {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = logo;
    await image.decode();
    const icons = await Promise.all([makeIcon(image, 192), makeIcon(image, 512), makeIcon(image, 512, true), makeIcon(image, 180)]);
    await waitForWorker();
    if (currentRevision !== revision) return;
    // Different icon URLs prevent the installation dialog reusing a previous logo.
    const fingerprint = await crypto.subtle.digest('SHA-256', await icons[1].arrayBuffer());
    const version = Array.from(new Uint8Array(fingerprint)).slice(0, 8).map(value => value.toString(16).padStart(2, '0')).join('');
    const paths = ['/pwa/site-icon-192.png', '/pwa/site-icon-512.png', '/pwa/site-icon-maskable-512.png', '/pwa/site-apple-touch-icon.png'];
    const manifest = {
      id: '/', name, short_name: name, lang: 'es-AR', start_url: '/', scope: '/', display: 'standalone',
      background_color: '#FDFBF7', theme_color: settings.primaryColor || '#2B2D42',
      icons: paths.slice(0, 3).map((path, index) => ({ src: `${path}?v=${version}`, sizes: index === 0 ? '192x192' : '512x512', type: 'image/png', purpose: index === 2 ? 'maskable' : 'any' })),
    };
    const cache = await caches.open(BRAND_CACHE);
    if (currentRevision !== revision) return;
    await Promise.all(paths.map((path, index) => cache.put(path, new Response(icons[index], { headers: { 'Content-Type': 'image/png' } }))));
    await cache.put('/pwa/site-manifest.webmanifest', new Response(JSON.stringify(manifest), { headers: { 'Content-Type': 'application/manifest+json' } }));
    if (currentRevision !== revision) return;
    const link = document.querySelector('link[rel="manifest"]');
    link.href = `/pwa/site-manifest.webmanifest?v=${version}&name=${encodeURIComponent(name)}`;
    document.querySelector('link[rel="apple-touch-icon"]').href = `${paths[3]}?v=${version}`;
    document.querySelector('meta[name="apple-mobile-web-app-title"]').content = name;
  } catch (error) {
    previousBrand = '';
    console.error('No se pudo actualizar el logo de instalación:', error);
  }
}
