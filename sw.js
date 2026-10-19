const CACHE_NAME = 'rating-app-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/html/rating.html',
    '/js/script.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  	event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
	// Chỉ xử lý GET
	if (event.request.method !== 'GET') return;
	event.respondWith(
		caches.match(event.request).then((cached) => {
		if (cached) return cached;
		return fetch(event.request).then((resp) => {
			// clone để lưu vào cache
			return caches.open(CACHE_NAME).then((cache) => {
			try { cache.put(event.request, resp.clone()); } catch (e) { /* một số yêu cầu không thể cache */ }
			return resp;
			});
		}).catch(() => {
			// Khi offline, trả về index.html nếu có (SPA fallback)
			return caches.match('/index.html');
		});
		})
	);
});
