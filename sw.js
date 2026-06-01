const CACHE_NAME = 'hms-daily-task-cache-v6'; // تم التحديث لضمان عمل النظام الجديد

// قائمة الملفات والمكتبات الأساسية التي نريد حفظها مبدئياً
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

// 1. التثبيت (Install)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => console.log('فشل حفظ:', url)))
      );
    })
  );
  self.skipWaiting();
});

// 2. التفعيل وحذف الكاش القديم (Activate)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          // نحذف أي كاش قديم، لكن نحمي الكاش الجديد وكاش الزر الذي أنشأناه في HTML
          if (cache !== CACHE_NAME && cache !== 'hms-static-resources-offline') {
            return caches.delete(cache); 
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. جلب البيانات (Fetch) - نظام (Stale-While-Revalidate) للسرعة القصوى
self.addEventListener('fetch', (event) => {
  // تخطي الطلبات التي ليست http/https (مثل إضافات المتصفح)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // جلب النسخة الأحدث من الإنترنت في الخلفية
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // في حال انقطاع الإنترنت تماماً، لا تفعل شيئاً هنا، سيعتمد على الكاش
      });

      // إرجاع النسخة المخزنة فوراً (للسرعة)، أو الانتظار لجلبها من الإنترنت إذا لم تكن مخزنة
      return cachedResponse || fetchPromise;
    })
  );
});
