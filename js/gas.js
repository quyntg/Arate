const RECORD_SHEET_NAME = "record";
const USER_SHEET_NAME = "user";

function doPost(e) {
	// Parse request body safely
	let data = {};
	try {
		data = JSON.parse(e.postData.contents || '{}');
	} catch (err) {
		return json({ ok: false, error: 'Invalid JSON' });
	}

	// Fetch records or stats for admin
	if (data.action === 'records') {
		try {
			var ss = SpreadsheetApp.getActiveSpreadsheet();
			if (!ss) return json({ ok: false, error: 'Spreadsheet not available' });
			var sheet = ss.getSheetByName(RECORD_SHEET_NAME);
			if (!sheet) return json({ ok: false, error: 'Record sheet "' + RECORD_SHEET_NAME + '" not found' });

			var lastRow = sheet.getLastRow();

			// Read user sheet to gather desk users (username) — role must indicate 'desk' (case-insensitive)
			var userSheet = ss.getSheetByName(USER_SHEET_NAME);
			var deskUsers = []; // preserve order
			if (userSheet) {
				var uLast = userSheet.getLastRow();
				if (uLast >= 2) {
					var userRows = userSheet.getRange(2,2,uLast-1,4).getValues();
					userRows.forEach(function(ur){
						var username = String(ur[0] || '').trim();
						var displayName = String(ur[2] || '').trim();
						var role = String(ur[3] || '').trim().toLowerCase();
						if (!username) return;
						// treat as desk if role contains 'desk' or 'quay' (Vietnamese without diacritics) or 'quầy'
						if (role.indexOf('desk') !== -1 || role.indexOf('quay') !== -1 || role.indexOf('quầy') !== -1) {
							deskUsers.push({ username: username, name: displayName });
						}
					});
				}
			}

			// initialize groups from deskUsers (preserve order). If none, return empty list.
			if (!deskUsers.length) return json({ ok: true, groups: [] });
			var groups = {};
			deskUsers.forEach(function(u){ groups[u.username] = { position: u.username, displayName: u.name || '', total:0, sum:0, counts: {1:0,2:0,3:0,4:0,5:0} }; });

			// If no records exist, return zeroed groups corresponding to desk users
			if (lastRow < 2) {
				var emptyGroups = deskUsers.map(function(u){ return { position: u.username, displayName: u.name || '', total:0, avg:0, counts: {1:0,2:0,3:0,4:0,5:0} }; });
				return json({ ok: true, groups: emptyGroups });
			}

			var values = sheet.getRange(2,1,lastRow-1,8).getValues();
			var rows = values.map(function(r){
				var rec = { position:'', positionName:'', rating: null, timestamp: null };
				if (r.length >= 8) {
					rec.position = String(r[2] || '').trim();
					rec.positionName = String(r[3] || '').trim();
					rec.rating = Number(r[4]);
					var ts = r[7];
				} else {
					rec.position = '';
					rec.positionName = '';
					rec.rating = Number(r[2]);
					var ts = r[5];
				}
				// normalize timestamp like before
				if ((ts === undefined || ts === null || ts === '') && r.length > 0) ts = r[r.length - 1];
				try {
					if (ts instanceof Date) rec.timestamp = ts.toISOString();
					else if (typeof ts === 'number') rec.timestamp = new Date(ts).toISOString();
					else if (typeof ts === 'string') {
						var d = new Date(ts);
						if (!isNaN(d.getTime())) rec.timestamp = d.toISOString();
						else {
							var m = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
							if (m) rec.timestamp = new Date(parseInt(m[3],10), parseInt(m[2],10)-1, parseInt(m[1],10), parseInt(m[4],10), parseInt(m[5],10), parseInt(m[6]||'0',10)).toISOString();
							else rec.timestamp = new Date(ts).toISOString();
						}
					}
				} catch(e) { rec.timestamp = null; }
				return rec;
			});

			// apply period filter if provided: 'week','month','year' or 'all'
			var period = String(data.period || '').toLowerCase();
			var filtered = rows;
			if (period && period !== 'all') {
				var now = new Date();
				var start;
				if (period === 'week') {
					var day = now.getDay();
					var diff = (day + 6) % 7;
					start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
					start.setHours(0,0,0,0);
				} else if (period === 'month') {
					start = new Date(now.getFullYear(), now.getMonth(), 1); start.setHours(0,0,0,0);
				} else if (period === 'year') { start = new Date(now.getFullYear(), 0, 1); start.setHours(0,0,0,0); }
				if (start) filtered = rows.filter(function(r){ return r.timestamp && new Date(r.timestamp) >= start; });
			}

			// Count into groups based on username match
			filtered.forEach(function(r){
				var rating = Number(r.rating) || 0;
				if (rating >=1 && rating <=5) {
					var matchedUser = null;
					for (var i=0;i<deskUsers.length;i++) {
						var u = deskUsers[i].username;
						if (r.position === u || r.positionName === u) { matchedUser = u; break; }
					}
					if (matchedUser) {
						var g = groups[matchedUser];
						g.counts[rating] = (g.counts[rating] || 0) + 1;
						g.total += 1;
						g.sum += rating;
					}
				}
			});

			// Convert groups object to array preserving deskUsers order
			var groupsArr = deskUsers.map(function(u){
				var g = groups[u.username];
				return { position: g.position, displayName: g.displayName || '', total: g.total, avg: g.total ? Number((g.sum / g.total).toFixed(2)) : 0, counts: g.counts };
			});

			return json({ ok: true, groups: groupsArr });
		} catch (err) {
			return json({ ok: false, error: String(err) });
		}
	}

	// Login action: read users from sheet USER_SHEET_NAME
	if (data.action === 'login') {
		try {
			var username = String(data.username || '').trim();
			var password = String(data.password || '');
			if (!username || !password) return json({ ok: false, error: 'Thiếu tên đăng nhập hoặc mật khẩu.' });

			// Read user sheet; if missing, create with default admin/password
			var ss = SpreadsheetApp.getActiveSpreadsheet();
			if (!ss) return json({ ok: false, error: 'Spreadsheet not available' });
			var userSheet = ss.getSheetByName(USER_SHEET_NAME);
			if (!userSheet) {
				return json({ ok: false, error: 'User sheet "' + USER_SHEET_NAME + '" not found' });
			}

			var lastRow = userSheet.getLastRow();
			var users = [];
			if (lastRow >= 2) {
				var rows = userSheet.getRange(2,2,lastRow-1,4).getValues();
				rows.forEach(function(r){
					var u = String(r[0]||'').trim();
					var p = String(r[1]||'');
					var n = String(r[2]||'').trim();
					var r = String(r[3]||'').trim();
					
					if (u) users.push({ username: u, password: p, name: n, role: r });
				});
			}

			var user = users.find(u => u.username === username && u.password === password);
			if (user) {
				return json({ ok: true, name: user.name, role: user.role });
			} else {
				return json({ ok: false, error: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
			}
		} catch (err) {
			return json({ ok: false, error: String(err) });
		}
	}

	// Nếu không phải login, xử lý đánh giá (ghi vào sheet RECORD_SHEET_NAME) — dùng lock để tránh race
	const lock = LockService.getScriptLock();
	try {
		lock.waitLock(10000);

		const rating = Number(data.rating);
		if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
			return json({ ok: false, error: "Điểm đánh giá không hợp lệ" });
		}

		const labels = ["Rất không hài lòng", "Không hài lòng", "Bình thường", "Hài lòng", "Rất hài lòng"];
		const comment = String(data.comment || "").slice(0, 500);
		const name = String(data.name || "").slice(0, 100);
		const position = String(data.position || "").slice(0, 100);
		const positionName = String(data.positionName || "").slice(0, 100);

		// Ensure record sheet exists and has header
		var ss = SpreadsheetApp.getActiveSpreadsheet();
		if (!ss) return json({ ok: false, error: 'Spreadsheet not available' });
		var sheet = ss.getSheetByName(RECORD_SHEET_NAME);
		if (!sheet) {
			return json({ ok: false, error: 'Record sheet "' + RECORD_SHEET_NAME + '" not found' });
		}

		const lastRow = sheet.getLastRow();
		let nextId = 1;
		if (lastRow >= 2) {
			const idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
			const numericIds = idValues.map(v => Number(v)).filter(n => Number.isFinite(n) && n > 0);
			if (numericIds.length) nextId = Math.max.apply(null, numericIds) + 1;
		}

		sheet.appendRow([nextId, name, position, positionName, rating, labels[rating - 1], comment, new Date()]);
		return json({ ok: true });
	} catch (err) {
		return json({ ok: false, error: String(err) });
	} finally {
		try { lock.releaseLock(); } catch (e) { /* ignore */ }
	}
}

/** Mở URL /exec trực tiếp để xem thống kê nhanh. */
function doGet() {
	var ss = SpreadsheetApp.getActiveSpreadsheet();
	if (!ss) return json({ ok: false, error: 'Spreadsheet not available' });
	var sheet = ss.getSheetByName(RECORD_SHEET_NAME);
		if (!sheet) return json({ ok: false, error: 'Record sheet "' + RECORD_SHEET_NAME + '" not found' });

	const lastRow = sheet.getLastRow();
	const rows = lastRow > 1 ?
		sheet.getRange(2, 3, lastRow - 1, 1).getValues().flat() :
		[];
	const counts = {1:0,2:0,3:0,4:0,5:0};
	rows.forEach((v) => { if (counts[v] !== undefined) counts[v]++; });
	const total = rows.length;
	const avg = total ? rows.reduce((a,b)=>a+Number(b),0)/total : 0;
	return json({ ok: true, total: total, average: Number(avg.toFixed(2)), counts: counts });
}

function json(obj) {
	return ContentService.createTextOutput(JSON.stringify(obj))
		.setMimeType(ContentService.MimeType.JSON);
}


