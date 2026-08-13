/**
 * ============================================================
 *  config.js
 *  Konfigurasi global aplikasi. Modul ini TIDAK boleh mengimpor
 *  modul lain — dijadikan satu-satunya sumber kebenaran (single
 *  source of truth) untuk seluruh nilai yang bisa berubah.
 * ============================================================
 */

export const CONFIG = Object.freeze({
  // Web App URL hasil deploy Google Apps Script
  API_BASE_URL: 'https://script.google.com/macros/s/AKfycbwd4WhWDuKlTO3l78VuV1SxKmxBxiNnW_rBUegJ0ufp2UNVHi3bW3Ut-ipAJityjwui/exec',

  // Token akses — harus sama persis dengan Script Properties "API_TOKEN" di backend (lihat Auth.gs)
  API_TOKEN: 'tvri2026agenda',

  // Endpoint agregasi yang dipakai dashboard (lihat API_Documentation.md)
  ENDPOINT_DASHBOARD: '/dashboard',

  // Auto refresh data dari server
  REFRESH_INTERVAL_MS: 15000,

  // Update tampilan (jam, countdown, status, progress) — tiap detik, dari data terakhir yang tersimpan
  TICK_INTERVAL_MS: 1000,

  // Batas waktu tunggu sebelum request dianggap gagal
  REQUEST_TIMEOUT_MS: 8000,

  // Percobaan ulang otomatis saat fetch gagal, sebelum jatuh ke cache/offline mode
  MAX_RETRY: 2,
  RETRY_DELAY_MS: 2000,

  // Local cache (localStorage) untuk offline mode
  CACHE_KEY: 'executive_agenda_dashboard_cache_v1',
  CACHE_MAX_AGE_MS: 30 * 60 * 1000, // cache dianggap masih layak tampil hingga 30 menit

  // Batas jumlah agenda berikutnya yang diambil dari data /dashboard
  UPCOMING_LIMIT: 1,

  // Jadwal jam kerja per hari (Date.getDay(): 0=Minggu, 1=Senin, ... 6=Sabtu)
  // untuk metrik "Persentase Hari Kerja" pada Executive Stats Bar.
  // Hari dengan nilai null dianggap libur (Sabtu & Minggu).
  JAM_KERJA_PER_HARI: {
    0: null,                              // Minggu — libur
    1: { mulai: '07:30', selesai: '16:00' }, // Senin
    2: { mulai: '07:30', selesai: '16:00' }, // Selasa
    3: { mulai: '07:30', selesai: '16:00' }, // Rabu
    4: { mulai: '07:30', selesai: '16:00' }, // Kamis
    5: { mulai: '07:30', selesai: '16:30' }, // Jumat
    6: null                               // Sabtu — libur
  }
});

export const STATUS_OTOMATIS = Object.freeze({
  BELUM_DIMULAI: 'Belum Dimulai',
  BERLANGSUNG: 'Sedang Berlangsung',
  SELESAI: 'Selesai',
  BATAL: 'Batal'
});

export const STATUS_COLOR_CLASS = Object.freeze({
  [STATUS_OTOMATIS.BELUM_DIMULAI]: { dot: 'status-dot-info', badge: 'badge-info', accent: 'accent-left-info', progress: 'progress-fill-info' },
  [STATUS_OTOMATIS.BERLANGSUNG]:   { dot: 'status-dot-warning', badge: 'badge-warning', accent: 'accent-left-warning', progress: 'progress-fill-warning' },
  [STATUS_OTOMATIS.SELESAI]:       { dot: 'status-dot-success', badge: 'badge-success', accent: 'accent-left-success', progress: 'progress-fill-success' },
  [STATUS_OTOMATIS.BATAL]:         { dot: 'status-dot-danger', badge: 'badge-danger', accent: 'accent-left-danger', progress: 'progress-fill-danger' }
});
