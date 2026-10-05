export const METRICS_TIME_ZONE = 'America/Argentina/Buenos_Aires';

export function storeDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: METRICS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(date));
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function shiftDay(day, offset) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function rangeBounds(range, now = new Date()) {
  const today = storeDay(now);
  const fromDay = range === 'all' ? null : shiftDay(today, range === 'today' ? 0 : range === '7d' ? -6 : -29);
  return { today, fromDay, from: fromDay ? `${fromDay}T00:00:00-03:00` : null, until: `${shiftDay(today, 1)}T00:00:00-03:00` };
}

const LABELS = { '/': 'Catálogo', '/nosotras': 'Sobre nosotras', '/como-comprar': 'Cómo comprar', '/mi-cuenta': 'Mi cuenta', '/success': 'Compra exitosa', '/restablecer-contrasena': 'Recuperar contraseña' };

export function summarizeMetrics(visits, views, range, now = new Date()) {
  const { today, fromDay } = rangeBounds(range, now);
  const isInRange = day => day <= today && (!fromDay || day >= fromDay);
  const allVisitors = new Set();
  const periodVisitors = new Set();
  const daily = new Map();
  for (const visit of visits) {
    if (!visit.visitor_id || !visit.first_seen_at) continue;
    const day = storeDay(visit.first_seen_at);
    if (day > today) continue;
    allVisitors.add(visit.visitor_id);
    if (!daily.has(day)) daily.set(day, new Set());
    daily.get(day).add(visit.visitor_id);
    if (isInRange(day)) periodVisitors.add(visit.visitor_id);
  }
  const pages = new Map();
  const products = new Map();
  let pageViews = 0;
  for (const view of views) {
    if (!view.viewed_at || !isInRange(storeDay(view.viewed_at)) || view.path.startsWith('/admin')) continue;
    pageViews++;
    const productPath = view.path.startsWith('/product/');
    const key = productPath ? `product:${view.product_id || view.path}` : view.path;
    const label = productPath ? view.products?.name || 'Producto no disponible' : LABELS[view.path] || view.path;
    for (const map of productPath ? [pages, products] : [pages]) {
      const entry = map.get(key) || { key, label, views: 0, visitors: new Set() };
      entry.views++;
      if (view.visitor_id) entry.visitors.add(view.visitor_id);
      map.set(key, entry);
    }
  }
  const trendFrom = fromDay || shiftDay(today, -29);
  const trend = [];
  for (let day = trendFrom; day <= today; day = shiftDay(day, 1)) trend.push({ day, count: daily.get(day)?.size || 0 });
  const ranking = map => Array.from(map.values()).map(({ visitors, ...row }) => ({ ...row, uniqueVisitors: visitors.size }));
  return {
    todayVisitors: daily.get(today)?.size || 0,
    totalVisitors: allVisitors.size,
    periodVisitors: periodVisitors.size,
    dailyVisits: Array.from(daily).filter(([day]) => isInRange(day)).reduce((total, [, visitors]) => total + visitors.size, 0),
    pageViews, trend, pages: ranking(pages), products: ranking(products),
  };
}
