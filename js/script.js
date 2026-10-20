/* ==========================================================
 * CẤU HÌNH: dán URL Web App của Google Apps Script vào đây
 * (Deploy > New deployment > Web app > copy URL kết thúc bằng /exec)
 * Để trống = chạy chế độ demo (không gửi dữ liệu thật).
 * ========================================================== */
/*
 PWA Notes / Hướng dẫn PWA (để Chrome Android cài lên Home screen
 và chạy như app với icon + full screen):
 1) Thêm vào <head> của trang HTML (ví dụ index.html):
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#22c55e">
    <!-- các icon trong /icons/ phải có kích thước 192x192 và 512x512 -->

 2) Thêm nút cài đặt (nếu muốn hiển thị nút A2HS tùy chỉnh):
    <button id="installBtn" hidden>Thêm vào Màn hình chính</button>

 3) File manifest.json và service worker (sw.js) đã được thêm ở project root.
    - manifest.json: cấu hình name/short_name, start_url, display (fullscreen), icons...
    - sw.js: cache cơ bản và fetch handler để hoạt động offline / cảm giác app.

 4) Lưu ý: Chrome sẽ chỉ hiện prompt 'Add to Home screen' khi có
    - trang được phục vụ qua HTTPS (hoặc localhost)
    - có manifest.json hợp lệ
    - có service worker đăng ký

 Các thay đổi trong script.js: đăng ký service worker và xử lý sự kiện
 beforeinstallprompt để hiển thị nút cài đặt (nếu tồn tại element #installBtn).
*/
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyuic8IdZM4eNzLO5s7fHqbWHO2sNYWd7718iyoxMBOiPM7smNHHvB-SyuCOY5XDCt4/exec";
// Debug: confirm script loaded and current path (remove this after debugging)
console.log('script.js loaded — location.pathname=', location.pathname);
/* Login init - will run on root path */
function initLogin() {
	const $ = id => document.getElementById(id);
	const loginBtn = $('loginBtn');
	const loginError = $('loginError');
	const spinner = $('loginSpinner');
	if(!loginBtn) return;
	// Đã đăng nhập trước đó thì chuyển thẳng tới trang tương ứng
	if(window.appNavigate && localStorage.getItem('username') && localStorage.getItem('password')) {
		window.appNavigate(localStorage.getItem('role') === 'admin' ? '/admin' : '/rating');
		return;
	}
	loginBtn.addEventListener('click', () => {
		const username = ($('username') && $('username').value || '').trim();
		const password = $('password') && $('password').value || '';
		doLogin(username, password);
	});
	async function doLogin(username, password) {
		loginError && (loginError.style.display = 'none');
		if(!username || !password) {
			if(loginError) {
				loginError.textContent = 'Vui lòng nhập tên đăng nhập và mật khẩu.';
				loginError.style.display = 'block';
			}
			return;
		}
		loginBtn.disabled = true;
		if(spinner) spinner.style.display = 'inline-block';
		try {
			const res = await fetch(APPS_SCRIPT_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'text/plain;charset=utf-8'
				},
				body: JSON.stringify({
					action: 'login',
					username,
					password
				})
			});
			const data = await res.json();
			console.log(data)
			if(data.ok) {
				localStorage.setItem('position', username);
				localStorage.setItem('positionName', data.name);
				localStorage.setItem('username', username);
				localStorage.setItem('password', password);
				localStorage.setItem('role', data.role || '');
				
				if(data.role === 'admin') {
					window.appNavigate('/admin');
				} else {
					window.appNavigate('/rating');
				}
			} else {
				if(loginError) {
					loginError.textContent = data.error || 'Đăng nhập thất bại.';
					loginError.style.display = 'block';
				}
			}
		} catch(err) {
			console.error('Login error:', err);
			if(loginError) {
				const msg = (err && err.message) ? err.message : 'Lỗi kết nối. Vui lòng thử lại.';
				loginError.textContent = msg;
				loginError.style.display = 'block';
			}
		} finally {
			loginBtn.disabled = false;
			if(spinner) spinner.style.display = 'none';
		}
	}
}
// Boot login only when no client router is present. When using the router,
// the router will call initLogin() after it injects the login template.
if (!window.appNavigate) {
	if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLogin);
	else initLogin();
}
const LEVELS = [{
	value: 1,
	label: "Rất không hài lòng",
	thanks: "Chúng tôi rất tiếc về trải nghiệm này và sẽ cải thiện ngay.",
	color: "#ef4444"
}, {
	value: 2,
	label: "Không hài lòng",
	thanks: "Cảm ơn bạn đã chia sẻ, chúng tôi sẽ cố gắng tốt hơn.",
	color: "#f97316"
}, {
	value: 3,
	label: "Bình thường",
	thanks: "Cảm ơn bạn! Chúng tôi sẽ nỗ lực để bạn hài lòng hơn.",
	color: "#eab308"
}, {
	value: 4,
	label: "Hài lòng",
	thanks: "Rất vui vì bạn hài lòng với dịch vụ của chúng tôi!",
	color: "#84cc16"
}, {
	value: 5,
	label: "Rất hài lòng",
	thanks: "Tuyệt vời! Cảm ơn bạn đã tin tưởng và ủng hộ.",
	color: "#22c55e"
}, ];
/* ---------- Icon khuôn mặt (SVG) ---------- */
function faceSVG(level, color) {
	const ink = "#3b2f1c";
	const parts = {
		1: `<path d="M16 22 L27 26 M48 22 L37 26" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>
        <circle cx="22" cy="31" r="3" fill="${ink}"/><circle cx="42" cy="31" r="3" fill="${ink}"/>
        <path d="M20 49 Q32 38 44 49" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>`,
		2: `<circle cx="22" cy="28" r="3" fill="${ink}"/><circle cx="42" cy="28" r="3" fill="${ink}"/>
        <path d="M22 46 Q32 40 42 46" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>`,
		3: `<circle cx="22" cy="28" r="3" fill="${ink}"/><circle cx="42" cy="28" r="3" fill="${ink}"/>
        <path d="M22 44 H42" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>`,
		4: `<circle cx="22" cy="27" r="3" fill="${ink}"/><circle cx="42" cy="27" r="3" fill="${ink}"/>
        <path d="M20 39 Q32 53 44 39" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>`,
		5: `<path d="M16 28 Q22 20 28 28 M36 28 Q42 20 48 28" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M17 37 Q32 60 47 37 Z" fill="${ink}" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M24 46 Q32 52 40 46 Q32 43 24 46 Z" fill="#f87171"/>`,
	};
	return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="32" cy="32" r="29" fill="${color}"/>
    <circle cx="32" cy="32" r="29" fill="url(#g${level})" opacity=".35"/>
    <defs><radialGradient id="g${level}" cx="35%" cy="25%" r="75%">
      <stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient></defs>
    ${parts[level]}
  </svg>`;
}
const isRatingPage = location.pathname === '/rating' || location.pathname === '/rating/' || location.pathname.endsWith('/rating.html');

function initRatingApp() {
	/* ---------- DOM ---------- */
	const $ = (id) => document.getElementById(id);
	const ratingEl = $("rating"),
		pickedEl = $("pickedLabel"),
		extraEl = $("extra");
	const commentEl = $("comment"),
		countEl = $("count"),
		errorEl = $("error");
	const submitBtn = $("submitBtn"),
		stepRate = $("stepRate"),
		stepDone = $("stepDone");
	let selected = null;
	let submitting = false;
	/* Nếu các phần tử không tồn tại, thoát (tránh lỗi khi chạy trên trang login) */
	if(!ratingEl || !submitBtn) return;
	/* ---------- Dựng 5 nút ---------- */
	LEVELS.forEach((lv) => {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = "rate-btn";
		btn.setAttribute("role", "radio");
		btn.setAttribute("aria-checked", "false");
		btn.setAttribute("aria-label", lv.label);
		btn.dataset.value = lv.value;
		btn.style.setProperty("--c", lv.color);
		btn.innerHTML = faceSVG(lv.value, lv.color) + `<span class="lbl">${lv.label}</span>`;
		btn.addEventListener("click", () => select(lv.value));
		ratingEl.appendChild(btn);
	});
	/* ---------- Logic chọn ---------- */
	function select(value) {
		selected = value;
		const lv = LEVELS[value - 1];
		ratingEl.querySelectorAll(".rate-btn").forEach((b) => {
			b.setAttribute("aria-checked", String(Number(b.dataset.value) === value));
		});
		pickedEl.textContent = lv.label;
		pickedEl.classList.add("has");
		extraEl.hidden = false;
		// allow page/card scrolling on tablet when comment box appears
		document.body.classList.add('allow-scroll');
		// scroll the comment into view for better UX on small screens
		setTimeout(() => {
			if(commentEl && typeof commentEl.scrollIntoView === 'function') {
				try { commentEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(e) { commentEl.scrollIntoView(); }
			}
		}, 120);
		submitBtn.disabled = false;
		hideError();
	}
	// Điều hướng bàn phím bằng phím mũi tên
	ratingEl.addEventListener("keydown", (e) => {
		if(!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
		e.preventDefault();
		const dir = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
		const next = Math.min(5, Math.max(1, (selected || (dir > 0 ? 0 : 6)) + dir));
		select(next);
		ratingEl.querySelector(`[data-value="${next}"]`).focus();
	});
	commentEl && commentEl.addEventListener("input", () => {
		countEl.textContent = commentEl.value.length;
	});
	/* ---------- Gửi dữ liệu ---------- */
	submitBtn.addEventListener("click", async() => {
		if(!selected || submitting) return;
		submitting = true;
		submitBtn.disabled = true;
		submitBtn.classList.add("loading");
		hideError();
		const params = new URLSearchParams(location.search);
		const payload = {
			rating: selected,
			label: LEVELS[selected - 1].label,
			comment: commentEl.value.trim(),
			name: "",
			position: localStorage.getItem("position") || "",
			positionName: localStorage.getItem("positionName") || ""
		};
		try {
			if(!APPS_SCRIPT_URL) {
				await new Promise((r) => setTimeout(r, 700)); // chế độ demo
			} else {
				// text/plain để tránh preflight CORS với Apps Script
				const res = await fetch(APPS_SCRIPT_URL, {
					method: "POST",
					headers: {
						"Content-Type": "text/plain;charset=utf-8"
					},
					body: JSON.stringify(payload),
				});
				const data = await res.json();
				if(!data.ok) throw new Error(data.error || "Gửi thất bại");
			}
			showDone();
		} catch(err) {
			showError("Không gửi được đánh giá. Vui lòng kiểm tra mạng và thử lại.");
			submitBtn.disabled = false;
		} finally {
			submitting = false;
			submitBtn.classList.remove("loading");
		}
	});
	let _countdownTimer = null;

	function showDone() {
		const lv = LEVELS[selected - 1];
		$("doneIcon").innerHTML = faceSVG(lv.value, lv.color);
		$("doneMsg").textContent = lv.thanks;
		// Hiển thị màn hình cảm ơn
		stepRate.hidden = true;
		stepDone.hidden = false;
		// Bắt đầu đếm ngược 15s, hiển thị giảm dần, sau đó tự quay về giao diện đánh giá
		clearCountdown();
		let remaining = 15;
		const countdownEl = $("countdown");
		if(countdownEl) countdownEl.textContent = String(remaining);
		_countdownTimer = setInterval(() => {
			remaining -= 1;
			if(countdownEl) countdownEl.textContent = String(remaining);
			if(remaining <= 0) {
				clearCountdown();
				// Tự động reset về giao diện đánh giá
				resetToRating();
			}
		}, 1000);
	}

	function clearCountdown() {
		if(_countdownTimer) {
			clearInterval(_countdownTimer);
			_countdownTimer = null;
		}
	}

	function resetToRating() {
		clearCountdown();
		selected = null;
		commentEl.value = "";
		countEl.textContent = "0";
		pickedEl.textContent = "Hãy chọn một mức đánh giá";
		pickedEl.classList.remove("has");
		extraEl.hidden = true;
		// remove scroll allowance when comment hidden
		document.body.classList.remove('allow-scroll');
		submitBtn.disabled = true;
		ratingEl.querySelectorAll(".rate-btn").forEach((b) => b.setAttribute("aria-checked", "false"));
		stepDone.hidden = true;
		stepRate.hidden = false;
	}
	$("againBtn") && $("againBtn").addEventListener("click", () => {
		// Dừng đếm ngược (nếu đang chạy) và reset giao diện
		resetToRating();
	});

	function showError(msg) {
		errorEl.textContent = msg;
		errorEl.hidden = false;
	}

	function hideError() {
		errorEl.hidden = true;
	}
}
if(isRatingPage) {
	if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initRatingApp);
	else initRatingApp();
} else {
	console.log('Not rating page, skipping rating app init');
}
/* ---------------- PWA: Service Worker + Install prompt handler ---------------- */
// Đăng ký Service Worker (sw.js) - dùng để cache và cho phép cài A2HS
if('serviceWorker' in navigator) {
	navigator.serviceWorker.register('/sw.js').then((reg) => console.log('ServiceWorker registered, scope:', reg.scope)).catch((err) => console.warn('ServiceWorker registration failed:', err));
}
// Xử lý Before Install Prompt để show custom install button nếu có
let deferredPrompt = null;
const installBtn = $("installBtn");
if(installBtn) installBtn.hidden = true;
window.addEventListener('beforeinstallprompt', (e) => {
	e.preventDefault(); // chặn prompt mặc định để show custom UI
	deferredPrompt = e;
	if(installBtn) {
		installBtn.hidden = false;
		const onClick = async() => {
			installBtn.hidden = true;
			deferredPrompt.prompt();
			const choice = await deferredPrompt.userChoice;
			console.log('A2HS choice:', choice);
			deferredPrompt = null;
			installBtn.removeEventListener('click', onClick);
		};
		installBtn.addEventListener('click', onClick);
	}
});
// Bắt sự kiện khi app đã cài
window.addEventListener('appinstalled', (evt) => {
	console.log('PWA installed', evt);
	if(installBtn) installBtn.hidden = true;
});
/* -------------------------------------------------------------------------------- */
// Admin page logic moved from html/admin.html into script.js
function initAdmin() {
	const periodSelect = document.getElementById('periodSelect');
	const refreshBtn = document.getElementById('refreshBtn');
	const recordsTableBody = document.querySelector('#recordsTable tbody');
	const countsEl = document.getElementById('counts');
	if(!periodSelect || !refreshBtn || !recordsTableBody) return;
	async function fetchRecords(period) {
		if (!APPS_SCRIPT_URL) {
			return { ok: false, error: 'APPS_SCRIPT_URL not configured' };
		}
		const payload = { action: 'records', period: period };
		let res;
		try {
			res = await fetch(APPS_SCRIPT_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'text/plain;charset=utf-8' },
				body: JSON.stringify(payload),
				cache: 'no-cache'
			});
		} catch (networkErr) {
			console.error('Network error when fetching records:', networkErr);
			throw networkErr;
		}

		// Non-2xx responses — try to read text for diagnostics
		if (!res.ok) {
			let text = '';
			try { text = await res.text(); } catch (e) { text = ''; }
			return { ok: false, error: `HTTP ${res.status} ${res.statusText}` + (text ? ': ' + text : '') };
		}

		// Parse JSON safely
		try {
			const json = await res.json();
			return json;
		} catch (e) {
			console.error('Failed to parse JSON from APPS_SCRIPT_URL response', e);
			let text = '';
			try { text = await res.text(); } catch (err) { /* ignore */ }
			return { ok: false, error: 'Invalid JSON response from server' + (text ? ': ' + text : '') };
		}
	}

	function escapeHtml(s) {
			if (s === null || s === undefined) return '';
			if (typeof s === 'object') {
				try { s = JSON.stringify(s); } catch (e) { s = String(s); }
			}
			return String(s).replace(/[&<>"']/g, function(c) {
				return {
					'&': '&amp;',
					'<': '&lt;',
					'>': '&gt;',
					'"': '&quot;',
					"'": '&#39;'
				}[c];
			});
		}

	function renderGroups(groups) {
		// groups: [{ position, total, avg, counts: {1:..} }, ...]
			const table = recordsTableBody.parentElement;
			const oldHead = table.querySelector('thead');
			if(oldHead) oldHead.remove();
			recordsTableBody.innerHTML = '';
			if (!groups || !groups.length) {
				recordsTableBody.innerHTML = '<tr class="empty-row"><td colspan="7">Không có dữ liệu</td></tr>';
				return;
			}
			groups.sort((a,b) => (b.total || 0) - (a.total || 0));
			const labels = ['Rất không hài lòng', 'Không hài lòng', 'Bình thường', 'Hài lòng', 'Rất hài lòng'];
			const thead = document.createElement('thead');
			thead.innerHTML = '<tr><th class="col-name">Quầy</th>' +
				labels.map(l => `<th>${l}</th>`).join('') + '<th>Tổng</th></tr>';
			table.insertBefore(thead, recordsTableBody);
			groups.forEach(g => {
				const tr = document.createElement('tr');
				const cells = [1,2,3,4,5].map((n, i) =>
					`<td data-label="${labels[i]}">${(g.counts && g.counts[n])||0}</td>`).join('');
				tr.innerHTML = `<td class="col-name" data-label="Quầy">${escapeHtml(g.displayName)}</td>` +
					cells + `<td class="col-total" data-label="Tổng">${g.total||0}</td>`;
				recordsTableBody.appendChild(tr);
			});
		}

	async function loadAndRender() {
		refreshBtn.disabled = true;
		refreshBtn.textContent = 'Đang tải...';

		try {
			const period = periodSelect.value;
			const res = await fetchRecords(period);
			console.log('Fetched records response:', res);
			if(res.ok) {
				renderGroups(res.groups || []);
			} else {
				recordsTableBody.innerHTML = `<tr><td colspan="5" style="padding:12px;color:#ef4444">Lỗi: ${escapeHtml(res.error || 'Unknown')}</td></tr>`;
			}
		} catch(err) {
			console.error('Error loading records:', err);
			const msg = (err && err.message) ? err.message : 'Lỗi kết nối';
			recordsTableBody.innerHTML = `<tr><td colspan="5" style="padding:12px;color:#ef4444">Lỗi: ${escapeHtml(msg)}</td></tr>`;
		} finally {
			refreshBtn.disabled = false;
			refreshBtn.textContent = 'Làm mới';
		}
	}
	refreshBtn.addEventListener('click', loadAndRender);
	// initial load
	loadAndRender();
}
const isAdminPage = location.pathname.endsWith('/admin.html') || location.pathname === '/html/admin.html' || location.pathname === '/admin';
if(isAdminPage) {
	if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAdmin);
	else initAdmin();
}
/* -------------------------------------------------------------------------------- */