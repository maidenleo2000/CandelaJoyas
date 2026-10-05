import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// PWAs leave device Back to the OS. Native Android can exit explicitly.
export default function BackButtonHandler() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
    const listener = App.addListener('backButton', () => App.exitApp());
    return () => { listener.then(handle => handle.remove()); };
  }, []);
  return null;
}