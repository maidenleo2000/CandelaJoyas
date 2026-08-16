import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

const isPushSupported = Capacitor.getPlatform() !== 'web';

async function addToken(userId, token) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('fcm_tokens')
    .eq('id', userId)
    .single();

  const tokens = new Set(profile?.fcm_tokens || []);
  tokens.add(token);

  await supabase
    .from('profiles')
    .update({ fcm_tokens: Array.from(tokens), push_enabled: true })
    .eq('id', userId);
}

async function removeToken(userId, token) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('fcm_tokens')
    .eq('id', userId)
    .single();

  const tokens = (profile?.fcm_tokens || []).filter((t) => t !== token);

  await supabase
    .from('profiles')
    .update({ fcm_tokens: tokens })
    .eq('id', userId);
}

export const registerPush = async (userId) => {
  if (!isPushSupported) return;

  let permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== 'granted') {
    throw new Error('User denied permissions!');
  }

  if (Capacitor.getPlatform() === 'android') {
    await PushNotifications.createChannel({
      id: 'sales_notifications',
      name: 'Ventas Nuevas',
      description: 'Notificaciones cuando se realiza una venta',
      importance: 5,
      visibility: 1,
      sound: 'default',
      vibration: true,
    });
  }

  await PushNotifications.register();

  // On success, we should be able to receive notifications
  PushNotifications.addListener('registration', async (token) => {
    console.log('Push registration success, token: ' + token.value);
    // Guardar el token en Supabase para este usuario
    await addToken(userId, token.value);
  });

  PushNotifications.addListener('registrationError', (error) => {
    console.error('Error on registration: ' + JSON.stringify(error));
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received: ' + JSON.stringify(notification));
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Push action performed: ' + JSON.stringify(notification));
  });
};

export const unregisterPush = async (userId, tokenToRemove) => {
  if (!isPushSupported) return;

  await supabase
    .from('profiles')
    .update({ push_enabled: false })
    .eq('id', userId);

  // Opcional: remover el token específico si lo tenemos
  if (tokenToRemove) {
    await removeToken(userId, tokenToRemove);
  }

  // Capacitor doesn't have a direct "unregister" from FCM, but we stop listening
  await PushNotifications.removeAllListeners();
};
