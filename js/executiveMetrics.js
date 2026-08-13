/**
 * ============================================================
 *  executiveMetrics.js
 *  Kalkulasi murni untuk Executive Stats Bar:
 *    - Total Agenda Hari Ini
 *    - Agenda Selesai
 *    - Agenda Tertunda (status backend "Reschedule")
 *    - Agenda Prioritas Tinggi
 *    - Progress Hari (persentase 00:00–23:59 yang sudah berlalu)
 *    - Persentase Hari Kerja (persentase jam kerja yang sudah berlalu)
 *
 *  Semua fungsi di sini murni (pure function) — tidak menyentuh
 *  DOM, hanya menerima data + waktu acuan dan mengembalikan angka.
 * ============================================================
 */

import { CONFIG, STATUS_OTOMATIS } from './config.js';
import { gabungTanggalJam, clamp } from './utils.js';
import { hitungStatusOtomatis } from './statusEngine.js';

/** Total agenda hari ini yang masih valid (bukan Batal). */
export function hitungTotalAgendaHariIni(daftarAgenda) {
  return daftarAgenda.filter((a) => a.status !== 'Batal').length;
}

/** Jumlah agenda dengan status otomatis "Selesai". */
export function hitungAgendaSelesai(daftarAgenda, now) {
  return daftarAgenda.filter((a) => hitungStatusOtomatis(a, now) === STATUS_OTOMATIS.SELESAI).length;
}

/**
 * Agenda Tertunda — merujuk pada agenda yang secara eksplisit ditandai
 * admin sebagai "Reschedule" pada kolom status backend (bukan sekadar
 * "belum dimulai"), karena tertunda berarti ada tindakan penjadwalan
 * ulang, bukan sekadar menunggu jadwal berjalan.
 */
export function hitungAgendaTertunda(daftarAgenda) {
  return daftarAgenda.filter((a) => a.status === 'Reschedule').length;
}

/** Daftar agenda berprioritas "Tinggi" yang belum selesai (aktif hari ini). */
export function hitungAgendaPrioritasTinggi(daftarAgenda, now) {
  return daftarAgenda.filter((a) => {
    const status = hitungStatusOtomatis(a, now);
    return a.prioritas === 'Tinggi' && status !== STATUS_OTOMATIS.SELESAI && status !== STATUS_OTOMATIS.BATAL;
  });
}

/** Progress Hari — persentase waktu yang sudah berlalu dari 00:00 hingga 23:59:59 hari ini. */
export function hitungProgressHari(now) {
  const awalHari = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const totalMsSehari = 24 * 60 * 60 * 1000;
  const persen = ((now - awalHari) / totalMsSehari) * 100;
  return Math.round(clamp(persen, 0, 100));
}

/**
 * Persentase Hari Kerja — persentase waktu yang sudah berlalu dari jam
 * kerja hari ini (jadwal berbeda per hari, lihat CONFIG.JAM_KERJA_PER_HARI).
 * Sebelum jam kerja mulai = 0%, setelah jam kerja selesai = 100%.
 * Mengembalikan { persen, libur } — libur=true untuk Sabtu/Minggu (persen selalu 0).
 */
export function hitungPersentaseHariKerja(now) {
  const jadwalHariIni = CONFIG.JAM_KERJA_PER_HARI[now.getDay()];

  if (!jadwalHariIni) {
    return { persen: 0, libur: true };
  }

  const tanggalStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const mulaiKerja = gabungTanggalJam(tanggalStr, jadwalHariIni.mulai);
  const selesaiKerja = gabungTanggalJam(tanggalStr, jadwalHariIni.selesai);

  if (!mulaiKerja || !selesaiKerja || selesaiKerja <= mulaiKerja) return { persen: 0, libur: false };

  const totalDurasiKerja = selesaiKerja - mulaiKerja;
  const persen = ((now - mulaiKerja) / totalDurasiKerja) * 100;
  return { persen: Math.round(clamp(persen, 0, 100)), libur: false };
}

/** Jumlah agenda yang statusnya otomatis "Sedang Berlangsung" saat ini. */
export function hitungAgendaBerlangsung(daftarAgenda, now) {
  return daftarAgenda.filter((a) => hitungStatusOtomatis(a, now) === STATUS_OTOMATIS.BERLANGSUNG).length;
}

/**
 * Agenda besok s/d 7 hari ke depan (TIDAK termasuk hari ini — itu sudah
 * ditampilkan di card lain), status belum dimulai. Dipakai bersama oleh
 * kartu statistik "Mendatang (7 Hari)" dan card "Agenda Mendatang" —
 * satu sumber kebenaran, supaya angka di kartu statistik selalu cocok
 * dengan jumlah kartu yang ditampilkan di bawahnya.
 */
export function hitungAgendaMendatang7Hari(daftarAgendaMendatang, now) {
  const awalBesok = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const batasAkhir = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  return daftarAgendaMendatang.filter((a) => {
    const tglAgenda = gabungTanggalJam(a.tanggal, '00:00');
    return hitungStatusOtomatis(a, now) === STATUS_OTOMATIS.BELUM_DIMULAI && tglAgenda >= awalBesok && tglAgenda < batasAkhir;
  });
}

/**
 * Merangkum seluruh metrik Executive Stats Bar dalam satu pemanggilan,
 * agar renderer cukup memanggil satu fungsi untuk seluruh bar.
 */
export function hitungRingkasanEksekutif(daftarAgenda, daftarAgendaMendatang, now) {
  const hariKerja = hitungPersentaseHariKerja(now);
  return {
    totalAgendaHariIni: hitungTotalAgendaHariIni(daftarAgenda),
    agendaSelesai: hitungAgendaSelesai(daftarAgenda, now),
    agendaBerlangsung: hitungAgendaBerlangsung(daftarAgenda, now),
    agendaMendatang7Hari: hitungAgendaMendatang7Hari(daftarAgendaMendatang || [], now).length,
    agendaTertunda: hitungAgendaTertunda(daftarAgenda),
    agendaPrioritasTinggi: hitungAgendaPrioritasTinggi(daftarAgenda, now),
    progressHariPersen: hitungProgressHari(now),
    persentaseHariKerjaPersen: hariKerja.persen,
    hariKerjaLibur: hariKerja.libur
  };
}
