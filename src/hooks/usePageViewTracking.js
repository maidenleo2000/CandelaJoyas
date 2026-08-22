import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { getOrCreateVisitorId } from '../utils/visitorId';

const PRODUCT_PATH_RE = /^\/product\/([0-9a-fA-F-]{36})$/;

export function usePageViewTracking(enabled) {
  const location = useLocation();

  useEffect(() => {
    if (!enabled) return;

    const visitorId = getOrCreateVisitorId();
    const match = location.pathname.match(PRODUCT_PATH_RE);
    const productId = match ? match[1] : null;

    supabase.rpc('record_page_view', { p_visitor_id: visitorId, p_path: location.pathname, p_product_id: productId })
      .then(({ error }) => { if (error) console.error('page view tracking error:', error); });
  }, [enabled, location.pathname]);
}
