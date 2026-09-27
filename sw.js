const CACHE_NAME = 'snake-v7';

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './site.webmanifest',
  './favicon.ico',
  './favicon.svg',
  './favicon-96x96.png',
  './apple-touch-icon.png',
  './web-app-manifest-192x192.png',
  './web-app-manifest-512x512.png'
];

// ===== ইনস্টল =====
self.addEventListener('install', event => {
  console.log('📦 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('💾 ক্যাশে সেভ হচ্ছে:', ASSETS.length, 'ফাইল');
      return cache.addAll(ASSETS);
    }).catch(err => {
      console.error('❌ ক্যাশ সেভে সমস্যা:', err);
    })
  );
  self.skipWaiting();
});

// ===== অ্যাক্টিভেট =====
self.addEventListener('activate', event => {
  console.log('✅ Service Worker activated');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('🗑️ পুরনো ক্যাশ মুছছে:', k);
          return caches.delete(k);
        })
      )
    )
  );
  self.clients.claim();
});

// ===== ফেচ =====
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        return caches.match('./index.html');
      });
    })
  );
});
