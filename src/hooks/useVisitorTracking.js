import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { getOrCreateVisitorId } from '../utils/visitorId';
import { storeDay } from '../utils/metrics';

const SESSION_FLAG_KEY = 'tc_visit_logged';
const pending = new Map();
const recorded = new Set();

export function useVisitorTracking(enabled) {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!enabled) return;
    const record = () => {
      if (document.visibilityState === 'hidden') return;
      const day = storeDay();
      const visitorId = getOrCreateVisitorId();
      const key = `${visitorId}:${day}`;
      let sessionDay;
      try { sessionDay = sessionStorage.getItem(SESSION_FLAG_KEY); } catch { /* Memory fallback below. */ }
      if (sessionDay === key || recorded.has(key) || pending.has(key)) return;
      // The existing unique(visitor_id, visit_date) constraint makes tabs/retries idempotent.
      // Supply the Argentine day explicitly instead of the old RPC's UTC default.
      const request = supabase.from('site_visits').upsert({ visitor_id: visitorId, visit_date: day, path: pathname }, { onConflict: 'visitor_id,visit_date', ignoreDuplicates: true });
      pending.set(key, request);
      Promise.resolve(request).then(({ error }) => {
        if (error) { console.error('visit tracking error:', error); return; }
        recorded.add(key);
        try { sessionStorage.setItem(SESSION_FLAG_KEY, key); } catch { /* Recorded in memory. */ }
      }).catch(error => console.error('visit tracking error:', error)).finally(() => pending.delete(key));
    };
    record();
    // An installed app can stay open across midnight; track the new day too.
    const timer = window.setInterval(record, 60000);
    window.addEventListener('online', record);
    document.addEventListener('visibilitychange', record);
    return () => { window.clearInterval(timer); window.removeEventListener('online', record); document.removeEventListener('visibilitychange', record); };
  }, [enabled, pathname]);
}