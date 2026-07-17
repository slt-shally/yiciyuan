// 衣次元 Service Worker - 离线缓存与预加载
// 使用相对路径，兼容 GitHub Pages 子路径部署
const CACHE_NAME = 'yiciyuan-v1';

// Install: 预缓存关键资源（使用相对路径）
self.addEventListener('install', event => {
  // 不预缓存绝对路径，改用动态缓存策略
  self.skipWaiting();
});

// Activate: 清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: 网络优先，失败则从缓存读取
self.addEventListener('fetch', event => {
  // 只缓存同源 GET 请求
  if (event.request.method !== 'GET') return;

  // 外部资源（如字体）用缓存优先策略
  if (!event.request.url.startsWith(self.location.origin)) {
    if (event.request.url.includes('fonts.googleapis.com') || 
        event.request.url.includes('fonts.gstatic.com')) {
      event.respondWith(
        caches.match(event.request).then(cached => {
          return cached || fetch(event.request).then(response => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            return response;
          });
        })
      );
      return;
    }
    return; // 其他外部请求不缓存
  }

  event.respondWith(
    fetch(event.request).then(response => {
      // 成功获取网络响应，存入缓存
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      return response;
    }).catch(() => {
      // 网络失败，从缓存读取
      return caches.match(event.request).then(cached => {
        // 如果缓存也没找到，尝试返回首页缓存（SPA fallback）
        return cached || caches.match(new Request(self.location.origin + self.registration.scope));
      });
    })
  );
});
