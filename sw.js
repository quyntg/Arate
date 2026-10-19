// Tăng số version mỗi lần deploy để máy cũ tự bỏ cache cũ
const CACHE_NAME = 'rating-app-v2';
const ASSETS = [
	'/',
	'/index.html',
	'/html/rating.html',
	'/html/admin.html',
	'/css/style.css',
	'/js/script.js',
	'/js/router.js',
	'/js/gas.js',
	'/manifest.json',
	'/icons/icon-192.png',
	'/icons/icon-512.png'
];

// Khi chạy local (live-server) thì không dùng cache để khỏi bị "dính" code cũ
const IS_DEV = ['localhost', '127.0.0.1', '10.0.2.2'].includes(self.location.hostname)
	|| /^192\.168\./.test(self.location.hostname);

self.addEventListener('install', (event) => {
	self.skipWaiting();
	if (IS_DEV) return;
	event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
	event.waitUntil((async () => {
		// Xoá toàn bộ cache cũ (khác version hiện tại, hoặc xoá hết khi dev)
		const keys = await caches.keys();
		await Promise.all(keys.filter((k) => IS_DEV || k !== CACHE_NAME).map((k) => caches.delete(k)));
		await self.clients.claim();
	})());
});

// Network-first: luôn lấy bản mới nhất, chỉ dùng cache khi mất mạng
self.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET' || IS_DEV) return;
	if (new URL(req.url).origin !== self.location.origin) return; // không đụng tới Google Fonts, GAS...

	event.respondWith((async () => {
		try {
			const resp = await fetch(req, { cache: 'no-cache' });
			if (resp.ok) {
				const copy = resp.clone();
				caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
			}
			return resp;
		} catch (e) {
			return (await caches.match(req)) || (await caches.match('/index.html'));
		}
	})());
});