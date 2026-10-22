self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Permite que la app cargue online sin bloquear las peticiones a Firebase
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
