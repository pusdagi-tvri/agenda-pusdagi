/**
 * ============================================================
 *  adminAuth.js
 *  Sesi login admin berbasis token (sama dengan API_TOKEN backend).
 *  sessionStorage dipakai (bukan localStorage) agar sesi otomatis
 *  berakhir saat tab/browser ditutup — sesuai dengan sifat panel
 *  ini yang dioperasikan aktif oleh satu admin, bukan display pasif.
 * ============================================================
 */

const KUNCI_SESI = 'ead_admin_token';

export const AdminAuth = {
  sudahLogin() {
    return Boolean(sessionStorage.getItem(KUNCI_SESI));
  },

  login(token) {
    sessionStorage.setItem(KUNCI_SESI, token);
  },

  logout() {
    sessionStorage.removeItem(KUNCI_SESI);
  },

  ambilToken() {
    return sessionStorage.getItem(KUNCI_SESI) || '';
  }
};
