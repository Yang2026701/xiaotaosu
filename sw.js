// Service Worker for 小桃酥的成长记录 PWA
const CACHE_NAME = 'xiaotaosu-v2';
const ASSETS = [
  '/xiaotaosu/',
  '/xiaotaosu/index.html',
  '/xiaotaosu/manifest.json',
  '/xiaotaosu/icon-192.png',
  '/xiaotaosu/icon-512.png',
  // JS files are inlined in index.html, so just cache the HTML
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// Install: cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(ASSETS.map(url =>
        cache.add(url).catch(err => console.warn('Cache miss:', url, err.message))
      ));
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: network-first for API calls, cache-first for static assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API calls: network only (don't cache Supabase data)
  if (url.hostname.includes('supabase.co') || url.pathname.includes('/rest/') || url.pathname.includes('/storage/')) {
    return; // Let browser handle API calls normally
  }

  // Static assets: cache-first, network fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Cache successful responses
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
