/**
 * ============================================================
 *  adminApiService.js
 *  Satu-satunya modul yang berbicara ke backend dari Admin Panel.
 * ============================================================
 */

import { CONFIG } from './config.js';
import { AdminAuth } from './adminAuth.js';

/**
 * Mengirim operasi tulis lewat form HTML biasa ke iframe tersembunyi —
 * BUKAN fetch(). Form submission (navigasi browser murni) tidak tunduk
 * aturan CORS sama sekali — beda kategori masalah dari fetch()/XHR yang
 * terbukti tidak reliable untuk operasi tulis di setup Apps Script ini.
 *
 * Konsekuensi: kita TIDAK BISA membaca respons server secara langsung
 * (dibatasi juga oleh same-origin policy untuk iframe cross-origin).
 * Jadi fungsi ini "fire and forget" — sukses/gagalnya baru bisa dipastikan
 * dengan memuat ulang daftar agenda setelah beberapa saat.
 */
function kirimForm(bodyObject) {
  return new Promise((resolve) => {
    const url = `${CONFIG.API_BASE_URL}?key=${encodeURIComponent(AdminAuth.ambilToken())}`;

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url;
    form.target = 'admin-write-target';
    form.style.display = 'none';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'data';
    input.value = JSON.stringify(bodyObject);
    form.appendChild(input);

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    // Tidak ada cara membaca hasil sungguhan — beri jeda agar Apps Script
    // sempat memproses, baru anggap selesai (pemanggil akan refresh data sendiri).
    // 3 detik (bukan 1.5) — penulisan ke spreadsheet kadang butuh waktu lebih lama
    // dari perkiraan awal, dan refresh yang terlalu cepat menampilkan data basi.
    setTimeout(resolve, 3000);
  });
}

async function permintaan(path, opsi) {
  opsi = opsi || {};
  const pemisah = path.includes('?') ? '&' : '?';
  const url = `${CONFIG.API_BASE_URL}${path}${pemisah}key=${encodeURIComponent(AdminAuth.ambilToken())}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: opsi.method || 'GET',
      body: opsi.body ? JSON.stringify(opsi.body) : undefined,
      signal: controller.signal
    });
    const json = await response.json();

    if (json.status !== 'success') {
      const error = new Error(json.message || 'Server mengembalikan status error.');
      error.kode = json.code;
      error.bentrokDengan = json.conflict_with;
      throw error;
    }
    return json.data;
  } finally {
    clearTimeout(timer);
  }
}

export const AdminApiService = {
  /**
   * Satu-satunya sumber data baca untuk Admin Panel — SEMUA lewat /dashboard.
   * Endpoint /agenda dan /pimpinan, /ruangan langsung TIDAK dipakai lagi karena
   * terbukti konsisten gagal CORS lewat fetch(), sementara /dashboard stabil.
   *
   * Daftar agenda mencakup HARI INI + MENDATANG (bukan cuma hari ini) — supaya
   * admin & pimpinan bisa lihat jadwal yang sudah diatur untuk hari-hari
   * berikutnya, memudahkan perencanaan.
   */
  async ambilRingkasan() {
    const data = await permintaan('/dashboard');
    return {
      pimpinan: data.daftar_pimpinan || [],
      ruangan: data.daftar_ruangan || [],
      // Fallback ke daftar_agenda_hari_ini kalau backend yang aktif belum punya
      // daftar_agenda_mendatang (versi Service_Dashboard.gs yang lebih lama) —
      // supaya Admin Panel tidak selalu kosong hanya karena satu field itu absen.
      agenda: data.daftar_agenda_mendatang || data.daftar_agenda_hari_ini || [],
      arsip: data.daftar_arsip_rapat || [],
      kecepatanTeks: data.kecepatan_running_teks || '5'
    };
  },

  buatAgenda(payload) {
    return kirimForm({ action: 'createAgenda', payload });
  },

  updateAgenda(idAgenda, payload) {
    return kirimForm({ action: 'updateAgenda', id_agenda: idAgenda, payload });
  },

  batalkanAgenda(idAgenda) {
    return kirimForm({ action: 'cancelAgenda', id_agenda: idAgenda });
  },

  simpanKecepatanTeks(nilai) {
    return kirimForm({ action: 'updateSetting', key: 'kecepatan_running_teks', value: String(nilai) });
  }
};
