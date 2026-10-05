export function serviceWorkerSource(staticUrls, version) {
  return `
const CACHE = 'candela-static-${version}';
const BRAND_CACHE = 'candela-brand-v1';
const STATIC_URLS = ${JSON.stringify(staticUrls)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(STATIC_URLS)));
});
// Updates activate after existing app windows close, without interrupting checkout.
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('candela-static-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/pwa/site-')) {
    event.respondWith(caches.open(BRAND_CACHE).then(async cache => (await cache.match(request, { ignoreSearch: true })) || fetch(request)));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.open(CACHE).then(cache => cache.match('/offline.html'))));
    return;
  }
  if (STATIC_URLS.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(request)) || fetch(request)));
  }
});
`;
}
