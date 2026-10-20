import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyChartGeometry, newestDaysFirst } from '../src/utils/metricsChart.js';
import { reportSections } from '../src/utils/metricsExport.js';

test('Latest date leads the daily table and exports without reversing the chart series', () => {
  const trend = [{ day: '2026-10-19', count: 0 }, { day: '2026-10-20', count: 3 }];
  assert.equal(newestDaysFirst(trend)[0].day, '2026-10-20');
  assert.equal(trend[0].day, '2026-10-19');
  const chart = dailyChartGeometry(trend);
  assert.ok(chart.points[0].x < chart.points[1].x);
  const sections = reportSections({ summary: { trend, pages: [], products: [] }, sortBy: 'views' });
  assert.deepEqual(sections[0].rows[0], ['20/10/2026', 3]);
});

test('Daily line chart handles a single day, all-zero data and long custom ranges', () => {
  const single = dailyChartGeometry([{ day: '2026-10-20', count: 0 }], 280, 230);
  assert.ok(single.points[0].x > single.left);
  assert.equal(single.points[0].y, single.baseline);
  assert.equal(single.xTicks.length, 1);
  assert.ok(single.yTicks.every(tick => Number.isInteger(tick.value)));
  const long = Array.from({ length: 366 }, (_, index) => ({ day: String(index), count: index === 200 ? 137 : 0 }));
  const chart = dailyChartGeometry(long, 320, 230);
  assert.equal(chart.points.length, 366);
  assert.ok(chart.yTicks.at(-1).value >= 137);
  assert.equal(chart.xTicks[0].day, '0');
  assert.equal(chart.xTicks.at(-1).day, '365');
  assert.ok(chart.xTicks.length <= 3);
  assert.ok(chart.points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)));
});
