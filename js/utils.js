/**
 * ============================================================
 *  utils.js
 *  Fungsi bantu murni (pure function) — tidak menyentuh DOM,
 *  tidak menyimpan state. Mudah diuji secara terpisah.
 * ============================================================
 */

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const pad2 = (n) => String(n).padStart(2, '0');

const PETA_ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Meng-escape karakter HTML pada data dari spreadsheet sebelum disisipkan lewat innerHTML. */
export function escapeHTML(nilai) {
  if (nilai === null || nilai === undefined) return '';
  return String(nilai).replace(/[&<>"']/g, (c) => PETA_ESCAPE[c]);
}

/** Format tanggal panjang gaya Indonesia, contoh: "Senin, 27 Juli 2026" */
export function formatTanggalIndonesia(date) {
  return `${HARI[date.getDay()]}, ${date.getDate()} ${BULAN[date.getMonth()]} ${date.getFullYear()}`;
}

/** Format jam lengkap dengan detik, contoh: "14:35:08" */
export function formatJam(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

/** Format jam singkat tanpa detik, contoh: "14:35" */
export function formatJamSingkat(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/**
 * Menggabungkan string tanggal ("yyyy-MM-dd") dan jam ("HH:mm") dari API
 * menjadi objek Date lokal. Dibuat toleran terhadap variasi format kecil
 * (misal jam "9:5" tanpa leading zero) agar tidak mudah gagal parse.
 */
export function gabungTanggalJam(tanggalStr, jamStr) {
  if (!tanggalStr || !jamStr) return null;

  const [tahun, bulan, tanggal] = String(tanggalStr).split('-').map(Number);
  const [jam, menit] = String(jamStr).split(':').map(Number);

  if ([tahun, bulan, tanggal, jam, menit].some(Number.isNaN)) return null;

  return new Date(tahun, bulan - 1, tanggal, jam, menit, 0);
}

/** Mengubah selisih milidetik menjadi label countdown yang mudah dibaca, contoh: "1 jam 24 menit" */
export function formatDurasiSingkat(ms) {
  if (ms <= 0) return '0 menit';

  const totalMenit = Math.floor(ms / 60000);
  const hari = Math.floor(totalMenit / 1440);
  const jam = Math.floor((totalMenit % 1440) / 60);
  const menit = totalMenit % 60;

  if (hari > 0 && jam > 0) return `${hari} hari ${jam} jam`;
  if (hari > 0) return `${hari} hari`;
  if (jam > 0 && menit > 0) return `${jam} jam ${menit} menit`;
  if (jam > 0) return `${jam} jam`;
  return `${menit} menit`;
}

/** Membatasi angka dalam rentang tertentu — dipakai untuk perhitungan progress bar (0–100). */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** Debounce sederhana — dipakai membatasi frekuensi eksekusi fungsi berat (mis. saat resize). */
export function debounce(fn, delayMs) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

/** Jeda async sederhana — dipakai pada mekanisme retry fetch. */
export function tunggu(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
