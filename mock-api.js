/**
 * TẦNG DỮ LIỆU HỆ THỐNG: FIREBASE CLOUD FIRESTORE (DỰ PHÒNG LOCALSTORAGE)
 * Tự động kết nối Cloud Firestore theo APP_CONFIG.FIREBASE_CONFIG;
 * nếu chưa bật Firestore / mất kết nối / bị chặn Rules sẽ dự phòng localStorage và báo trạng thái ở Trang Quản trị.
 */
const MOCK_API = (function () {
  const STORAGE_KEY = 'CBSV2_MOCK_DB_2026';
  const FIREBASE_SDK_VERSION = '10.14.1';
  const ADMIN_PASSWORD = 'CBSV2@2026';
  function isValidAdminPassword(pw) {
    const val = String(pw || '').trim().toUpperCase();
    return val === 'CBSV1@2026' || val === 'CBSV2@2026';
  }

  const DEFAULT_DB = {
    links: {
      LINK_TAI_TOAN_BO: 'https://drive.google.com/drive/folders/1HdAXZk1ICDzdfEHEeUZzgPzKh1KyhA8F?usp=drive_link',
      LINK_HUONG_DAN_CHUNG: 'https://drive.google.com/drive/folders/10Gj3oaZr0f9L4z04fPnS6B1d98ME1hzl?usp=drive_link',
      LINK_TAI_MAU_02C: 'https://drive.google.com/file/d/sample-02c',
      LINK_HUONG_DAN_02C: 'https://drive.google.com/file/d/1tjFE-XVZ_tsDK4ErgR8wPYgcyfXsOJ4H/view?usp=sharing',
      LINK_TAI_MAU_6B: 'https://drive.google.com/file/d/sample-6b',
      LINK_HUONG_DAN_6B: 'https://drive.google.com/file/d/1ov4IDfYEyTgpeY2oipquI8aae5OGRg_R/view?usp=drive_link',
      LINK_TAI_MAU_6D: 'templates/mau-6d.doc',
      LINK_HUONG_DAN_6D: '',
      DEADLINE_KE_KHAI_ISO: '2026-11-19T20:00',
      DEADLINE_KE_KHAI_TEXT: '20h00 - Thứ 5, ngày 19/11/2026',
      DEADLINE_NOP_HO_SO_TEXT: 'Sáng Chủ nhật, ngày 22/11/2026'
    },
    members: [],
    submissions: {},
    docLogs: [],
    docDrafts: {}
  };

  const DEMO_MSSVS = new Set(['231121012345', '241125009988', '261121005201']);

  let firestoreInitPromise = null;
  let cachedFirestore = null;

  function normalizeLinks(rawLinks) {
    const merged = Object.assign({}, DEFAULT_DB.links, rawLinks || {});
    if (!merged.LINK_TAI_TOAN_BO || String(merged.LINK_TAI_TOAN_BO).includes('sample')) {
      merged.LINK_TAI_TOAN_BO = DEFAULT_DB.links.LINK_TAI_TOAN_BO;
    }
    if (!merged.LINK_HUONG_DAN_CHUNG || String(merged.LINK_HUONG_DAN_CHUNG).includes('sample')) {
      merged.LINK_HUONG_DAN_CHUNG = DEFAULT_DB.links.LINK_HUONG_DAN_CHUNG;
    }
    if (!merged.DEADLINE_KE_KHAI_ISO) {
      merged.DEADLINE_KE_KHAI_ISO = DEFAULT_DB.links.DEADLINE_KE_KHAI_ISO;
    }
    if (!merged.DEADLINE_KE_KHAI_TEXT) {
      merged.DEADLINE_KE_KHAI_TEXT = DEFAULT_DB.links.DEADLINE_KE_KHAI_TEXT;
    }
    if (!merged.DEADLINE_NOP_HO_SO_TEXT) {
      merged.DEADLINE_NOP_HO_SO_TEXT = DEFAULT_DB.links.DEADLINE_NOP_HO_SO_TEXT;
    }
    return merged;
  }

  function getLocalDb() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.links = normalizeLinks(parsed.links);
        const rawMembers = Array.isArray(parsed.members) ? parsed.members : [];
        const rawSubs = parsed.submissions && typeof parsed.submissions === 'object' ? parsed.submissions : {};
        const rawLogs = Array.isArray(parsed.docLogs) ? parsed.docLogs : [];
        parsed.docDrafts = parsed.docDrafts && typeof parsed.docDrafts === 'object' ? parsed.docDrafts : {};

        let changed = false;
        parsed.members = rawMembers.filter(m => {
          const isDemo = m && DEMO_MSSVS.has(String(m.mssv || '').trim());
          if (isDemo) changed = true;
          return !isDemo;
        });

        parsed.submissions = {};
        Object.keys(rawSubs).forEach(k => {
          if (DEMO_MSSVS.has(String(k).trim())) {
            changed = true;
          } else {
            parsed.submissions[k] = rawSubs[k];
          }
        });

        parsed.docLogs = rawLogs.filter(l => {
          const isDemo = l && DEMO_MSSVS.has(String(l.mssv || '').trim());
          if (isDemo) changed = true;
          return !isDemo;
        });

        if (changed) {
          saveLocalDb(parsed);
        }
        return parsed;
      }
    } catch (e) {}
    const fresh = JSON.parse(JSON.stringify(DEFAULT_DB));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch (e) {}
    return fresh;
  }

  function saveLocalDb(db) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {}
  }

  function parseDateVN(str) {
    const m = String(str || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    return new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
  }

  function isDu6Thang(ngayVaoDang) {
    const d = parseDateVN(ngayVaoDang);
    if (!d) return false;
    return d.getTime() <= new Date(2026, 4, 21, 23, 59, 59).getTime();
  }

  function nowVN() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function docSafeId(val) {
    return String(val || '').trim().replace(/\//g, '_');
  }

  function formatFirebaseError(err) {
    if (!err) return 'Lỗi không xác định khi kết nối Firebase.';
    const code = err.code ? `[${err.code}] ` : '';
    return code + (err.message || String(err));
  }

  function withTimeout(promise, ms, timeoutMessage) {
    let timerId;
    const timeoutPromise = new Promise((_, reject) => {
      timerId = setTimeout(() => reject(new Error(timeoutMessage || 'Quá thời gian kết nối Firebase Firestore.')), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timerId));
  }

  function isFirebaseEnabled() {
    return (
      typeof APP_CONFIG !== 'undefined' &&
      APP_CONFIG.USE_FIREBASE === true &&
      APP_CONFIG.FIREBASE_CONFIG &&
      Boolean(APP_CONFIG.FIREBASE_CONFIG.projectId)
    );
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        return reject(new Error('Môi trường không hỗ trợ tải Firebase SDK.'));
      }
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.getAttribute('data-loaded') === 'true') return resolve();
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Không thể tải SDK: ' + src)), { once: true });
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = () => {
        s.setAttribute('data-loaded', 'true');
        resolve();
      };
      s.onerror = () => reject(new Error('Không thể tải SDK: ' + src));
      document.head.appendChild(s);
    });
  }

  async function getFirestoreDb() {
    if (!isFirebaseEnabled()) return null;
    if (cachedFirestore) return cachedFirestore;
    if (!firestoreInitPromise) {
      firestoreInitPromise = (async () => {
        if (typeof window.firebase === 'undefined' || !window.firebase.firestore) {
          await loadScript(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app-compat.js`);
          await loadScript(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore-compat.js`);
        }
        if (!window.firebase.apps || window.firebase.apps.length === 0) {
          window.firebase.initializeApp(APP_CONFIG.FIREBASE_CONFIG);
        }
        cachedFirestore = window.firebase.firestore();
        return cachedFirestore;
      })().catch(err => {
        firestoreInitPromise = null;
        throw err;
      });
    }
    return firestoreInitPromise;
  }

  function pickCol(item, exactKeys, keywordSubstrings) {
    if (!item || typeof item !== 'object') return '';
    const rawKeys = Object.keys(item);
    if (Array.isArray(exactKeys)) {
      for (let i = 0; i < exactKeys.length; i++) {
        const target = exactKeys[i].trim().toLowerCase();
        const foundKey = rawKeys.find(k => k.trim().toLowerCase() === target);
        if (foundKey !== undefined && String(item[foundKey] ?? '').trim() !== '') {
          return String(item[foundKey]).trim();
        }
      }
    }
    if (Array.isArray(keywordSubstrings)) {
      for (let i = 0; i < keywordSubstrings.length; i++) {
        const kw = keywordSubstrings[i].toLowerCase();
        const foundKey = rawKeys.find(k => k.trim().toLowerCase().includes(kw));
        if (foundKey !== undefined && String(item[foundKey] ?? '').trim() !== '') {
          return String(item[foundKey]).trim();
        }
      }
    }
    return '';
  }

  function sanitizeMemberRow(item, fallbackStt, existingMember) {
    const mssv = pickCol(item, ['mssv'], ['mssv']);
    const prevSoTdv = existingMember && existingMember.soTDV ? existingMember.soTDV : '';
    const rawSoTdv = pickCol(
      item,
      ['soTDV', 'Số thẻ Đảng viên', 'Số Thẻ Đảng viên', 'Số thẻ Đảng'],
      ['số thẻ đảng', 'số thẻ', 'tđv']
    ) || prevSoTdv;
    return {
      stt: pickCol(item, ['stt'], []) || String(fallbackStt || '').trim(),
      hoTen: pickCol(item, ['hoTen', 'Họ tên', 'Họ và tên'], ['họ tên', 'họ và tên']),
      mssv,
      ngaySinh: pickCol(item, ['ngaySinh', 'Ngày sinh'], ['ngày sinh']),
      gioiTinh: pickCol(item, ['gioiTinh', 'Giới tính'], ['giới tính']),
      cccd: pickCol(item, ['cccd'], ['cccd']),
      lop: pickCol(item, ['lop', 'Lớp'], ['lớp']),
      khoa: pickCol(item, ['khoa', 'Khoa', 'Khoa/Trung tâm'], ['khoa']),
      nhom: pickCol(item, ['nhom', 'Nhóm sinh hoạt', 'Nhóm'], ['nhóm sinh hoạt', 'nhóm']),
      ngayVaoDang: pickCol(item, ['ngayVaoDang', 'Ngày vào Đảng'], ['ngày vào đảng']),
      ngayChinhThuc: pickCol(item, ['ngayChinhThuc', 'Ngày chính thức'], ['ngày chính thức']),
      loaiDangVien: pickCol(item, ['loaiDangVien', 'Loại Đảng viên (Dự bị / Chính thức)', 'Loại Đảng viên'], ['loại đảng viên']),
      diaChiHienTai: pickCol(
        item,
        ['diaChiHienTai', 'Địa chỉ hiện tại', 'Địa chỉ hiện tại đang ở(Nơi đã nộp Giấy 221', 'Địa chỉ hiện tại đang ở(Nơi đã nộp Giấy 221)', 'Nơi ở hiện nay'],
        ['địa chỉ hiện tại', 'nơi đã nộp giấy 221', 'nơi ở hiện nay']
      ),
      chiBoCuTru: pickCol(
        item,
        ['chiBoCuTru', 'Chi bộ nơi cư trú', 'Chi bộ nơi cư trú (221)', 'Chi bộ Sinh hoạt nơi cư trú'],
        ['chi bộ nơi cư trú', 'sinh hoạt nơi cư trú', 'nơi cư trú (221)']
      ),
      dangBoPhuongXa: pickCol(
        item,
        ['dangBoPhuongXa', 'Đảng bộ phường/xã', 'Đảng bộ phường xã', 'Đảng bộ nơi cư trú'],
        ['đảng bộ phường', 'đảng bộ xã', 'đảng bộ nơi cư trú']
      ),
      soTDV: String(rawSoTdv || '').trim()
    };
  }

  function buildSubmissionObj(p, member) {
    return {
      mssv: member.mssv,
      thoiGianGui: nowVN(),
      chiBoCuTru: String(p.chiBoCuTru || ''),
      dangBoPhuongXa: String(p.dangBoPhuongXa || ''),
      noiOHienNay: String(p.noiOHienNay || ''),
      kqHocTapHK1: String(p.kqHocTapHK1 || ''),
      kqRenLuyenHK1: String(p.kqRenLuyenHK1 || ''),
      kqHocTapHK2: String(p.kqHocTapHK2 || ''),
      kqRenLuyenHK2: String(p.kqRenLuyenHK2 || ''),
      thanhTichList: Array.isArray(p.thanhTichList) ? p.thanhTichList : [],
      dongGopList: Array.isArray(p.dongGopList) ? p.dongGopList : [],
      tuXepLoai: isDu6Thang(member.ngayVaoDang)
        ? String(p.tuXepLoai || '')
        : 'Chưa đủ 6 tháng - Không thực hiện tự đánh giá xếp loại',
      deXuat: String(p.deXuat || ''),
      xacNhanThamGiaHoiNghi: String(p.xacNhanThamGiaHoiNghi || ''),
      lyDoVangMat: String(p.lyDoVangMat || '')
    };
  }

  function mergeDocDraft(prevDraft, patch, updatedAt) {
    const base = prevDraft && typeof prevDraft === 'object' ? prevDraft : {};
    const next02c = patch && patch.form02c
      ? Object.assign({}, base.form02c || {}, patch.form02c)
      : (base.form02c || null);
    const next6b = patch && patch.form6b
      ? Object.assign({}, base.form6b || {}, patch.form6b)
      : (base.form6b || null);
    const res = Object.assign({}, base, {
      updatedAt: updatedAt || nowVN(),
      updatedAtMs: Date.now()
    });
    if (next02c) res.form02c = next02c;
    if (next6b) res.form6b = next6b;
    return res;
  }

  function buildDocLogEntry(p) {
    return {
      thoiGian: nowVN(),
      mssv: String(p.mssv || '').trim(),
      hoTen: String(p.hoTen || '').trim(),
      nhom: String(p.nhom || '').trim(),
      khoa: String(p.khoa || '').trim(),
      loaiHoSo: String(p.loaiHoSo || 'Mẫu 02c + Mẫu 6b (.zip)').trim(),
      tongDiem: String(p.tongDiem || '').trim(),
      xepLoai: String(p.xepLoai || '').trim(),
      createdAtMs: Date.now()
    };
  }

  function buildDashboardResponse(db, extra) {
    const submissionsList = [];
    const sortedMembers = (db.members || []).slice().sort((a, b) => {
      const sa = parseInt(a.stt, 10);
      const sb = parseInt(b.stt, 10);
      if (!isNaN(sa) && !isNaN(sb)) return sa - sb;
      return String(a.hoTen || '').localeCompare(String(b.hoTen || ''), 'vi');
    });

    const docLogsSorted = (db.docLogs || []).slice().sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
    const fmtAch = a => (a ? [a.loai, a.donVi, a.thoiGian, a.ten].map(v => String(v || '').trim()).filter(Boolean).join(' - ') : '');

    const members = sortedMembers.map(m => {
      const rawSub = (db.submissions && db.submissions[m.mssv]) || null;
      const sub = (rawSub && rawSub.thoiGianGui) ? rawSub : null;
      const docMatch = docLogsSorted.find(l => l.mssv === m.mssv);
      let chiTiet = null;
      if (sub) {
        const achs = Array.isArray(sub.thanhTichList) ? sub.thanhTichList : [];
        const thanhTichStr = achs
          .map((a, i) => `${i + 1}. ${fmtAch(a)}`)
          .join('\n');
        const dongGopStr = (sub.dongGopList || [])
          .map((g, i) => `${i + 1}. ${g.hoatDong} | ${g.thoiGian} | ${g.noiDung}`)
          .join('\n');
        chiTiet = {
          'STT': m.stt || '',
          'Thời gian gửi': sub.thoiGianGui || '',
          'Họ và tên': m.hoTen || '',
          'MSSV': m.mssv || '',
          'Ngày sinh': m.ngaySinh || '',
          'Giới tính': m.gioiTinh || '',
          'CCCD': m.cccd || '',
          'Lớp': m.lop || '',
          'Khoa': m.khoa || '',
          'Nhóm sinh hoạt': m.nhom || '',
          'Ngày vào Đảng': m.ngayVaoDang || '',
          'Ngày chính thức': m.ngayChinhThuc || '',
          'Loại Đảng viên': m.loaiDangVien || '',
          'Số thẻ Đảng viên': m.soTDV || '',
          'Chi bộ Sinh hoạt nơi cư trú': sub.chiBoCuTru || m.chiBoCuTru || '',
          'Đảng bộ phường/xã': sub.dangBoPhuongXa || m.dangBoPhuongXa || '',
          'Nơi ở hiện nay': sub.noiOHienNay || m.diaChiHienTai || '',
          'KQ Học tập HK1 (2025-2026)': sub.kqHocTapHK1 || '',
          'KQ Rèn luyện HK1 (2025-2026)': sub.kqRenLuyenHK1 || '',
          'KQ Học tập HK2 (2025-2026)': sub.kqHocTapHK2 || '',
          'KQ Rèn luyện HK2 (2025-2026)': sub.kqRenLuyenHK2 || '',
          'Thành tích 1': fmtAch(achs[0]),
          'Thành tích 2': fmtAch(achs[1]),
          'Thành tích 3': fmtAch(achs[2]),
          'Thành tích 4': fmtAch(achs[3]),
          'Tổng hợp Thành tích đạt được': thanhTichStr,
          'Đóng góp cho Chi bộ': dongGopStr,
          'Tự xếp loại mức HTNV năm 2026': sub.tuXepLoai || '',
          'Đề xuất, ý kiến': sub.deXuat || '',
          'Tham gia Hội nghị (22/11/2026)': sub.xacNhanThamGiaHoiNghi === 'tham_gia'
            ? 'Có tham gia'
            : (sub.xacNhanThamGiaHoiNghi === 'khong_tham_gia' ? 'Vắng mặt' : 'Chưa xác nhận'),
          'Lý do vắng mặt Hội nghị': sub.lyDoVangMat || '',
          'Trạng thái tạo hồ sơ in (Mẫu 02c + 6b)': docMatch ? `Đã tải (${docMatch.thoiGian})` : 'Chưa tạo',
          'Tổng điểm tự chấm (Mẫu 02c)': (docMatch && docMatch.tongDiem) ? docMatch.tongDiem : ''
        };
        submissionsList.push(chiTiet);
      }
      const docDraft = (rawSub && rawSub.docDraft) || (db.docDrafts && db.docDrafts[m.mssv]) || null;
      const docDraftUpdatedAt = (rawSub && rawSub.docDraftUpdatedAt) || (docDraft && docDraft.updatedAt) || '';
      return Object.assign({}, m, {
        daKeKhai: Boolean(sub),
        thoiGianGui: sub ? sub.thoiGianGui : '',
        tuXepLoai: sub ? sub.tuXepLoai : '',
        xacNhanThamGiaHoiNghi: sub ? (sub.xacNhanThamGiaHoiNghi || '') : '',
        lyDoVangMat: sub ? (sub.lyDoVangMat || '') : '',
        daTaoHoSo: Boolean(docMatch),
        thoiGianTaoHoSo: docMatch ? docMatch.thoiGian : '',
        tongDiemHoSo: (docMatch && docMatch.tongDiem) ? docMatch.tongDiem : '',
        hasDocDraft: Boolean(docDraft && (docDraft.form02c || docDraft.form6b)),
        docDraftUpdatedAt,
        docDraft,
        submission: sub,
        chiTiet
      });
    });

    const submittedCount = members.filter(x => x.daKeKhai).length;
    return Object.assign(
      {
        success: true,
        stats: { total: members.length, submitted: submittedCount, pending: members.length - submittedCount },
        links: normalizeLinks(db.links),
        members,
        submissions: submissionsList,
        docLogs: docLogsSorted
      },
      extra || {}
    );
  }

  function localHandle(body, firebaseStatus) {
    const db = getLocalDb();
    const extra = firebaseStatus || { firebaseConnected: false, firebaseError: '' };

    if (body.action === 'getLinks') {
      return { success: true, links: db.links, firebaseConnected: Boolean(extra.firebaseConnected) };
    }

    if (body.action === 'lookup') {
      const mssv = String(body.mssv || '').trim();
      const cccd = String(body.cccd || '').trim();
      const fromAdmin = Boolean(body.fromAdmin);
      const m = db.members.find(x => x.mssv === mssv && (fromAdmin || x.cccd === cccd));
      if (!m) {
        return { success: false, message: 'Không tìm thấy Đảng viên khớp với MSSV và CCCD đã nhập. Vui lòng kiểm tra lại.' };
      }
      const rawSub = db.submissions[m.mssv] || null;
      const existing = (rawSub && rawSub.thoiGianGui) ? rawSub : null;
      const docDraft = (db.docDrafts && db.docDrafts[m.mssv]) || (rawSub && rawSub.docDraft) || null;
      return {
        success: true,
        existing,
        docDraft,
        member: Object.assign({}, m, { validNgayVaoDang: true, du6Thang: isDu6Thang(m.ngayVaoDang) })
      };
    }

    if (body.action === 'submit') {
      const p = body.payload || {};
      const m = db.members.find(x => x.mssv === p.mssv);
      if (!m) return { success: false, message: 'Không tìm thấy Đảng viên.' };
      const rawSub = db.submissions[m.mssv] || null;
      const updated = Boolean(rawSub && rawSub.thoiGianGui);
      const prevDraft = (rawSub && rawSub.docDraft) || (db.docDrafts && db.docDrafts[m.mssv]) || null;
      const subObj = buildSubmissionObj(p, m);
      if (prevDraft) subObj.docDraft = prevDraft;
      db.submissions[m.mssv] = subObj;
      saveLocalDb(db);
      return {
        success: true,
        updated,
        message: updated ? 'Cập nhật thông tin kê khai thành công!' : 'Gửi thông tin kê khai thành công!'
      };
    }

    if (body.action === 'saveDocDraft') {
      const p = body.payload || {};
      const mssv = String(p.mssv || '').trim();
      if (!mssv) return { success: false, message: 'Thiếu MSSV.' };
      const updatedAt = nowVN();
      const draftObj = Object.assign({}, p.docDraft || {}, { updatedAt });
      db.docDrafts = db.docDrafts || {};
      db.docDrafts[mssv] = draftObj;
      if (db.submissions && db.submissions[mssv]) {
        db.submissions[mssv].docDraft = draftObj;
        db.submissions[mssv].docDraftUpdatedAt = updatedAt;
      }
      saveLocalDb(db);
      return {
        success: true,
        updatedAt,
        message: 'Đã lưu thông tin hồ sơ thành công! Đồng chí có thể chỉnh sửa và tải lại file bất cứ lúc nào.'
      };
    }

    if (body.action === 'logDocExport') {
      const p = body.payload || {};
      if (!p.mssv) return { success: false, message: 'Thiếu MSSV.' };
      db.docLogs = db.docLogs || [];
      db.docLogs.unshift(buildDocLogEntry(p));
      saveLocalDb(db);
      return { success: true };
    }

    if (body.action === 'adminDashboard') {
      if (!isValidAdminPassword(body.password)) {
        return { success: false, message: 'Mật khẩu quản trị không đúng.' };
      }
      return buildDashboardResponse(db, extra);
    }

    if (body.action === 'adminSaveLinks') {
      if (!isValidAdminPassword(body.password)) return { success: false, message: 'Mật khẩu quản trị không đúng.' };
      db.links = normalizeLinks(Object.assign({}, db.links, body.links || {}));
      saveLocalDb(db);
      return {
        success: true,
        message: 'Đã lưu cấu hình đường link (chế độ dự phòng cục bộ)!',
        links: db.links,
        firebaseConnected: false,
        firebaseError: extra.firebaseError || ''
      };
    }

    if (body.action === 'adminImportMembers') {
      if (!isValidAdminPassword(body.password)) return { success: false, message: 'Mật khẩu quản trị không đúng.' };
      const rows = body.rows || [];
      let added = 0;
      let updated = 0;
      rows.forEach(item => {
        const mssv = String(item.mssv || item.MSSV || '').trim();
        if (!mssv) return;
        const idx = db.members.findIndex(x => x.mssv === mssv);
        const obj = sanitizeMemberRow(item, db.members.length + 1, idx >= 0 ? db.members[idx] : null);
        if (idx >= 0) { db.members[idx] = obj; updated++; }
        else { db.members.push(obj); added++; }
      });
      saveLocalDb(db);
      return {
        success: true,
        message: `Nhập dữ liệu cục bộ thành công: thêm ${added} đồng chí, cập nhật ${updated} đồng chí.`,
        firebaseConnected: false,
        firebaseError: extra.firebaseError || ''
      };
    }

    if (body.action === 'adminSaveMember') {
      if (!isValidAdminPassword(body.password)) return { success: false, message: 'Mật khẩu quản trị không đúng.' };
      const origMssv = String(body.originalMssv || '').trim();
      const input = body.member || {};
      const newMssv = String(input.mssv || '').trim();
      const hoTen = String(input.hoTen || '').trim();
      if (!newMssv || !hoTen) {
        return { success: false, message: 'Vui lòng nhập đầy đủ Họ tên và MSSV.' };
      }
      const conflictIdx = db.members.findIndex(x => x.mssv === newMssv && x.mssv !== origMssv);
      if (conflictIdx >= 0) {
        return { success: false, message: `MSSV "${newMssv}" đã tồn tại trong danh sách.` };
      }
      const origIdx = origMssv ? db.members.findIndex(x => x.mssv === origMssv) : -1;
      const existing = origIdx >= 0 ? db.members[origIdx] : null;
      const savedObj = sanitizeMemberRow(input, existing ? existing.stt : db.members.length + 1, existing);

      if (origIdx >= 0) {
        db.members[origIdx] = savedObj;
      } else {
        db.members.push(savedObj);
      }

      if (origMssv && origMssv !== newMssv && db.submissions[origMssv]) {
        db.submissions[newMssv] = Object.assign({}, db.submissions[origMssv], { mssv: newMssv });
        delete db.submissions[origMssv];
      }
      if (origMssv && origMssv !== newMssv && db.docDrafts && db.docDrafts[origMssv]) {
        db.docDrafts[newMssv] = db.docDrafts[origMssv];
        delete db.docDrafts[origMssv];
      }
      if (body.submissionPatch && db.submissions[newMssv]) {
        const sp = body.submissionPatch;
        db.submissions[newMssv] = Object.assign({}, db.submissions[newMssv], {
          chiBoCuTru: String(sp.chiBoCuTru || ''),
          dangBoPhuongXa: String(sp.dangBoPhuongXa || ''),
          noiOHienNay: String(sp.noiOHienNay || ''),
          kqHocTapHK1: String(sp.kqHocTapHK1 || ''),
          kqRenLuyenHK1: String(sp.kqRenLuyenHK1 || ''),
          kqHocTapHK2: String(sp.kqHocTapHK2 || ''),
          kqRenLuyenHK2: String(sp.kqRenLuyenHK2 || ''),
          tuXepLoai: String(sp.tuXepLoai || ''),
          deXuat: String(sp.deXuat || ''),
          xacNhanThamGiaHoiNghi: String(sp.xacNhanThamGiaHoiNghi || ''),
          lyDoVangMat: String(sp.lyDoVangMat || '')
        });
      }
      if (body.docDraftPatch) {
        const prevDraft = (db.submissions[newMssv] && db.submissions[newMssv].docDraft) || (db.docDrafts && db.docDrafts[newMssv]) || null;
        const mergedDraft = mergeDocDraft(prevDraft, body.docDraftPatch, nowVN());
        db.docDrafts = db.docDrafts || {};
        db.docDrafts[newMssv] = mergedDraft;
        if (db.submissions[newMssv]) {
          db.submissions[newMssv].docDraft = mergedDraft;
          db.submissions[newMssv].docDraftUpdatedAt = mergedDraft.updatedAt;
        }
      }

      saveLocalDb(db);
      return {
        success: true,
        message: origMssv ? `Đã cập nhật thông tin đồng chí ${hoTen} (cục bộ).` : `Đã thêm Đảng viên ${hoTen} (cục bộ).`,
        member: savedObj,
        firebaseConnected: false,
        firebaseError: extra.firebaseError || ''
      };
    }

    if (body.action === 'adminDeleteMember') {
      if (!isValidAdminPassword(body.password)) return { success: false, message: 'Mật khẩu quản trị không đúng.' };
      const mssv = String(body.mssv || '').trim();
      if (!mssv) return { success: false, message: 'Thiếu MSSV cần xóa.' };
      db.members = db.members.filter(x => x.mssv !== mssv);
      if (db.submissions && db.submissions[mssv]) delete db.submissions[mssv];
      if (db.docDrafts && db.docDrafts[mssv]) delete db.docDrafts[mssv];
      db.docLogs = (db.docLogs || []).filter(l => l.mssv !== mssv);
      saveLocalDb(db);
      return {
        success: true,
        message: `Đã xóa Đảng viên (${mssv}) khỏi danh sách cục bộ.`,
        firebaseConnected: false,
        firebaseError: extra.firebaseError || ''
      };
    }

    if (body.action === 'adminResetMemberSubmission') {
      if (!isValidAdminPassword(body.password)) return { success: false, message: 'Mật khẩu quản trị không đúng.' };
      const mssv = String(body.mssv || '').trim();
      if (!mssv) return { success: false, message: 'Thiếu MSSV cần reset kê khai.' };
      if (db.submissions && db.submissions[mssv]) delete db.submissions[mssv];
      if (db.docDrafts && db.docDrafts[mssv]) delete db.docDrafts[mssv];
      db.docLogs = (db.docLogs || []).filter(l => l.mssv !== mssv);
      saveLocalDb(db);
      return {
        success: true,
        message: `Đã reset dữ liệu kê khai của Đảng viên (${mssv}) trên bộ nhớ cục bộ.`,
        firebaseConnected: false,
        firebaseError: extra.firebaseError || ''
      };
    }

    if (body.action === 'adminResetAllSubmissions') {
      if (!isValidAdminPassword(body.password)) return { success: false, message: 'Mật khẩu quản trị không đúng.' };
      db.submissions = {};
      db.docDrafts = {};
      db.docLogs = [];
      saveLocalDb(db);
      return {
        success: true,
        message: 'Đã reset toàn bộ dữ liệu kê khai & lịch sử tạo biểu mẫu trên bộ nhớ cục bộ.',
        firebaseConnected: false,
        firebaseError: extra.firebaseError || ''
      };
    }

    if (body.action === 'adminResetMembers') {
      if (!isValidAdminPassword(body.password)) return { success: false, message: 'Mật khẩu quản trị không đúng.' };
      db.members = [];
      db.submissions = {};
      db.docDrafts = {};
      db.docLogs = [];
      saveLocalDb(db);
      return {
        success: true,
        message: 'Đã reset toàn bộ danh sách Đảng viên trên bộ nhớ cục bộ.',
        firebaseConnected: false,
        firebaseError: extra.firebaseError || ''
      };
    }

    return { success: false, message: 'Hành động không hợp lệ.' };
  }

  async function firebaseHandle(body) {
    const fs = await getFirestoreDb();
    if (!fs) return null;

    if (body.action === 'getLinks') {
      const portalSnap = await withTimeout(
        fs.collection('settings').doc('portal').get(),
        10000,
        'Quá thời gian đọc cấu hình đường link từ Firestore.'
      );
      const data = portalSnap.exists ? portalSnap.data() : {};
      const storedLinks = data && data.links && typeof data.links === 'object' ? data.links : data;
      const links = normalizeLinks(storedLinks);
      const localDb = getLocalDb();
      localDb.links = links;
      saveLocalDb(localDb);
      return { success: true, links, firebaseConnected: true };
    }

    if (body.action === 'lookup') {
      const mssv = String(body.mssv || '').trim();
      const cccd = String(body.cccd || '').trim();
      const fromAdmin = Boolean(body.fromAdmin);
      if (!mssv || (!cccd && !fromAdmin)) {
        return { success: false, message: 'Vui lòng nhập đầy đủ MSSV và CCCD.' };
      }
      const safeId = docSafeId(mssv);
      const [memberDoc, subDoc] = await withTimeout(
        Promise.all([
          fs.collection('members').doc(safeId).get(),
          fs.collection('submissions').doc(safeId).get()
        ]),
        10000,
        'Quá thời gian tra cứu dữ liệu Đảng viên từ Firestore.'
      );
      if (!memberDoc.exists) {
        return { success: false, message: 'Không tìm thấy Đảng viên khớp với MSSV này trong hệ thống.' };
      }
      const m = memberDoc.data();
      if (!fromAdmin && String(m.cccd || '').trim() !== cccd) {
        return { success: false, message: 'Không tìm thấy Đảng viên khớp với MSSV và CCCD đã nhập. Vui lòng kiểm tra lại.' };
      }
      const rawSub = subDoc.exists ? subDoc.data() : null;
      const existing = (rawSub && rawSub.thoiGianGui) ? rawSub : null;
      const docDraft = (rawSub && rawSub.docDraft) ? rawSub.docDraft : null;
      return {
        success: true,
        existing,
        docDraft,
        member: Object.assign({}, m, { validNgayVaoDang: true, du6Thang: isDu6Thang(m.ngayVaoDang) })
      };
    }

    if (body.action === 'submit') {
      const p = body.payload || {};
      const mssv = String(p.mssv || '').trim();
      if (!mssv) return { success: false, message: 'Thiếu MSSV.' };
      const safeId = docSafeId(mssv);
      const [memberDoc, subDoc] = await withTimeout(
        Promise.all([
          fs.collection('members').doc(safeId).get(),
          fs.collection('submissions').doc(safeId).get()
        ]),
        10000,
        'Quá thời gian kiểm tra thông tin Đảng viên trên Firestore.'
      );
      if (!memberDoc.exists) {
        return { success: false, message: 'Không tìm thấy Đảng viên.' };
      }
      const m = memberDoc.data();
      const prevSub = subDoc.exists ? subDoc.data() : null;
      const updated = Boolean(prevSub && prevSub.thoiGianGui);
      const subObj = buildSubmissionObj(p, m);
      if (prevSub && prevSub.docDraft) subObj.docDraft = prevSub.docDraft;
      await withTimeout(
        fs.collection('submissions').doc(safeId).set(subObj),
        10000,
        'Quá thời gian lưu dữ liệu kê khai lên Firestore.'
      );

      const localDb = getLocalDb();
      localDb.submissions[m.mssv] = subObj;
      saveLocalDb(localDb);

      return {
        success: true,
        updated,
        message: updated ? 'Cập nhật thông tin kê khai lên Firebase thành công!' : 'Gửi thông tin kê khai lên Firebase thành công!'
      };
    }

    if (body.action === 'logDocExport') {
      const p = body.payload || {};
      if (!p.mssv) return { success: false, message: 'Thiếu MSSV.' };
      const entry = buildDocLogEntry(p);
      await withTimeout(
        fs.collection('docLogs').add(entry),
        10000,
        'Quá thời gian ghi lịch sử tạo biểu mẫu lên Firestore.'
      );

      const localDb = getLocalDb();
      localDb.docLogs = localDb.docLogs || [];
      localDb.docLogs.unshift(entry);
      saveLocalDb(localDb);
      return { success: true };
    }

    if (body.action === 'saveDocDraft') {
      const p = body.payload || {};
      const mssv = String(p.mssv || '').trim();
      if (!mssv) return { success: false, message: 'Thiếu MSSV.' };
      const safeId = docSafeId(mssv);
      const updatedAt = nowVN();
      const draftObj = Object.assign({}, p.docDraft || {}, { updatedAt });
      await withTimeout(
        fs.collection('submissions').doc(safeId).set({
          mssv,
          docDraft: draftObj,
          docDraftUpdatedAt: updatedAt
        }, { merge: true }),
        10000,
        'Quá thời gian lưu bản nháp hồ sơ lên Firestore.'
      );

      const localDb = getLocalDb();
      localDb.docDrafts = localDb.docDrafts || {};
      localDb.docDrafts[mssv] = draftObj;
      if (localDb.submissions && localDb.submissions[mssv]) {
        localDb.submissions[mssv].docDraft = draftObj;
        localDb.submissions[mssv].docDraftUpdatedAt = updatedAt;
      }
      saveLocalDb(localDb);
      return {
        success: true,
        updatedAt,
        message: 'Đã lưu thông tin hồ sơ thành công! Đồng chí có thể chỉnh sửa và tải lại file bất cứ lúc nào.'
      };
    }

    if (body.action === 'adminDashboard') {
      if (!isValidAdminPassword(body.password)) {
        return { success: false, message: 'Mật khẩu quản trị không đúng.' };
      }
      const [portalSnap, membersSnap, subsSnap, logsSnap] = await withTimeout(
        Promise.all([
          fs.collection('settings').doc('portal').get(),
          fs.collection('members').get(),
          fs.collection('submissions').get(),
          fs.collection('docLogs').get()
        ]),
        15000,
        'Quá thời gian tải bảng điều khiển từ Firestore.'
      );

      const portalData = portalSnap.exists ? portalSnap.data() : {};
      const storedLinks = portalData && portalData.links && typeof portalData.links === 'object' ? portalData.links : portalData;
      const links = normalizeLinks(storedLinks);

      const members = [];
      membersSnap.forEach(doc => {
        const d = doc.data();
        if (d && d.mssv) members.push(d);
      });

      const submissions = {};
      subsSnap.forEach(doc => {
        const d = doc.data();
        const key = (d && d.mssv) || doc.id;
        submissions[key] = d;
      });

      const docLogs = [];
      logsSnap.forEach(doc => {
        const d = doc.data();
        if (d) docLogs.push(d);
      });

      const prevLocal = getLocalDb();
      const snapshotDb = { links, members, submissions, docLogs, docDrafts: prevLocal.docDrafts || {} };
      saveLocalDb(snapshotDb);

      return buildDashboardResponse(snapshotDb, {
        firebaseConnected: true,
        firebaseError: ''
      });
    }

    if (body.action === 'adminSaveLinks') {
      if (!isValidAdminPassword(body.password)) return { success: false, message: 'Mật khẩu quản trị không đúng.' };
      const portalRef = fs.collection('settings').doc('portal');
      const currentSnap = await withTimeout(portalRef.get(), 10000, 'Quá thời gian đọc cấu hình hiện tại trên Firestore.');
      const curData = currentSnap.exists ? currentSnap.data() : {};
      const curLinks = curData && curData.links && typeof curData.links === 'object' ? curData.links : curData;
      const nextLinks = normalizeLinks(Object.assign({}, curLinks, body.links || {}));
      await withTimeout(
        portalRef.set({ links: nextLinks, updatedAt: nowVN() }, { merge: true }),
        10000,
        'Quá thời gian lưu cấu hình link lên Firestore.'
      );

      const localDb = getLocalDb();
      localDb.links = nextLinks;
      saveLocalDb(localDb);

      return {
        success: true,
        message: 'Đã lưu cấu hình đường link lên Firebase thành công!',
        links: nextLinks,
        firebaseConnected: true
      };
    }

    if (body.action === 'adminImportMembers') {
      if (!isValidAdminPassword(body.password)) return { success: false, message: 'Mật khẩu quản trị không đúng.' };
      const rows = Array.isArray(body.rows) ? body.rows : [];
      const existingSnap = await withTimeout(
        fs.collection('members').get(),
        15000,
        'Quá thời gian đọc danh sách Đảng viên hiện có trên Firestore.'
      );
      const existingMap = {};
      existingSnap.forEach(doc => {
        const d = doc.data();
        if (d && d.mssv) existingMap[doc.mssv] = d;
      });

      const deduped = new Map();
      rows.forEach(item => {
        const mssv = String(item.mssv || item.MSSV || '').trim();
        if (!mssv) return;
        deduped.set(mssv, item);
      });

      let added = 0;
      let updated = 0;
      let nextStt = Object.keys(existingMap).length + 1;
      const writes = [];

      deduped.forEach((item, mssv) => {
        const prev = existingMap[mssv] || null;
        const fallbackStt = prev && prev.stt ? prev.stt : nextStt;
        const obj = sanitizeMemberRow(item, fallbackStt, prev);
        if (prev) {
          updated++;
        } else {
          added++;
          nextStt++;
        }
        writes.push({ id: docSafeId(mssv), data: obj });
      });

      const CHUNK_SIZE = 400;
      for (let i = 0; i < writes.length; i += CHUNK_SIZE) {
        const chunk = writes.slice(i, i + CHUNK_SIZE);
        const batch = fs.batch();
        chunk.forEach(w => {
          batch.set(fs.collection('members').doc(w.id), w.data, { merge: true });
        });
        await withTimeout(batch.commit(), 20000, 'Quá thời gian ghi dữ liệu Đảng viên lên Firestore.');
      }

      const localDb = getLocalDb();
      writes.forEach(w => {
        const idx = localDb.members.findIndex(x => x.mssv === w.data.mssv);
        if (idx >= 0) localDb.members[idx] = w.data;
        else localDb.members.push(w.data);
      });
      saveLocalDb(localDb);

      return {
        success: true,
        message: `Nhập dữ liệu lên Firebase thành công: thêm ${added} đồng chí, cập nhật ${updated} đồng chí.`,
        firebaseConnected: true
      };
    }

    if (body.action === 'adminSaveMember') {
      if (!isValidAdminPassword(body.password)) return { success: false, message: 'Mật khẩu quản trị không đúng.' };
      const origMssv = String(body.originalMssv || '').trim();
      const input = body.member || {};
      const newMssv = String(input.mssv || '').trim();
      const hoTen = String(input.hoTen || '').trim();
      if (!newMssv || !hoTen) {
        return { success: false, message: 'Vui lòng nhập đầy đủ Họ tên và MSSV.' };
      }

      const newId = docSafeId(newMssv);
      const origId = origMssv ? docSafeId(origMssv) : '';

      let prevDocData = null;
      if (origId) {
        const origSnap = await withTimeout(
          fs.collection('members').doc(origId).get(),
          10000,
          'Quá thời gian đọc thông tin Đảng viên trên Firestore.'
        );
        if (origSnap.exists) prevDocData = origSnap.data();
      }

      if (!origId || origId !== newId) {
        const targetSnap = await withTimeout(
          fs.collection('members').doc(newId).get(),
          10000,
          'Quá thời gian kiểm tra trùng MSSV trên Firestore.'
        );
        if (targetSnap.exists) {
          return { success: false, message: `MSSV "${newMssv}" đã tồn tại trên Firebase.` };
        }
      }

      const savedObj = sanitizeMemberRow(input, (prevDocData && prevDocData.stt) || '', prevDocData);
      const batch = fs.batch();
      batch.set(fs.collection('members').doc(newId), savedObj, { merge: true });

      let updatedSub = null;
      const subLookupId = origId || newId;
      const subSnap = await withTimeout(
        fs.collection('submissions').doc(subLookupId).get(),
        10000,
        'Quá thời gian đọc dữ liệu kê khai trên Firestore.'
      );
      if (subSnap.exists || body.docDraftPatch) {
        const baseSub = subSnap.exists
          ? Object.assign({}, subSnap.data(), { mssv: newMssv })
          : { mssv: newMssv };
        if (body.submissionPatch && subSnap.exists) {
          const sp = body.submissionPatch;
          updatedSub = Object.assign(baseSub, {
            chiBoCuTru: String(sp.chiBoCuTru || ''),
            dangBoPhuongXa: String(sp.dangBoPhuongXa || ''),
            noiOHienNay: String(sp.noiOHienNay || ''),
            kqHocTapHK1: String(sp.kqHocTapHK1 || ''),
            kqRenLuyenHK1: String(sp.kqRenLuyenHK1 || ''),
            kqHocTapHK2: String(sp.kqHocTapHK2 || ''),
            kqRenLuyenHK2: String(sp.kqRenLuyenHK2 || ''),
            tuXepLoai: String(sp.tuXepLoai || ''),
            deXuat: String(sp.deXuat || ''),
            xacNhanThamGiaHoiNghi: String(sp.xacNhanThamGiaHoiNghi || ''),
            lyDoVangMat: String(sp.lyDoVangMat || '')
          });
        } else {
          updatedSub = baseSub;
        }
        if (body.docDraftPatch) {
          const mergedDraft = mergeDocDraft(updatedSub.docDraft || null, body.docDraftPatch, nowVN());
          updatedSub.docDraft = mergedDraft;
          updatedSub.docDraftUpdatedAt = mergedDraft.updatedAt;
        }
        batch.set(fs.collection('submissions').doc(newId), updatedSub, { merge: true });
      }

      if (origId && origId !== newId) {
        batch.delete(fs.collection('members').doc(origId));
        if (subSnap.exists) {
          batch.delete(fs.collection('submissions').doc(origId));
        }
      }

      await withTimeout(batch.commit(), 15000, 'Quá thời gian lưu thay đổi lên Firestore.');

      const localDb = getLocalDb();
      const idx = origMssv ? localDb.members.findIndex(x => x.mssv === origMssv) : -1;
      if (idx >= 0) localDb.members[idx] = savedObj;
      else localDb.members.push(savedObj);
      if (origMssv && origMssv !== newMssv && localDb.submissions[origMssv]) {
        delete localDb.submissions[origMssv];
      }
      if (origMssv && origMssv !== newMssv && localDb.docDrafts && localDb.docDrafts[origMssv]) {
        localDb.docDrafts[newMssv] = localDb.docDrafts[origMssv];
        delete localDb.docDrafts[origMssv];
      }
      if (updatedSub) {
        localDb.submissions[newMssv] = updatedSub;
        if (updatedSub.docDraft) {
          localDb.docDrafts = localDb.docDrafts || {};
          localDb.docDrafts[newMssv] = updatedSub.docDraft;
        }
      }
      saveLocalDb(localDb);

      return {
        success: true,
        message: origMssv
          ? `Đã cập nhật thông tin đồng chí ${hoTen} lên Firebase thành công!`
          : `Đã thêm Đảng viên ${hoTen} lên Firebase thành công!`,
        member: savedObj,
        firebaseConnected: true
      };
    }

    if (body.action === 'adminDeleteMember') {
      if (!isValidAdminPassword(body.password)) return { success: false, message: 'Mật khẩu quản trị không đúng.' };
      const mssv = String(body.mssv || '').trim();
      if (!mssv) return { success: false, message: 'Thiếu MSSV cần xóa.' };
      const safeId = docSafeId(mssv);
      const batch = fs.batch();
      batch.delete(fs.collection('members').doc(safeId));
      batch.delete(fs.collection('submissions').doc(safeId));
      await withTimeout(batch.commit(), 12000, 'Quá thời gian xóa Đảng viên trên Firestore.');

      const localDb = getLocalDb();
      localDb.members = localDb.members.filter(x => x.mssv !== mssv);
      if (localDb.submissions && localDb.submissions[mssv]) delete localDb.submissions[mssv];
      if (localDb.docDrafts && localDb.docDrafts[mssv]) delete localDb.docDrafts[mssv];
      localDb.docLogs = (localDb.docLogs || []).filter(l => l.mssv !== mssv);
      saveLocalDb(localDb);

      return {
        success: true,
        message: `Đã xóa Đảng viên (${mssv}) khỏi Firebase thành công!`,
        firebaseConnected: true
      };
    }

    async function clearFirestoreCollection(colName) {
      const snap = await withTimeout(
        fs.collection(colName).get(),
        15000,
        `Quá thời gian đọc dữ liệu ${colName} trên Firestore.`
      );
      if (snap.empty) return 0;
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const chunk = docs.slice(i, i + 400);
        const batch = fs.batch();
        chunk.forEach(d => batch.delete(d.ref));
        await withTimeout(batch.commit(), 15000, `Quá thời gian xóa dữ liệu ${colName} trên Firestore.`);
      }
      return docs.length;
    }

    if (body.action === 'adminResetMemberSubmission') {
      if (!isValidAdminPassword(body.password)) return { success: false, message: 'Mật khẩu quản trị không đúng.' };
      const mssv = String(body.mssv || '').trim();
      if (!mssv) return { success: false, message: 'Thiếu MSSV cần reset kê khai.' };
      const safeId = docSafeId(mssv);
      const logSnap = await withTimeout(
        fs.collection('docLogs').where('mssv', '==', mssv).get(),
        12000,
        'Quá thời gian đọc lịch sử biểu mẫu trên Firestore.'
      );
      const batch = fs.batch();
      batch.delete(fs.collection('submissions').doc(safeId));
      batch.delete(fs.collection('docDrafts').doc(safeId));
      logSnap.forEach(doc => batch.delete(doc.ref));
      await withTimeout(batch.commit(), 15000, 'Quá thời gian reset dữ liệu kê khai trên Firestore.');

      const localDb = getLocalDb();
      if (localDb.submissions && localDb.submissions[mssv]) delete localDb.submissions[mssv];
      if (localDb.docDrafts && localDb.docDrafts[mssv]) delete localDb.docDrafts[mssv];
      localDb.docLogs = (localDb.docLogs || []).filter(l => l.mssv !== mssv);
      saveLocalDb(localDb);

      return {
        success: true,
        message: `Đã reset dữ liệu kê khai của Đảng viên (${mssv}) trên Firebase thành công!`,
        firebaseConnected: true
      };
    }

    if (body.action === 'adminResetAllSubmissions') {
      if (!isValidAdminPassword(body.password)) return { success: false, message: 'Mật khẩu quản trị không đúng.' };
      await clearFirestoreCollection('submissions');
      await clearFirestoreCollection('docLogs');
      await clearFirestoreCollection('docDrafts');

      const localDb = getLocalDb();
      localDb.submissions = {};
      localDb.docDrafts = {};
      localDb.docLogs = [];
      saveLocalDb(localDb);

      return {
        success: true,
        message: 'Đã reset toàn bộ dữ liệu kê khai & lịch sử tạo biểu mẫu trên Firebase thành công!',
        firebaseConnected: true
      };
    }

    if (body.action === 'adminResetMembers') {
      if (!isValidAdminPassword(body.password)) return { success: false, message: 'Mật khẩu quản trị không đúng.' };
      await clearFirestoreCollection('members');
      await clearFirestoreCollection('submissions');
      await clearFirestoreCollection('docLogs');
      await clearFirestoreCollection('docDrafts');

      const localDb = getLocalDb();
      localDb.members = [];
      localDb.submissions = {};
      localDb.docDrafts = {};
      localDb.docLogs = [];
      saveLocalDb(localDb);

      return {
        success: true,
        message: 'Đã reset toàn bộ danh sách Đảng viên trên Firebase thành công!',
        firebaseConnected: true
      };
    }

    return { success: false, message: 'Hành động không hợp lệ.' };
  }

  async function handle(body) {
    if (!body || typeof body !== 'object') {
      return { success: false, message: 'Yêu cầu không hợp lệ.' };
    }

    const ADMIN_ACTIONS = new Set([
      'adminDashboard',
      'adminSaveLinks',
      'adminImportMembers',
      'adminSaveMember',
      'adminDeleteMember',
      'adminResetMemberSubmission',
      'adminResetAllSubmissions',
      'adminResetMembers'
    ]);
    if (ADMIN_ACTIONS.has(body.action)) {
      if (!isValidAdminPassword(body.password)) {
        return { success: false, message: 'Mật khẩu quản trị không đúng.' };
      }
    }

    if (!isFirebaseEnabled()) {
      return localHandle(body, {
        firebaseConnected: false,
        firebaseError: 'Đang tắt đồng bộ Firebase (USE_FIREBASE: false).'
      });
    }

    try {
      const result = await firebaseHandle(body);
      if (result) return result;
    } catch (err) {
      const errMsg = formatFirebaseError(err);
      console.warn('[Firebase Fallback]', errMsg);
      return localHandle(body, {
        firebaseConnected: false,
        firebaseError: errMsg
      });
    }

    return localHandle(body, { firebaseConnected: false, firebaseError: '' });
  }

  return { handle };
})();
