import test from 'node:test';
import assert from 'node:assert/strict';
import { storeDay, rangeBounds, summarizeMetrics } from '../src/utils/metrics.js';
import { createPageViewTracker } from '../src/utils/pageViewEvent.js';

test('Back and Forward create new arrivals; effect repeats and retries keep their ID', () => {
  let nextId = 0;
  const tracker = createPageViewTracker(() => String(++nextId));
  const first = tracker.arrive('a', '/');
  first.pending = true;
  assert.equal(tracker.arrive('a', '/'), first);
  const product = tracker.arrive('b', '/product/example');
  const back = tracker.arrive('a', '/');
  assert.notEqual(back.id, first.id);
  assert.equal(back.pending, false);
  assert.equal(tracker.arrive('a', '/').id, back.id);
  assert.notEqual(tracker.arrive('b', '/product/example').id, product.id);
});

test('Legacy UTC visits recover Argentine activity from views without double counting', () => {
  const visits = [{ visitor_id: 'a', first_seen_at: '2026-10-04T01:00:00Z' }];
  const views = [
    { visitor_id: 'a', path: '/', viewed_at: '2026-10-04T01:00:00Z' },
    { visitor_id: 'a', path: '/', viewed_at: '2026-10-04T10:00:00Z' },
    { visitor_id: 'a', path: '/', viewed_at: '2026-10-04T11:00:00Z' },
  ];
  const today = summarizeMetrics(visits, views, 'today', now);
  assert.equal(today.todayVisitors, 1);
  assert.equal(today.periodVisitors, 1);
  assert.equal(today.totalVisitors, 1);
  assert.equal(today.dailyVisits, 1);
  const week = summarizeMetrics(visits, views, '7d', now);
  assert.equal(week.dailyVisits, 2);
  assert.equal(week.periodVisitors, 1);
});

const now = new Date('2026-10-04T23:00:00Z');

test('Argentina keeps the previous day until 03:00 UTC', () => {
  assert.equal(storeDay('2026-10-04T02:59:59Z'), '2026-10-03');
  assert.equal(storeDay('2026-10-04T03:00:00Z'), '2026-10-04');
  assert.deepEqual(rangeBounds('today', now), { today: '2026-10-04', fromDay: '2026-10-04', from: '2026-10-04T00:00:00-03:00', until: '2026-10-05T00:00:00-03:00' });
  assert.equal(rangeBounds('7d', now).fromDay, '2026-09-28');
  assert.equal(rangeBounds('30d', now).fromDay, '2026-09-05');
});

test('Repeat visitors count once per period and once per local day', () => {
  const visits = [
    { visitor_id: 'a', first_seen_at: '2026-10-03T02:00:00Z' },
    { visitor_id: 'a', first_seen_at: '2026-10-03T04:00:00Z' },
    { visitor_id: 'a', first_seen_at: '2026-10-04T01:00:00Z' },
    { visitor_id: 'b', first_seen_at: '2026-10-04T10:00:00Z' },
    { visitor_id: 'c', first_seen_at: '2026-08-01T10:00:00Z' },
  ];
  const result = summarizeMetrics(visits, [], '7d', now);
  assert.equal(result.totalVisitors, 3);
  assert.equal(result.periodVisitors, 2);
  assert.equal(result.todayVisitors, 1);
  assert.equal(result.dailyVisits, 3);
  assert.equal(result.trend.length, 7);
  assert.equal(result.trend[0].count, 0);
  assert.equal(result.trend.find(day => day.day === '2026-10-03').count, 1);
});

test('Views and unique visitors stay separate, including deleted products', () => {
  const views = [
    { path: '/', visitor_id: 'a', viewed_at: '2026-10-04T08:00:00Z' },
    { path: '/', visitor_id: 'a', viewed_at: '2026-10-04T09:00:00Z' },
    { path: '/product/deleted', product_id: null, visitor_id: 'b', viewed_at: '2026-10-04T09:00:00Z' },
    { path: '/admin', visitor_id: 'admin', viewed_at: '2026-10-04T09:00:00Z' },
    { path: '/', visitor_id: 'old', viewed_at: '2026-10-04T02:00:00Z' },
  ];
  const result = summarizeMetrics([], views, 'today', now);
  assert.equal(result.pageViews, 3);
  assert.equal(result.pages.find(row => row.key === '/').views, 2);
  assert.equal(result.pages.find(row => row.key === '/').uniqueVisitors, 1);
  assert.equal(result.products.length, 1);
  assert.equal(result.products[0].label, 'Producto no disponible');
});

test('Empty all-history reports show today with zero visitors', () => {
  const result = summarizeMetrics([], [], 'all', now);
  assert.equal(result.periodVisitors, 0);
  assert.equal(result.totalVisitors, 0);
  assert.equal(result.trend.length, 1);
  assert.ok(result.trend.every(day => day.count === 0));
});

test('Custom dates include both boundaries using Argentina days and zero-fill the trend', () => {
  const views = [
    { path: '/', visitor_id: 'a', viewed_at: '2026-10-02T02:59:59Z' },
    { path: '/', visitor_id: 'b', viewed_at: '2026-10-02T03:00:00Z' },
    { path: '/', visitor_id: 'b', viewed_at: '2026-10-04T02:59:59Z' },
    { path: '/', visitor_id: 'c', viewed_at: '2026-10-04T03:00:00Z' },
  ];
  const result = summarizeMetrics([], views, 'custom', now, { fromDay: '2026-10-02', toDay: '2026-10-03' });
  assert.equal(result.periodVisitors, 1);
  assert.equal(result.pageViews, 2);
  assert.equal(result.dailyVisits, 2);
  assert.deepEqual(result.trend, [{ day: '2026-10-02', count: 1 }, { day: '2026-10-03', count: 1 }]);
});

test('Content and search filters constrain all counts, trend and rankings together', () => {
  const visits = [{ visitor_id: 'unrelated', first_seen_at: '2026-10-04T10:00:00Z' }];
  const views = [
    { path: '/product/1', product_id: '1', products: { name: 'Vestido Rosa' }, visitor_id: 'a', viewed_at: '2026-10-04T10:00:00Z' },
    { path: '/product/1', product_id: '1', products: { name: 'Vestido Rosa' }, visitor_id: 'a', viewed_at: '2026-10-04T11:00:00Z' },
    { path: '/', visitor_id: 'b', viewed_at: '2026-10-04T10:00:00Z' },
  ];
  const result = summarizeMetrics(visits, views, '7d', now, { content: 'products', query: ' ROSA ' });
  assert.equal(result.periodVisitors, 1);
  assert.equal(result.totalVisitors, 1);
  assert.equal(result.todayVisitors, 1);
  assert.equal(result.pageViews, 2);
  assert.equal(result.products[0].views, 2);
  assert.equal(result.trend.at(-1).count, 1);
  const pages = summarizeMetrics(visits, views, 'today', now, { content: 'pages' });
  assert.equal(pages.pageViews, 1);
  assert.equal(pages.products.length, 0);
  assert.equal(pages.totalVisitors, 1);
  const empty = summarizeMetrics(visits, views, 'today', now, { query: 'inexistente' });
  assert.equal(empty.pageViews, 0);
  assert.equal(empty.totalVisitors, 0);
});

test('All-history trend covers the full recorded activity instead of only the last month', () => {
  const result = summarizeMetrics([{ visitor_id: 'old', first_seen_at: '2026-08-01T15:00:00Z' }], [{ path: '/', visitor_id: 'new', viewed_at: '2026-10-04T15:00:00Z' }], 'all', now);
  assert.equal(result.trend[0].day, '2026-08-01');
  assert.equal(result.trend.at(-1).day, '2026-10-04');
  assert.equal(result.trend[0].count, 1);
  assert.equal(result.trend.reduce((sum, row) => sum + row.count, 0), result.dailyVisits);
});
