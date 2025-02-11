const CACHE_NAME = 'otp-cache-v1';
const urlsToCache = [
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icon.png',
  '/offline.html' // Если у вас есть offline.html для отображения в офлайн-режиме
];

// Событие установки: кэшируем все необходимые ресурсы
self.addEventListener('install', event => {
  console.log('[Service Worker] Установка');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Кэширование файлов:', urlsToCache);
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('[Service Worker] Ошибка при кэшировании файлов:', error);
      })
  );
  // Принудительное обновление service worker без ожидания закрытия старых клиентов
  self.skipWaiting();
});

// Событие активации: удаляем старые кэши
self.addEventListener('activate', event => {
  console.log('[Service Worker] Активация');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            console.log('[Service Worker] Удаление старого кэша:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  // Захватываем управление всеми клиентами сразу
  self.clients.claim();
});

// Событие fetch: обрабатываем запросы
self.addEventListener('fetch', event => {
  console.log('[Service Worker] Запрос:', event.request.url);
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Если ресурс найден в кэше, возвращаем его
        if (response) {
          return response;
        }
        // Если ресурс не найден, обращаемся к сети
        return fetch(event.request)
          .then(networkResponse => {
            // Если ответ недействительный, просто возвращаем его
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            // Клонируем ответ для кэширования
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseClone);
              });
            return networkResponse;
          })
          .catch(error => {
            console.error('[Service Worker] Ошибка при загрузке из сети:', error);
            // Если это навигационный запрос и сети нет, возвращаем офлайн-страницу
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
          });
      })
  );
});
