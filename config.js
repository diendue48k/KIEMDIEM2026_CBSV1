/**
 * CẤU HÌNH HỆ THỐNG
 * Bật USE_FIREBASE: true để lưu dữ liệu trực tuyến trên Firebase Cloud Firestore (tự động dự phòng localStorage nếu mất kết nối)
 */
const APP_CONFIG = {
  USE_MOCK_DATA: true,
  USE_FIREBASE: true,

  FIREBASE_CONFIG: {
    apiKey: "AIzaSyAkHv_P8vZd9s0yliPwKUSNhpf1AoFa4jY",
    authDomain: "csdlkiemdiem.firebaseapp.com",
    projectId: "csdlkiemdiem",
    storageBucket: "csdlkiemdiem.firebasestorage.app",
    messagingSenderId: "827668696597",
    appId: "1:827668696597:web:c3cf89890061df5a22881c"
  },

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
