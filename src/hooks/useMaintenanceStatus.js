import { useEffect, useState } from 'react';

// Calcula si el modo mantenimiento está efectivamente activo, actualizando
// cada segundo mientras haya una cuenta regresiva en curso.
export function useMaintenanceStatus(settings) {
  const [now, setNow] = useState(Date.now());
  const endsAt = settings.maintenanceEndsAt ? new Date(settings.maintenanceEndsAt).getTime() : null;

  useEffect(() => {
    if (!settings.maintenanceMode || !endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [settings.maintenanceMode, endsAt]);

  if (!settings.maintenanceMode) {
    return { active: false, remainingMs: null, expired: false, endsAt: null };
  }

  const expired = endsAt ? now >= endsAt : false;
  const remainingMs = endsAt ? Math.max(0, endsAt - now) : null;
  const active = expired && settings.maintenanceAutoDisable ? false : true;

  return { active, remainingMs, expired, endsAt };
}
