// One chronological series drives the panel and the exported chart. Tables use
// a separate descending copy so display order never changes the plotted dates.
export const newestDaysFirst = trend => [...trend].sort((a, b) => b.day.localeCompare(a.day));

export function dailyChartGeometry(trend, width = 800, height = 260) {
  const left = 48, right = 24, top = 20, bottom = 40;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const peak = trend.reduce((max, row) => Math.max(max, row.count), 0);
  const rawStep = Math.max(1, peak / 4);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 5, 10].map(value => value * magnitude).find(value => value >= rawStep);
  const max = step * 4;
  const baseline = top + plotHeight;
  const points = trend.map((row, index) => ({ ...row,
    x: trend.length === 1 ? left + plotWidth / 2 : left + index * plotWidth / Math.max(1, trend.length - 1),
    y: baseline - row.count / max * plotHeight,
  }));
  const tickCount = Math.max(2, Math.floor(plotWidth / 90));
  const labelCount = Math.min(tickCount, trend.length);
  const indices = new Set(Array.from({ length: labelCount }, (_, index) => Math.round(index * (trend.length - 1) / Math.max(1, labelCount - 1))));
  const line = points.map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' ');
  const area = points.length > 1 ? `${line} L${points.at(-1).x},${baseline} L${points[0].x},${baseline} Z` : '';
  return { width, height, left, plotWidth, baseline, points, line, area,
    yTicks: Array.from({ length: 5 }, (_, index) => ({ value: index * step, y: baseline - index * plotHeight / 4 })),
    xTicks: [...indices].map(index => points[index]),
  };
}
