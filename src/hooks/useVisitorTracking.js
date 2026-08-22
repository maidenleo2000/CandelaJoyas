import { useEffect } from 'react';
import { supabase } from '../services/supabase';

const VISITOR_ID_KEY = 'tc_visitor_id';
const SESSION_FLAG_KEY = 'tc_visit_logged';

function getOrCreateVisitorId() {
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

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
