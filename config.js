/**
 * CẤU HÌNH HỆ THỐNG - CHI BỘ SINH VIÊN 2
 * Bật USE_FIREBASE: true để lưu dữ liệu trực tuyến trên Firebase Cloud Firestore (tự động dự phòng localStorage nếu mất kết nối)
 */
const APP_CONFIG = {
  USE_MOCK_DATA: true,
  USE_FIREBASE: true,

  FIREBASE_CONFIG: {
    apiKey: "AIzaSyCeTlE3XaxqIXj9AxPa1HROSdpbdlNmGCw",
    authDomain: "cbsv-f0558.firebaseapp.com",
    projectId: "cbsv-f0558",
    storageBucket: "cbsv-f0558.firebasestorage.app",
    messagingSenderId: "872631800120",
    appId: "1:872631800120:web:6cef03c0a7ce66d78631cd",
    measurementId: "G-2S4Q7ZVJJS"
  },

  // Thời hạn mặc định
  DEADLINE_KE_KHAI_ISO: '2026-11-19T20:00',
  DEADLINE_KE_KHAI_TEXT: '20h00 - Thứ 5, ngày 19/11/2026',
  DEADLINE_NOP_HO_SO_TEXT: 'Sáng Chủ nhật, ngày 22/11/2026',

  // Link tải biểu mẫu mặc định
  LINK_TAI_TOAN_BO: 'https://drive.google.com/drive/folders/1HdAXZk1ICDzdfEHEeUZzgPzKh1KyhA8F?usp=drive_link',
  LINK_HUONG_DAN_CHUNG: 'https://drive.google.com/drive/folders/10Gj3oaZr0f9L4z04fPnS6B1d98ME1hzl?usp=drive_link',
  LINK_TAI_MAU_02C: 'https://drive.google.com/file/d/sample-02c',
  LINK_HUONG_DAN_02C: 'https://drive.google.com/file/d/1tjFE-XVZ_tsDK4ErgR8wPYgcyfXsOJ4H/view?usp=sharing',
  LINK_TAI_MAU_6B: 'https://drive.google.com/file/d/sample-6b',
  LINK_HUONG_DAN_6B: 'https://drive.google.com/file/d/1ov4IDfYEyTgpeY2oipquI8aae5OGRg_R/view?usp=drive_link',
  LINK_TAI_MAU_6D: 'templates/mau-6d.doc',
  LINK_HUONG_DAN_6D: ''
};
