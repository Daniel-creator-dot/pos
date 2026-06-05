const CACHE_NAME = 'swiftpos-cache-v1';
const PRECACHE_ASSETS = [
  '/pos',
  '/login',
  '/manifest.json',
  '/pos_terminal.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use ignoreSearch to cache the page without query parameters
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 1. Intercept NextAuth Session Endpoint to keep user authenticated offline
  if (url.pathname.includes('/api/auth/session')) {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            try {
              const data = await cachedResponse.json();
              if (data) {
                // Keep the session alive for 30 days in the future to prevent NextAuth client from redirecting to /login
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + 30);
                data.expires = futureDate.toISOString();
                
                return new Response(JSON.stringify(data), {
                  headers: { 'Content-Type': 'application/json' },
                  status: 200
                });
              }
            } catch (e) {
              console.error('Failed to parse cached session JSON', e);
            }
            return cache.match(request);
          }
          return new Response(JSON.stringify(null), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
          });
        })
    );
    return;
  }

  // 2. Ignore other API routes to let the POS client handle network failures directly
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 3. Static Assets: Cache-First
  if (
    url.pathname.includes('/_next/static/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.json') ||
    url.pathname.includes('/fonts/')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
          }
          return response;
        }).catch(() => {
          // If a static file is missing offline, return a generic error or fallback if needed
          return new Response('Offline resource not found', { status: 404 });
        });
      })
    );
    return;
  }

  // 4. Page Documents (e.g., /pos, /login): Network-First, Cache Fallback
  event.respondWith(
    fetch(request)
      .then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }
        return response;
      })
      .catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // If the requested page is not cached, fallback to the main POS page
        return cache.match('/pos');
      })
  );
});
