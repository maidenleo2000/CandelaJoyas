import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

async function generate() {
  console.log('--- Iniciando Generación de Sitemap ---');
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('Conectando con Firestore...');
    const productsCol = collection(db, 'products');
    const snapshot = await getDocs(productsCol);
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const baseUrl = 'https://genovevaindu.com.ar';
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
