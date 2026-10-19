// Simple client-side router supporting history pushState and hash fallback.
// Routes:
//  - /         -> login (initial content in index.html)
//  - /rating   -> loads /html/rating.html and injects its <main> content, then calls initRatingApp()
//  - /admin    -> loads /html/admin.html and injects its <main> content, then calls initAdmin()
const Router = (function() {
	const routes = {};
	const containerId = 'app';
	const templates = {};

	function isFileProtocol() {
		return location.protocol === 'file:';
	}

	function saveInitialTemplate() {
		const app = document.getElementById(containerId);
		if(!app) return;
			templates['/'] = { html: app.innerHTML, id: app.id || containerId, className: app.className || '' };
	}
	async function fetchAndExtractMain(url) {
			const res = await fetch(url, { cache: 'no-cache' });
			if(!res.ok) throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
			const text = await res.text();
			const parser = new DOMParser();
			const doc = parser.parseFromString(text, 'text/html');
			const main = doc.querySelector('main');
			if(!main) throw new Error(`No <main> found in ${url}`);
			return { html: main.innerHTML, id: main.id || '', className: main.className || '' };
		}

		function renderHtml(html, attrs = {}) {
			const app = document.getElementById(containerId);
			if(!app) throw new Error('#app container not found');
			app.innerHTML = html;
			if(attrs.id) app.id = attrs.id; else app.id = containerId;
			app.className = attrs.className || '';
	}
	async function navigate(path, replace = false) {
		try {
			if(path === '/') {
				if(templates['/']) {
					renderHtml(templates['/'].html, { id: templates['/'].id, className: templates['/'].className });
				} else {
					renderHtml('<div><p>Trang chính</p></div>');
				}
				if(!replace) {
					if(isFileProtocol()) location.hash = '/';
					else history.pushState({}, '', '/');
				}
				// ensure login init runs
				if(typeof initLogin === 'function') initLogin();
				return;
			}

			if(path === '/rating') {
				const res = await fetchAndExtractMain('/html/rating.html');
				renderHtml(res.html, { id: res.id, className: res.className });
				if(!replace) {
					if(isFileProtocol()) location.hash = '/rating';
					else history.pushState({}, '', '/rating');
				}
				if(typeof initRatingApp === 'function') initRatingApp();
				return;
			}
			if(path === '/admin') {
				const res = await fetchAndExtractMain('/html/admin.html');
				renderHtml(res.html, { id: res.id, className: res.className });
				if(!replace) {
					if(isFileProtocol()) location.hash = '/admin';
					else history.pushState({}, '', '/admin');
				}
				if(typeof initAdmin === 'function') initAdmin();
				return;
			}
			// fallback: try /rating for unknown
			console.warn('Unknown route', path);
			navigate('/');
		} catch(err) {
			console.error('Router navigate error:', err);
			const app = document.getElementById(containerId);
			if(app) app.innerHTML = `<div style="padding:12px;color:#ef4444">Lỗi tải trang: ${err.message}</div>`;
		}
	}

	function interceptLinks() {
		document.addEventListener('click', function(e) {
			const a = e.target.closest && e.target.closest('a[data-route]');
			if(!a) return;
			e.preventDefault();
			const href = a.getAttribute('href') || a.dataset.href || '/';
			navigate(href);
		});
	}

	function start() {
		saveInitialTemplate();
		interceptLinks();
		window.addEventListener('popstate', () => {
			// When user clicks back/forward, render based on current pathname
			const p = isFileProtocol() ? (location.hash.replace(/^#/, '') || '/') : location.pathname || '/';
			navigate(p, true).catch(() => {});
		});
		// Handle hashchange when serving via file://
		window.addEventListener('hashchange', () => {
			if(!isFileProtocol()) return;
			const p = location.hash.replace(/^#/, '') || '/';
			navigate(p, true).catch(() => {});
		});
		// On load, determine route. Support file:// by using hash (#/admin)
		const initial = isFileProtocol() ? (location.hash.replace(/^#/, '') || '/') : location.pathname || '/';
		// Normalize: on file protocol pathname may contain entire filesystem, so prefer hash.
		navigate(initial, true).catch(() => {});
	}
	return {
		start, navigate
	};
})();
// Start router when DOM is ready
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', Router.start);
else Router.start();
// Expose navigate for other scripts
window.appNavigate = Router.navigate;