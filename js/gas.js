const RECORD_SHEET_NAME = "record";
const USER_SHEET_NAME = "user";

function doPost(e) {
	// Parse request body safely
	let data = {};

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
				var rows = userSheet.getRange(2,2,lastRow-1,2).getValues();
				rows.forEach(function(r){
					var u = String(r[0]||'').trim();
					var p = String(r[1]||'');
					
					if (u) users.push({ username: u, password: p });
				});
			}

			var user = users.find(u => u.username === username && u.password === password);
			if (user) {
				return json({ ok: true, name: username });
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

		sheet.appendRow([nextId, name, rating, labels[rating - 1], comment, new Date()]);
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


