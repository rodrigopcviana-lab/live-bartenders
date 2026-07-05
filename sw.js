const CACHE = 'lb-calc-v2';

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(caches.open(CACHE).then((cache) =>
        cache.addAll(['./', './index.html', './app.js', './manifest.json'])
    ));
});

// remove caches antigos ao ativar nova versão
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);
    // Dados do Notion (data/*.json): network-first, para refletir sincronizações novas.
    if (url.pathname.includes('/data/')) {
        e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
        return;
    }
    // Demais assets: cache-first (rápido/offline).
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
