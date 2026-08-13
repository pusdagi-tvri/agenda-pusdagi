/**
 * ============================================================
 *  cacheService.js
 *  Menyimpan snapshot data dashboard terakhir yang berhasil
 *  diambil ke localStorage, agar saat koneksi terputus atau
 *  fetch gagal, dashboard tetap dapat menampilkan data terbaru
 *  yang tersedia alih-alih layar kosong/error total.
 * ============================================================
 */

import { CONFIG } from './config.js';

export const CacheService = {

  /** Menyimpan data dashboard beserta timestamp penyimpanan. */
  simpan(data) {
    try {
      const payload = JSON.stringify({ data, disimpanPada: Date.now() });
      localStorage.setItem(CONFIG.CACHE_KEY, payload);
      return true;
    } catch (err) {
      // localStorage bisa gagal (mode private browsing, kuota penuh, dsb) — jangan sampai mematikan aplikasi
      console.warn('[CacheService] Gagal menyimpan cache:', err.message);
      return false;
    }
  },

  /**
   * Mengambil data cache. Mengembalikan null jika tidak ada,
   * rusak, atau sudah melewati CACHE_MAX_AGE_MS.
   */
  ambil() {
    try {
      const raw = localStorage.getItem(CONFIG.CACHE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      const umur = Date.now() - parsed.disimpanPada;

      if (umur > CONFIG.CACHE_MAX_AGE_MS) {
        return null; // cache sudah terlalu lama, lebih baik dianggap tidak ada
      }

      return { data: parsed.data, disimpanPada: parsed.disimpanPada, umurMs: umur };
    } catch (err) {
      console.warn('[CacheService] Gagal membaca cache:', err.message);
      return null;
    }
  },

  hapus() {
    try {
      localStorage.removeItem(CONFIG.CACHE_KEY);
    } catch (err) {
      console.warn('[CacheService] Gagal menghapus cache:', err.message);
    }
  }
};
