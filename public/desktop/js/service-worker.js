// Versi cache - ubah ini ketika ada perubahan pada aplikasi
const CACHE_NAME = 'xtreme-soft-cache-v4';

// Daftar file yang akan di-cache
const filesToCache = [
  '/',
  '/index.html',
  '/player',
  '/script.js',
  '/styles.css',
  '/sw-register.js',
  '/favicon.ico',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// Event install - caching file-file utama
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(filesToCache);
      })
      .then(() => {
        // Force activation pada service worker yang baru
        return self.skipWaiting();
      })
  );
});

// Event activate - membersihkan cache lama
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Menghapus cache lama', key);
          return caches.delete(key);
        }
      }));
    })
    .then(() => {
      // Memastikan service worker langsung mengambil alih klien
      return self.clients.claim();
    })
  );
});

// Event fetch - Strategi cache-first dengan fallback ke network
self.addEventListener('fetch', (event) => {
  // Skip URL yang tidak sama dengan origin dan bukan dari CDN yang diizinkan
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.startsWith('https://cdnjs.cloudflare.com') &&
      !event.request.url.startsWith('https://www.youtube.com/iframe_api')) {
    return;
  }

  // Skip untuk request yang bukan GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Penanganan khusus untuk rute '/player'
  if (event.request.url.includes('/player') && 
      !event.request.url.endsWith('.js') && 
      !event.request.url.endsWith('.css')) {
    event.respondWith(
      caches.match('/player')
        .then((response) => {
          return response || fetch(event.request)
            .then(networkResponse => {
              // Cache respons yang baru
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseToCache);
              });
              return networkResponse;
            });
        })
        .catch(() => {
          // Fallback ke index.html jika gagal
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Strategi cache-first untuk permintaan lainnya
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Buat copy dari request karena request hanya bisa digunakan sekali
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then(networkResponse => {
            // Validasi bahwa response valid
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Buat copy response karena hanya bisa digunakan sekali
            const responseToCache = networkResponse.clone();

            // Cache respons yang baru
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch(error => {
            console.log('[Service Worker] Fetch failed; returning offline page instead.', error);
            // Jika error pada player.html, coba tampilkan index.html
            if (event.request.url.includes('/player')) {
              return caches.match('/index.html');
            }
            
            // Tambahkan fallback generik untuk asset lainnya
            if (event.request.url.match(/\.(jpe?g|png|gif|svg)$/)) {
              return caches.match('/images/fallback.png');
            }
            
            // Fallback umum untuk resource lain
            return caches.match('/offline.html');
          });
      })
  );
});

// Event message - untuk menerima pesan dari halaman
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'clearCache') {
    console.log('[Service Worker] Clearing cache by request');
    
    event.waitUntil(
      caches.keys()
        .then((keyList) => {
          return Promise.all(keyList.map((key) => {
            console.log('[Service Worker] Deleting cache:', key);
            return caches.delete(key);
          }));
        })
        .then(() => {
          console.log('[Service Worker] All caches cleared');
          // Kirim pesan sukses kembali ke halaman
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ 
              success: true,
              message: 'Semua cache berhasil dihapus'
            });
          }
        })
        .catch(error => {
          console.error('[Service Worker] Error clearing cache:', error);
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ 
              success: false,
              message: 'Gagal menghapus cache'
            });
          }
        })
    );
  }
});