// Solo recuperación de navegación. Las API y las pantallas privadas siempre usan red.
const CACHE = 'bancoagricola-pwa-recuperacion-v1';
const FALLBACK = '/pwa/sin-conexion.html';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(new Request(FALLBACK, { cache: 'reload' }))));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('bancoagricola-pwa-recuperacion-') && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate'
    || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  event.respondWith(fetch(event.request).catch(async () => {
    return (await caches.match(FALLBACK)) ?? new Response('Sin conexión. Recupera la conexión y vuelve a intentar.', {status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }));
});
