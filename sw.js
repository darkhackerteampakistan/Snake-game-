// ক্যাশের নাম (ভার্সন বদলালে নতুন ক্যাশ হবে)
const CACHE_NAME = 'snake-v1';

// যেসব ফাইল অফলাইনে লাগবে
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './dev.jpg',
  './icon-192.png',
  './icon-512.png'
];

// ===== ইনস্টল: সব ফাইল ক্যাশে সেভ করো =====
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✅ সব ফাইল ক্যাশে সেভ হচ্ছে...');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting(); // সাথে সাথে নতুন SW চালু
});

// ===== অ্যাক্টিভেট: পুরনো ক্যাশ মুছে ফেলো =====
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('🗑️ পুরনো ক্যাশ মুছছে:', k);
          return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim(); // সব ট্যাবের কন্ট্রোল নাও
});

// ===== ফেচ: আগে ক্যাশ, না পেলে নেটওয়ার্ক =====
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      // ক্যাশে থাকলে সেটাই দাও
      if (cached) return cached;
      // না থাকলে নেটওয়ার্ক থেকে আনো
      return fetch(event.request).then(response => {
        // নতুন ফাইল ক্যাশে যোগ করো (optional)
        return response;
      }).catch(() => {
        // অফলাইন আর ক্যাশে নেই → index.html দেখাও
        return caches.match('./index.html');
      });
    })
  );
});
