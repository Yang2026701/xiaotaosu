// Service Worker for 小桃酥的成长记录 PWA
// v4: Network-first for HTML to prevent stale cache issues
const CACHE_NAME = 'xiaotaosu-v4';
const ASSETS = [
  '/xiaotaosu/manifest.json',
  '/xiaotaosu/icon-192.png',
  '/xiaotaosu/icon-512.png'
];

// Install: cache static assets only (NOT HTML)
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

// Fetch: network-only for API, network-first for HTML, cache-first for static
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API calls: bypass cache entirely
  if (url.hostname.includes('supabase.co') || url.pathname.includes('/rest/') || url.pathname.includes('/storage/')) {
    return;
  }

  // HTML pages: ALWAYS network-first, never serve stale cache
  if (event.request.destination === 'document' || url.pathname.endsWith('.html') || url.pathname === '/xiaotaosu/' || url.pathname === '/xiaotaosu') {
    event.respondWith(
      fetch(event.request).catch(function() {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Static assets (icons, manifest): cache-first
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request).then(function(response) {
        if (response.ok && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
        }
        return response;
      });
    })
  );
});
