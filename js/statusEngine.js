/**
 * ============================================================
 *  statusEngine.js
 *  Menentukan status agenda secara OTOMATIS berdasarkan waktu
 *  saat ini dibandingkan jam_mulai/jam_selesai — independen dari
 *  kolom "status" manual di spreadsheet (kecuali untuk kasus
 *  "Batal", yang tetap dihormati apa pun waktunya).
 * ============================================================
 */

import { STATUS_OTOMATIS } from './config.js';
import { gabungTanggalJam, formatDurasiSingkat, clamp } from './utils.js';

/**
 * Menghitung status otomatis satu agenda pada waktu tertentu.
 * @param {object} agenda - item agenda dari API (harus punya tanggal, jam_mulai, jam_selesai, status)
 * @param {Date} now - waktu acuan (biasanya waktu sekarang)
 * @returns {string} salah satu nilai STATUS_OTOMATIS
 */
export function hitungStatusOtomatis(agenda, now) {
  if (agenda.status === 'Batal') return STATUS_OTOMATIS.BATAL;

  const mulai = gabungTanggalJam(agenda.tanggal, agenda.jam_mulai);
  // tanggal_selesai (bukan tanggal mulai) dipakai untuk agenda multi-hari — fallback
  // ke tanggal mulai kalau kosong/tidak ada (agenda 1 hari biasa, atau data lama).
  const selesai = gabungTanggalJam(agenda.tanggal_selesai || agenda.tanggal, agenda.jam_selesai);

  if (!mulai || !selesai) return STATUS_OTOMATIS.BELUM_DIMULAI; // data tidak lengkap, fallback aman

  if (now < mulai) return STATUS_OTOMATIS.BELUM_DIMULAI;
  if (now >= mulai && now <= selesai) return STATUS_OTOMATIS.BERLANGSUNG;
  return STATUS_OTOMATIS.SELESAI;
}

/**
 * Menghasilkan label countdown yang relevan sesuai status:
 * - Belum Dimulai → hitung mundur menuju jam mulai
 * - Sedang Berlangsung → hitung mundur menuju jam selesai + persentase durasi berjalan
 * - Selesai / Batal → tidak ada countdown
 */
export function hitungCountdown(agenda, now) {
  const status = hitungStatusOtomatis(agenda, now);
  const mulai = gabungTanggalJam(agenda.tanggal, agenda.jam_mulai);
  const selesai = gabungTanggalJam(agenda.tanggal_selesai || agenda.tanggal, agenda.jam_selesai);

  if (status === STATUS_OTOMATIS.BELUM_DIMULAI && mulai) {
    return { status, label: `${formatDurasiSingkat(mulai - now)} lagi`, persenBerjalan: 0 };
  }

  if (status === STATUS_OTOMATIS.BERLANGSUNG && mulai && selesai) {
    const totalDurasi = selesai - mulai;
    const sudahBerjalan = clamp(now - mulai, 0, totalDurasi);
    const persen = totalDurasi > 0 ? Math.round((sudahBerjalan / totalDurasi) * 100) : 100;
    return { status, label: `Berakhir dalam ${formatDurasiSingkat(selesai - now)}`, persenBerjalan: persen };
  }

  return { status, label: null, persenBerjalan: status === STATUS_OTOMATIS.SELESAI ? 100 : 0 };
}

/** Mencari SATU agenda yang berstatus otomatis "Sedang Berlangsung" (jika ada). */
export function cariAgendaBerlangsung(daftarAgenda, now) {
  return daftarAgenda.find((a) => hitungStatusOtomatis(a, now) === STATUS_OTOMATIS.BERLANGSUNG) || null;
}

/** Mencari agenda berikutnya yang paling dekat waktunya (status "Belum Dimulai"), terurut ascending. */
export function cariAgendaBerikutnya(daftarAgenda, now, limit = 1) {
  return daftarAgenda
    .filter((a) => hitungStatusOtomatis(a, now) === STATUS_OTOMATIS.BELUM_DIMULAI)
    .sort((a, b) => gabungTanggalJam(a.tanggal, a.jam_mulai) - gabungTanggalJam(b.tanggal, b.jam_mulai))
    .slice(0, limit);
}
