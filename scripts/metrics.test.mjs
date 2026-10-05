import test from 'node:test';
import assert from 'node:assert/strict';
import { storeDay, rangeBounds, summarizeMetrics } from '../src/utils/metrics.js';

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

test('Empty reports include all zero days; all-history chart shows the last 30', () => {
  const result = summarizeMetrics([], [], 'all', now);
  assert.equal(result.periodVisitors, 0);
  assert.equal(result.totalVisitors, 0);
  assert.equal(result.trend.length, 30);
  assert.ok(result.trend.every(day => day.count === 0));
});
