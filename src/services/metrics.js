import { supabase } from './supabase';

// Use the returned length rather than assuming the server's configured row limit.
export async function readAllRows(makeQuery, signal) {
  const rows = [];
  let count = null;
  while (count === null || rows.length < count) {
    const result = await makeQuery().range(rows.length, rows.length + 499).abortSignal(signal);
    if (result.error) throw result.error;
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (count === null) count = result.count;
    const batch = result.data || [];
    if (!batch.length) {
      if (count !== null && rows.length < count) throw new Error('No se pudieron leer todos los registros de visitas.');
      break;
    }
    rows.push(...batch);
  }
  return rows;
}

export async function loadMetrics(range, signal, now = new Date()) {
  const snapshot = now.toISOString();
  const [visits, views] = await Promise.all([
    readAllRows(() => supabase.from('site_visits').select('id,visitor_id,first_seen_at', { count: 'exact' }).lte('first_seen_at', snapshot).order('first_seen_at').order('id'), signal),
    // All timestamps are needed to recover legacy daily activity and keep the
    // historical visitor total independent of the selected reporting period.
    readAllRows(() => supabase.from('page_views').select('id,path,product_id,visitor_id,viewed_at,products(name)', { count: 'exact' }).lte('viewed_at', snapshot).order('viewed_at').order('id'), signal),
  ]);
  return { visits, views, now };
}
