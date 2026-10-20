import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { getOrCreateVisitorId } from '../utils/visitorId';

// One presence key per browser: several visible tabs still count as one visitor.
export function useLiveVisitors(trackVisitor) {
  const [count, setCount] = useState(null);
  useEffect(() => {
    let disposed = false;
    let subscribed = false;
    let pageHidden = false;
    let queue = Promise.resolve();
    const channel = supabase.channel('store-live-visitors', {
      config: { presence: { key: getOrCreateVisitorId() } },
    });
    const syncVisibility = () => {
      queue = queue.then(async () => {
        if (disposed || !subscribed) return;
        const result = trackVisitor && !pageHidden && document.visibilityState === 'visible'
          ? await channel.track({ active: true })
          : await channel.untrack();
        if (!disposed && result !== 'ok') setCount(null);
      }).catch(() => { if (!disposed) setCount(null); });
    };
    channel.on('presence', { event: 'sync' }, () => {
      if (!disposed && subscribed) {
        setCount(Object.values(channel.presenceState()).filter(entries => entries.some(entry => entry.active === true)).length);
      }
    }).subscribe(status => {
      if (disposed) return;
      subscribed = status === 'SUBSCRIBED';
      if (subscribed) syncVisibility();
      else setCount(null);
    });
    const offline = () => { subscribed = false; setCount(null); };
    const pagehide = () => { pageHidden = true; syncVisibility(); };
    const pageshow = () => { pageHidden = false; syncVisibility(); };
    document.addEventListener('visibilitychange', syncVisibility);
    window.addEventListener('pagehide', pagehide);
    window.addEventListener('pageshow', pageshow);
    window.addEventListener('offline', offline);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', syncVisibility);
      window.removeEventListener('pagehide', pagehide);
      window.removeEventListener('pageshow', pageshow);
      window.removeEventListener('offline', offline);
      void supabase.removeChannel(channel);
    };
  }, [trackVisitor]);
  return count;
}
