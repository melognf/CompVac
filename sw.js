// ══════════════════════════════════════════
//  Team Days — Service Worker
//  Versión cache-first con fallback a network
// ══════════════════════════════════════════
const CACHE_NAME = 'team-days-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon.svg',
  './icon-apple.png'
];

// Install: cachear assets estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: limpiar caches viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: para assets de la app, cache-first.
// Para Firebase y otros dominios externos, siempre red (no cachear).
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // No cachear pedidos a Firebase ni externos
  if (url.origin !== location.origin) return;
  // No cachear método POST/PUT/DELETE
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        // Actualizar cache silenciosamente para próximas visitas
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// Click en notificación → enfocar / abrir la app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsList => {
      // Si la app ya está abierta, enfocarla
      for (const client of clientsList) {
        if ('focus' in client) return client.focus();
      }
      // Si no, abrirla
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});

// Mensaje desde la app — sirve para forzar update o disparar notificación
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
