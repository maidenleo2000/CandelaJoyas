import { Capacitor } from '@capacitor/core';

let installPrompt = null;
let initialized = false;
let installed = false;
const listeners = new Set();

export function isAppInstalled() {
  return installed || Capacitor.isNativePlatform() || window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || window.navigator.standalone === true;
}

export function getInstallStatus() {
  return isAppInstalled() ? 'installed' : installPrompt ? 'available' : 'manual';
}

export function subscribeInstall(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach(listener => listener());
}

export function initializePwa() {
  if (initialized || Capacitor.isNativePlatform()) return;
  initialized = true;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    installPrompt = null;
    notify();
  });
  window.matchMedia('(display-mode: standalone)').addEventListener('change', notify);
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(error => {
      console.error('No se pudo preparar la aplicación para instalar:', error);
    });
  }
}

export function invalidateInstallPrompt() {
  installPrompt = null;
  notify();
}

export async function requestAppInstall() {
  if (!installPrompt) return 'unavailable';
  const prompt = installPrompt;
  installPrompt = null;
  notify();
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  return outcome;
}
