const CACHE_NAME = 'snake-v5';

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

// ===== ইনস্টল ইভেন্ট =====
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

// ===== অ্যাক্টিভেট ইভেন্ট =====
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

// ===== ফেচ ইভেন্ট — অফলাইনের মূল ভিত্তি =====
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      // ক্যাশে থাকলে → সেটা দাও
      if (cached) return cached;
      
      // না থাকলে → নেটওয়ার্ক থেকে আনো
      return fetch(event.request).then(response => {
        // যদি রেসপন্স ভ্যালিড হয় → ক্যাশে কপি রাখো
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // অফলাইন এবং ক্যাশে নেই → index.html দাও
        return caches.match('./index.html');
      });
    })
  );
});
