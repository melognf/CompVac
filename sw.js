// ══════════════════════════════════════════
//  Team Days — Service Worker
//  Estrategia: network-first para HTML, stale-while-revalidate para assets
//  Auto-actualización: cualquier cambio en este file dispara nueva versión
// ══════════════════════════════════════════

// BUILD: 2026-05-28T20:00:00  ← este timestamp se reescribe en cada deploy
const BUILD = '2026-05-28T12:26:19';
const CACHE_NAME = `team-days-${BUILD}`;

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon.svg',
  './icon-apple.png'
];

// ── INSTALL: cachear assets y forzar activación inmediata ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // activar nueva versión sin esperar
  );
});

// ── ACTIVATE: limpiar caches viejos y tomar control inmediatamente ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH: network-first para HTML, stale-while-revalidate para assets ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Ignorar pedidos a Firebase y otros orígenes
  if (url.origin !== location.origin) return;
  if (event.request.method !== 'GET') return;

  const isHTML = event.request.mode === 'navigate'
              || url.pathname.endsWith('.html')
              || url.pathname === '/'
              || url.pathname.endsWith('/');

  if (isHTML) {
    // ── Network-first: siempre intenta traer el HTML fresco ──
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request).then(c => c || caches.match('./index.html')))
    );
  } else {
    // ── Stale-while-revalidate: sirve del cache, actualiza en background ──
    event.respondWith(
      caches.match(event.request).then(cached => {
        const networkFetch = fetch(event.request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return res;
        }).catch(() => null);
        return cached || networkFetch;
      })
    );
  }
});

// ── Click en notificación → enfocar / abrir la app ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsList => {
      for (const client of clientsList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});

// ── Mensaje desde la app: SKIP_WAITING activa el nuevo SW inmediatamente ──
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
