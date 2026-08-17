import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Cargamos variables de entorno manualmente desde .env
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.replace(/"/g, '').trim();
    }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function generate() {
  console.log('--- Iniciando Generación de Sitemap ---');
  try {
    console.log('Conectando con Supabase...');
    const { data: products, error } = await supabase.from('products').select('id, category');
    if (error) throw error;

    const baseUrl = 'https://candelajoyas.com.ar';
    const categories = [...new Set(products.map(p => p.category))];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${categories.filter(c => c).map(cat => `
  <url>
    <loc>${baseUrl}/?category=${encodeURIComponent(cat)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
  ${products.map(p => `
  <url>
    <loc>${baseUrl}/product/${p.id}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join('')}
</urlset>`;

    fs.writeFileSync('public/sitemap.xml', sitemap);
    console.log(`✅ Éxito: Se ha generado el sitemap con ${products.length} productos y ${categories.length} categorías.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al generar el sitemap:', error);
    process.exit(1);
  }
}

generate();
