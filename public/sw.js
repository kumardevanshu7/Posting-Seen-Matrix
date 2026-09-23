const CACHE_NAME = 'time-matrix-cache-v2';
const isDev = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

if (isDev) {
  // In development, instantly skip waiting, wipe caches, and unregister
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.claim())
    );
  });
} else {
  const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json'
  ];

  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
    self.skipWaiting();
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
      })
    );
    self.clients.claim();
  });
}

self.addEventListener('fetch', (event) => {
  // Completely bypass in dev mode or for external services & module scripts
  if (
    isDev ||
    event.request.url.includes('supabase.co') ||
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('firebaseio.com') ||
    event.request.url.includes('@vite') ||
    event.request.url.includes('/src/') ||
    event.request.url.includes('/node_modules/')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

