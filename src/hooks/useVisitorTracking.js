import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { getOrCreateVisitorId } from '../utils/visitorId';

const SESSION_FLAG_KEY = 'tc_visit_logged';

export function useVisitorTracking(enabled) {
  useEffect(() => {
    if (!enabled) return;
    if (sessionStorage.getItem(SESSION_FLAG_KEY)) return;

    const visitorId = getOrCreateVisitorId();
    sessionStorage.setItem(SESSION_FLAG_KEY, '1');

    supabase.rpc('record_visit', { p_visitor_id: visitorId, p_path: window.location.pathname })
      .then(({ error }) => { if (error) console.error('visit tracking error:', error); });
  }, [enabled]);
}
