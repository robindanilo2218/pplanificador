const APP_VERSION = '1.3.0';
const CACHE_NAME = `pplanificador-v${APP_VERSION}`;

// Solo archivos locales en el pre-caché de instalación.
// Las CDN se cachean dinámicamente en el primer fetch con conexión.
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './app.js'
];

// 1. INSTALACIÓN: cachea solo archivos locales (no falla si no hay CDN)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-cacheando app shell local...');
      // addAll falla si una URL falla; usamos add individual para mayor resiliencia
      return Promise.allSettled(
        PRECACHE_ASSETS.map(url => cache.add(url).catch(err => console.warn('[SW] No se pudo cachear:', url, err)))
      );
    })
  );
  self.skipWaiting();
});

// 2. ACTIVACIÓN: limpia cachés de versiones anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Borrando caché antiguo:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// 3. FETCH: Cache-First para locales, Network-First para CDN externas
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Ignorar peticiones que no sean GET o que sean chrome-extension
  if (event.request.method !== 'GET' || url.startsWith('chrome-extension')) return;

  // Estrategia: intentar caché primero, luego red, cachear si llega de red
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Está en caché → devolver inmediatamente (funciona offline)
        return cachedResponse;
      }

      // No está en caché → intentar red
      return fetch(event.request)
        .then((networkResponse) => {
          // Cachear copia si la respuesta es válida (2xx)
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Sin red y sin caché: devolver página principal como fallback
          // Evita que Chrome muestre el dinosaurio
          return caches.match('./index.html');
        });
    })
  );
});
// 4. MENSAJE: responde a postMessage para enviar versión o forzar activación
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'GET_VERSION') {
    event.source.postMessage({ type: 'VERSION', version: APP_VERSION });
  }
});
