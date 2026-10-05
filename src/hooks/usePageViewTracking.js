import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { getOrCreateVisitorId } from '../utils/visitorId';
import { storeDay } from '../utils/metrics';

const PRODUCT_PATH_RE = /^\/product\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function usePageViewTracking(enabled) {
  const { pathname, key } = useLocation();
  const logged = useRef(new Set());
  useEffect(() => {
    if (!enabled) return;
    const record = () => {
      if (logged.current.has(key) || document.visibilityState === 'hidden') return;
      logged.current.add(key);
      const match = pathname.match(PRODUCT_PATH_RE);
      supabase.from('page_views').insert({ visitor_id: getOrCreateVisitorId(), path: pathname, product_id: match ? match[1] : null, visit_date: storeDay() })
        .then(({ error }) => {
          if (error) { logged.current.delete(key); console.error('page view tracking error:', error); }
        }).catch(error => { logged.current.delete(key); console.error('page view tracking error:', error); });
    };
    record();
    window.addEventListener('online', record);
    document.addEventListener('visibilitychange', record);
    return () => { window.removeEventListener('online', record); document.removeEventListener('visibilitychange', record); };
  }, [enabled, pathname, key]);
}