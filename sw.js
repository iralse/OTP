const CACHE_NAME = "pwa-otp-cache-v3";
const FILES_TO_CACHE = [
    "/index.html",
    "/styles.css",
    "/app.js",
    "/sw.js",
    "/manifest.json",
    "/icon.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log("Удаление старого кэша:", key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return fetch(event.request).then((response) => {
                if (event.request.url.startsWith("http")) {
                    cache.put(event.request, response.clone());
                }
                return response;
            }).catch(() => caches.match(event.request));
        })
    );
});
