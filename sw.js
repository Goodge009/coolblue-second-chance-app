/* Service worker — application web hors ligne */
const VERSION = 'coolblue-v7';
const SHELL = [
    './',
    'index.html',
    'app.js',
    'scraper.js',
    'categories.json',
    'brands.json',
    'manifest.webmanifest',
    'icons/icon-192.png',
    'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(VERSION).then((cache) => cache.addAll(SHELL).catch(() => null))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if ('focus' in client) return client.focus();
            }
            return self.clients.openWindow('./');
        })
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET') return;

    // Données : réseau d'abord, sinon cache
    if (url.pathname.endsWith('second_chance_offers.json')) {
        event.respondWith(
            fetch(event.request)
                .then((res) => {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    const copy = res.clone();
                    caches.open(VERSION).then((cache) => cache.put(event.request, copy));
                    return res;
                })
                .catch(() =>
                    caches.match(event.request).then((c) =>
                        c ||
                        new Response(
                            JSON.stringify({ products: [], error: 'offline' }),
                            { status: 503, headers: { 'Content-Type': 'application/json' } }
                        )
                    )
                )
        );
        return;
    }

    // Shell et autres : cache d'abord, sinon réseau puis mise en cache
    event.respondWith(
        caches.match(event.request).then(
            (cached) =>
                cached ||
                fetch(event.request).then((res) => {
                    if (res.ok && url.origin === location.origin) {
                        const copy = res.clone();
                        caches.open(VERSION).then((cache) => cache.put(event.request, copy));
                    }
                    return res;
                })
        )
    );
});
