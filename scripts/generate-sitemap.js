import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
import { loadEnv } from 'vite';

const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env };
const baseUrl = 'https://candelajoyas.com.ar';
const escapeXml = value => String(value).replace(/[<>&"']/g, character => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
})[character]);

async function generate() {
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
    throw new Error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
  }
  const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const products = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from('products')
      .select('id, is_hidden, updated_at').order('id')
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    products.push(...data.filter(product => !product.is_hidden));
    if (data.length < pageSize) break;
  }

  const entries = ['/', '/nosotras', '/como-comprar'].map(path => ({ path }));
  entries.push(...products.map(product => ({
    path: `/product/${encodeURIComponent(product.id)}`,
    updatedAt: product.updated_at,
  })));
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map(({ path, updatedAt }) => {
    const date = updatedAt ? new Date(updatedAt) : null;
    const lastmod = date && !Number.isNaN(date.getTime())
      ? `\n    <lastmod>${date.toISOString()}</lastmod>` : '';
    return `  <url>\n    <loc>${escapeXml(baseUrl + path)}</loc>${lastmod}\n  </url>`;
  }).join('\n')}\n</urlset>\n`;

  writeFileSync(new URL('../public/sitemap.xml', import.meta.url), sitemap);
  console.log(`Sitemap generado: ${products.length} productos públicos y 3 páginas.`);
}

generate().catch(error => {
  console.error('No se pudo generar el sitemap:', error.message);
  process.exitCode = 1;
});
