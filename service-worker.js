const CACHE_NAME = 'bt-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manuales.json',
  './manifest.json'
];

// Instalar Service Worker y guardar en caché los archivos base
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Activar y limpiar cachés antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Estrategia Cache First con fallback a Red (Network Fallback)
// Permite que la app cargue muy rápido incluso con mala conexión
self.addEventListener('fetch', event => {
  // No cachear peticiones externas ni llamadas de futuras APIs
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Devuelve el archivo desde caché si existe
        if (response) {
          return response;
        }
        // Si no está en caché, lo busca en internet
        return fetch(event.request).then(
          function(response) {
            // No cachear PDFs pesados en la caché principal para no saturar memoria
            if(!response || response.status !== 200 || response.type !== 'basic' || event.request.url.endsWith('.pdf')) {
              return response;
            }
            return response;
          }
        );
      })
  );
});
