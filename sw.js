// Self-destruct Service Worker — v5
// On activation: delete all caches, unregister self, then refresh all clients.
self.addEventListener('install', function(event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(key) { return caches.delete(key); }));
    }).then(function() {
      return self.registration.unregister();
    }).then(function() {
      return self.clients.matchAll().then(function(clients) {
        clients.forEach(function(client) { client.navigate(client.url); });
      });
    })
  );
});
