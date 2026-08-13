/**
 * ============================================================
 *  apiService.js
 *  Satu-satunya modul yang berbicara langsung ke API Google
 *  Apps Script. Menangani timeout, retry otomatis, dan validasi
 *  struktur response standar (status/message/timestamp/data).
 * ============================================================
 */

import { CONFIG } from './config.js';
import { tunggu } from './utils.js';

/** Error kustom agar pemanggil dapat membedakan jenis kegagalan. */
export class ApiError extends Error {
  constructor(message, tipe) {
    super(message);
    this.name = 'ApiError';
    this.tipe = tipe; // 'timeout' | 'network' | 'http' | 'format'
  }
}

/** Melakukan fetch dengan batas waktu (AbortController), tanpa library tambahan. */
async function fetchDenganTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('Permintaan ke server melebihi batas waktu.', 'timeout');
    }
    throw new ApiError('Tidak dapat menjangkau server (kemungkinan jaringan terputus).', 'network');
  } finally {
    clearTimeout(timer);
  }
}

/** Memvalidasi bahwa response mengikuti struktur standar API (status/message/timestamp/data). */
function validasiStrukturResponse(json) {
  const punyaFieldWajib = ['status', 'message', 'timestamp'].every((f) => f in json);
  if (!punyaFieldWajib) {
    throw new ApiError('Struktur response API tidak sesuai format yang diharapkan.', 'format');
  }
  if (json.status !== 'success') {
    throw new ApiError(json.message || 'Server mengembalikan status error.', 'http');
  }
}

/**
 * Mengambil data ringkasan dashboard dari endpoint GET /dashboard.
 * Melakukan retry otomatis sebanyak CONFIG.MAX_RETRY sebelum menyerah.
 */
export async function ambilDataDashboard() {
  const url = `${CONFIG.API_BASE_URL}${CONFIG.ENDPOINT_DASHBOARD}?key=${encodeURIComponent(CONFIG.API_TOKEN)}`;
  let percobaanTerakhir;

  for (let percobaan = 0; percobaan <= CONFIG.MAX_RETRY; percobaan++) {
    try {
      const response = await fetchDenganTimeout(url, CONFIG.REQUEST_TIMEOUT_MS);

      if (!response.ok) {
        throw new ApiError(`Server merespons dengan HTTP ${response.status}.`, 'http');
      }

      const json = await response.json();
      validasiStrukturResponse(json);

      return json.data;
    } catch (err) {
      percobaanTerakhir = err;
      const masihBisaCoba = percobaan < CONFIG.MAX_RETRY;
      if (masihBisaCoba) {
        await tunggu(CONFIG.RETRY_DELAY_MS);
      }
    }
  }

  // Seluruh percobaan gagal — lempar error terakhir ke pemanggil untuk ditangani (fallback cache/offline)
  throw percobaanTerakhir instanceof ApiError
    ? percobaanTerakhir
    : new ApiError('Gagal mengambil data dari server setelah beberapa percobaan.', 'network');
}
