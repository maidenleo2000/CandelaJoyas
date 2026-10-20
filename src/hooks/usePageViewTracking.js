import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { getOrCreateVisitorId } from '../utils/visitorId';
import { storeDay } from '../utils/metrics';
import { createPageViewTracker } from '../utils/pageViewEvent';

const PRODUCT_PATH_RE = /^\/product\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function usePageViewTracking(enabled) {
  const { pathname, key } = useLocation();
  const tracker = useRef(null);
  if (!tracker.current) tracker.current = createPageViewTracker();
  useEffect(() => {
    const event = tracker.current.arrive(key, pathname);
    if (!enabled) return;
    const record = () => {
      if (event.recorded || event.pending || document.visibilityState === 'hidden') return;
      event.pending = true;
      const match = pathname.match(PRODUCT_PATH_RE);
      event.payload ||= { id: event.id, visitor_id: getOrCreateVisitorId(), path: pathname, product_id: match ? match[1] : null, visit_date: storeDay(), viewed_at: new Date().toISOString() };
      supabase.from('page_views').upsert(event.payload, { onConflict: 'id', ignoreDuplicates: true })
        .then(({ error }) => {
          if (error) console.error('page view tracking error:', error);
          else event.recorded = true;
        }).catch(error => { console.error('page view tracking error:', error); })
        .finally(() => { event.pending = false; });
    };
    record();
    window.addEventListener('online', record);
    document.addEventListener('visibilitychange', record);
    return () => { window.removeEventListener('online', record); document.removeEventListener('visibilitychange', record); };
  }, [enabled, pathname, key]);
}
