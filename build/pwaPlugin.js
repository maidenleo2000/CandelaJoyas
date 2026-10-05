import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { serviceWorkerSource } from './serviceWorker.js';

// Only static resources are cached; prices, sessions and orders stay online.
export function pwaPlugin() {
  return {
    name: 'candela-pwa',
    configureServer(server) {
      server.middlewares.use('/sw.js', (_request, response) => {
        response.setHeader('Content-Type', 'application/javascript');
        response.setHeader('Cache-Control', 'no-cache');
        response.end(serviceWorkerSource(['/offline.html', '/pwa/icon-192.png'], 'dev'));
      });
    },
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle).filter(name => name.startsWith('assets/') && !name.endsWith('.map')).map(name => `/${name}`);
      const offline = readFileSync(new URL('../public/offline.html', import.meta.url), 'utf8');
      const logo = readFileSync(new URL('../public/pwa/icon-512.png', import.meta.url));
      const version = createHash('sha256').update(JSON.stringify(assets) + offline).update(logo).digest('hex').slice(0, 12);
      const staticUrls = [...assets, '/offline.html', '/pwa/icon-192.png', '/pwa/icon-512.png', '/pwa/icon-maskable-512.png', '/pwa/apple-touch-icon.png'];
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: serviceWorkerSource(staticUrls, version),
      });
    },
  };
}
