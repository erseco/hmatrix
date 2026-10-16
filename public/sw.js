const CACHE = 'matrix-hand-v1';
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const response = await fetch('./');
    if (!response.ok) throw new Error('App shell unavailable');
    const assets = []; // Replaced by the production build.

    await cache.addAll(['./', './manifest.webmanifest', './icon-192.png', './icon-512.png', './hand-worker.js', './vision_bundle.js', './models/hand_landmarker.task', ...assets]);
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => { for (const name of await caches.keys()) if (name.startsWith('matrix-hand-') && name !== CACHE) await caches.delete(name); await self.clients.claim(); })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok) { const cache = await caches.open(CACHE); await cache.put(event.request, response.clone()); }
      return response;
    } catch (error) {
      if (event.request.mode === 'navigate') return (await cache.match('./')) || Response.error();
      throw error;
    }
  })());
});
