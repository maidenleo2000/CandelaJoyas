import { METRICS_TIME_ZONE, storeDay } from './metrics.js';
import { dailyChartGeometry, newestDaysFirst } from './metricsChart.js';

const formatNumber = value => new Intl.NumberFormat('es-AR').format(value);
const dateLabel = day => day.split('-').reverse().join('/');
const ordered = (rows, sortBy) => [...rows].sort((a, b) => (sortBy === 'views' ? b.views - a.views : b.uniqueVisitors - a.uniqueVisitors) || a.label.localeCompare(b.label));

export function reportSections(report) {
  return [
    { title: 'Visitantes por día', headers: ['Fecha', 'Visitantes únicos diarios'], rows: newestDaysFirst(report.summary.trend).map(row => [dateLabel(row.day), row.count]) },
    { title: 'Páginas más visitadas (incluye productos)', headers: ['Página', 'Vistas', 'Visitantes únicos'], rows: ordered(report.summary.pages, report.sortBy).map(row => [row.label, row.views, row.uniqueVisitors]) },
    { title: 'Productos más visitados', headers: ['Producto', 'Vistas', 'Visitantes únicos'], rows: ordered(report.summary.products, report.sortBy).map(row => [row.label, row.views, row.uniqueVisitors]) },
  ];
}

function chartImage(trend) {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 560;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el gráfico.');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 1600, 560);
  const chart = dailyChartGeometry(trend, 1000, 320);
  ctx.save(); ctx.scale(1.6, 1.6);
  ctx.font = '12px Arial'; ctx.textAlign = 'right';
  for (const tick of chart.yTicks) {
    ctx.strokeStyle = '#e9e5df'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(chart.left, tick.y); ctx.lineTo(chart.width - 24, tick.y); ctx.stroke();
    ctx.fillStyle = '#625b66'; ctx.fillText(formatNumber(tick.value), chart.left - 12, tick.y + 4);
  }
  if (chart.points.length > 1) {
    const fill = ctx.createLinearGradient(0, 20, 0, chart.baseline);
    fill.addColorStop(0, '#e8d5bd'); fill.addColorStop(1, '#ffffff');
    ctx.beginPath(); chart.points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.lineTo(chart.points.at(-1).x, chart.baseline); ctx.lineTo(chart.points[0].x, chart.baseline); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    ctx.beginPath(); chart.points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.strokeStyle = '#9b6b3b'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
  }
  if (trend.length <= 31) {
    ctx.fillStyle = '#9b6b3b';
    chart.points.forEach(point => { ctx.beginPath(); ctx.arc(point.x, point.y, 3, 0, Math.PI * 2); ctx.fill(); });
  }
  ctx.textAlign = 'center'; ctx.fillStyle = '#625b66'; ctx.font = '12px Arial';
  chart.xTicks.forEach(tick => ctx.fillText(dateLabel(tick.day).slice(0, 5), tick.x, chart.height - 12));
  ctx.restore(); ctx.font = '20px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#625b66';
  ctx.fillText('Visitantes únicos por día · Horario de Argentina', 800, 540);
  return canvas.toDataURL('image/png');
}

async function saveFile(blob, filename) {
  const { Capacitor } = await import('@capacitor/core');
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const file = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });
    await Share.share({ title: 'Reporte de métricas', files: [file.uri] });
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function exportMetrics(format, report) {
  const sections = reportSections(report);
  const generated = report.generatedAt.toLocaleString('es-AR', { timeZone: METRICS_TIME_ZONE });
  const filterText = `${report.contentLabel}${report.query ? ` · Búsqueda: ${report.query}` : ''}`;
  const chartNote = `Gráfico de líneas: ${report.period}. Detalle diario ordenado del más reciente al más antiguo.`;
  const methodology = 'Un visitante representa un navegador o instalación. Los únicos diarios no se suman para obtener los únicos del período. Se excluye al administrador.';
  const summaryRows = [['Visitantes únicos del período', report.summary.periodVisitors], ['Vistas del período', report.summary.pageViews], ['Visitantes hoy (contenido seleccionado)', report.summary.todayVisitors], ['Visitantes históricos (contenido seleccionado)', report.summary.totalVisitors]];
  const filename = `metricas-${storeDay(report.generatedAt)}.${format}`;
  const image = chartImage(report.summary.trend);
  if (format === 'xlsx') {
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tienda Cande';
    const sheet = workbook.addWorksheet('Reporte', { views: [{ state: 'frozen', ySplit: 5 }] });
    sheet.columns = [{ width: 62 }, { width: 25 }, { width: 25 }, { width: 18 }, { width: 18 }, { width: 18 }];
    const fullRow = text => { const row = sheet.addRow([text]); sheet.mergeCells(row.number, 1, row.number, 6); row.height = 30; row.alignment = { vertical: 'middle', wrapText: true }; return row; };
    fullRow('Tienda Cande · Reporte de métricas').font = { size: 20, bold: true, color: { argb: 'FF79502C' } };
    fullRow(report.period);
    fullRow(filterText).height = 46;
    fullRow(`Datos actualizados: ${generated} · Horario de Argentina`);
    fullRow('Resumen').font = { bold: true, size: 13 };
    summaryRows.forEach(values => { const row = sheet.addRow(values); row.height = 25; row.getCell(2).numFmt = '#,##0'; });
    fullRow(chartNote);
    const chartRow = sheet.rowCount;
    for (let i = 0; i < 19; i++) sheet.addRow([]).height = 20;
    const imageId = workbook.addImage({ base64: image, extension: 'png' });
    sheet.addImage(imageId, { tl: { col: 0, row: chartRow }, ext: { width: 1000, height: 350 } });
    fullRow(methodology).height = 45;
    for (const section of sections) {
      sheet.addRow([]);
      fullRow(section.title).font = { bold: true, size: 13 };
      const header = sheet.addRow(section.headers);
      header.height = 26;
      header.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF79502C' } }; cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; });
      if (!section.rows.length) sheet.addRow(['Sin registros para los filtros seleccionados.']);
      section.rows.forEach(values => {
        // Explicit string values remain text, including labels beginning with '='.
        const row = sheet.addRow(values);
        row.alignment = { vertical: 'top', wrapText: true };
        row.height = Math.max(24, Math.ceil(String(values[0]).length / 55) * 16);
        row.getCell(2).numFmt = '#,##0'; row.getCell(3).numFmt = '#,##0';
      });
    }
    const buffer = await workbook.xlsx.writeBuffer();
    await saveFile(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
    return;
  }
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF();
  let y = 20;
  const ensureSpace = height => { if (y + height > 277) { pdf.addPage(); y = 20; } };
  const text = (value, size = 10, bold = false) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(String(value), 174);
    for (const line of lines) { ensureSpace(size * .5 + 2); pdf.text(line, 18, y); y += size * .5 + 2; }
  };
  pdf.setTextColor('#303044');
  text('Tienda Cande · Reporte de métricas', 18, true);
  text(report.period, 12); text(filterText); text(`Actualizado: ${generated} · Argentina`, 9);
  y += 4;
  summaryRows.forEach(([label, value]) => text(`${label}: ${formatNumber(value)}`, 10, true));
  ensureSpace(80); pdf.addImage(image, 'PNG', 15, y, 180, 63); y += 68;
  text(chartNote, 9); text(methodology, 9);
  for (const section of sections) {
    y += 8; ensureSpace(26); text(section.title, 13, true);
    const drawHeader = () => { pdf.setFillColor('#f3ede5'); pdf.rect(18, y - 4, 174, 8, 'F'); pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.text(section.headers[0], 20, y + 1); pdf.text(section.headers[1], section.headers.length === 2 ? 190 : 155, y + 1, { align: 'right' }); if (section.headers.length === 3) pdf.text('Únicos', 190, y + 1, { align: 'right' }); y += 10; };
    drawHeader();
    if (!section.rows.length) text('Sin registros para los filtros seleccionados.');
    for (const values of section.rows) {
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9);
      const lines = pdf.splitTextToSize(String(values[0]), 116);
      // Split unusually long labels into page-sized fragments without clipping.
      for (let offset = 0; offset < lines.length; offset += 42) {
        const chunk = lines.slice(offset, offset + 42);
        const height = Math.max(9, chunk.length * 4.5 + 4);
        if (y + height > 277) { pdf.addPage(); y = 20; drawHeader(); pdf.setFont('helvetica', 'normal'); }
        pdf.text(chunk, 20, y);
        if (offset === 0) { pdf.text(formatNumber(values[1]), values.length === 2 ? 190 : 155, y, { align: 'right' }); if (values.length === 3) pdf.text(formatNumber(values[2]), 190, y, { align: 'right' }); }
        y += height;
      }
    }
  }
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) { pdf.setPage(page); pdf.setFontSize(8); pdf.text(`${page} / ${pages}`, 192, 288, { align: 'right' }); }
  await saveFile(pdf.output('blob'), filename);
}
