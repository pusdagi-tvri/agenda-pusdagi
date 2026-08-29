/**
 * ============================================================
 *  app.js
 *  Entry point aplikasi. Menyatukan seluruh modul dan mengatur
 *  siklus hidup dashboard: fetch data → cache → render → auto
 *  refresh → tick per detik → offline/error handling.
 *
 *  CARA PAKAI (di index.html):
 *    <script type="module" src="js/app.js"></script>
 * ============================================================
 */

import { CONFIG } from './config.js';
import { CacheService } from './cacheService.js';
import { ambilDataDashboard, ApiError } from './apiService.js';
import { ConnectionMonitor } from './connectionMonitor.js';
import { ClockService } from './clockService.js';
import { Renderer } from './renderer.js';
import { aktifkanAutoScale } from './stageScaler.js';
import { clamp } from './utils.js';

/** State aplikasi — sengaja disimpan sesederhana mungkin (bukan store/reactive framework). */
const state = {
  daftarAgendaTerakhir: [],
  agendaMendatang: [], // hari ini + ke depan — khusus untuk card "Agenda Berikutnya" agar bisa lintas hari
  sudahAdaData: false, // beda dari "daftarAgendaTerakhir.length" — true begitu fetch/cache PERNAH berhasil, walau hasilnya 0 agenda
  detikSejakRefresh: 0,
  sedangOffline: false,
  gagalBerturutTurut: 0
};

/* ---------------------------------------------------------- 1. RENDER SIKLUS CEPAT (tiap detik) */
function tickCepat() {
  const now = new Date();
  Renderer.renderJam(now);

  // Dulu dicek lewat "daftarAgendaTerakhir.length", tapi itu keliru menyamakan
  // "belum pernah fetch" dengan "sudah fetch, dan memang nol agenda hari ini" —
  // akibatnya saat agenda hari ini benar-benar 0, seluruh card macet di skeleton.
  if (state.sudahAdaData) {
    Renderer.renderExecutiveBar(state.daftarAgendaTerakhir, state.agendaMendatang, now);
    Renderer.renderBerlangsung(state.daftarAgendaTerakhir, now);
    Renderer.renderBerikutnya(state.daftarAgendaTerakhir, now);
    Renderer.renderStatistikKategori(state.daftarAgendaTerakhir);
    Renderer.renderRunningText(state.daftarAgendaTerakhir, now);
  } else {
    // Benar-benar belum ada data sama sekali (sebelum fetch pertama selesai) —
    // Progress Hari & Persentase Jam Kerja tetap harus berjalan karena murni fungsi waktu.
    Renderer.renderExecutiveBar([], [], now);
  }

  state.detikSejakRefresh += 1;
  Renderer.perbaruiLabelRefresh(state.detikSejakRefresh);
}

/** Render yang cuma perlu diulang saat data berganti (siklus 15 detik) — timeline hari ini
 *  dan agenda mendatang sama-sama rebuild seluruh DOM-nya, jadi tidak perlu tiap detik. */
function renderStrukturLambat() {
  const now = new Date();
  Renderer.renderAgendaHariIni(state.daftarAgendaTerakhir, now);
  Renderer.renderAgendaMendatang(state.agendaMendatang, now);
}

/* ---------------------------------------------------------- 2. AMBIL DATA DARI API (siklus 15 detik) */
async function muatDataDariServer() {
  if (state.sedangOffline) {
    // Tidak perlu mencoba fetch bila browser sudah mendeteksi offline — hemat waktu tunggu timeout
    gunakanDataCacheJikaAda('Perangkat sedang offline — menampilkan data tersimpan terakhir.');
    return;
  }

  Renderer.tandaiSedangRefresh();

  try {
    const data = await ambilDataDashboard();
    const lookupRuangan = buatLookupRuangan(data.daftar_ruangan || []);
    const lookupPimpinan = buatLookupPimpinan(data.daftar_pimpinan || []);
    const daftarAgenda = saringMultiHariDiLibur(
      normalisasiAgenda(data.daftar_agenda_hari_ini || [], lookupRuangan, lookupPimpinan)
    );
    const agendaMendatang = normalisasiAgenda(data.daftar_agenda_mendatang || [], lookupRuangan, lookupPimpinan);

    terapkanKecepatanMarquee(data.kecepatan_running_teks);

    state.daftarAgendaTerakhir = daftarAgenda;
    state.agendaMendatang = agendaMendatang;
    state.sudahAdaData = true;
    state.detikSejakRefresh = 0;
    state.gagalBerturutTurut = 0;

    CacheService.simpan(daftarAgenda);
    Renderer.sembunyikanBanner();
    renderStrukturLambat();
    tickCepat(); // render langsung, tidak menunggu tick berikutnya
  } catch (err) {
    state.gagalBerturutTurut += 1;
    tanganiErrorFetch(err);
  } finally {
    Renderer.tandaiRefreshSelesai();
  }
}

/** Membuat peta id_ruangan → nama_ruangan, untuk data lama yang id_ruangan-nya masih berupa kode. */
/** Mengubah kecepatan (1-10, makin besar makin cepat) jadi durasi animasi (detik, makin kecil makin cepat),
 *  lalu diterapkan ke variabel CSS --durasi-marquee yang dipakai .marquee-track. */
let kecepatanTerakhirDiterapkan = null;
function terapkanKecepatanMarquee(kecepatanMentah) {
  const kecepatan = clamp(parseInt(kecepatanMentah, 10) || 5, 1, 10);
  if (kecepatan === kecepatanTerakhirDiterapkan) return; // hindari restart animasi tiap refresh kalau nilainya sama
  kecepatanTerakhirDiterapkan = kecepatan;

  const durasiDetik = 70 - kecepatan * 6; // kecepatan 1 → 64 detik (lambat), kecepatan 10 → 10 detik (cepat)
  document.documentElement.style.setProperty('--durasi-marquee', `${durasiDetik}s`);
}

/**
 * Agenda multi-hari tidak "jalan" di hari libur (Sabtu/Minggu, per JAM_KERJA_PER_HARI)
 * meski tanggalnya masih di dalam rentang tanggal_mulai..tanggal_selesai — jadi tidak
 * seharusnya tampil di "Agenda Hari Ini" pada hari itu. Agenda 1 hari yang memang
 * sengaja dijadwalkan di hari libur tetap tampil seperti biasa (tidak disaring).
 */
function saringMultiHariDiLibur(daftarAgenda) {
  const hariIniLibur = CONFIG.JAM_KERJA_PER_HARI[new Date().getDay()] === null;
  if (!hariIniLibur) return daftarAgenda;
  return daftarAgenda.filter((a) => {
    const multiHari = a.tanggal_selesai && a.tanggal_selesai !== a.tanggal;
    return !multiHari;
  });
}

function buatLookupRuangan(daftarRuangan) {
  const peta = {};
  daftarRuangan.forEach((r) => { peta[r.id_ruangan] = r.nama_ruangan; });
  return peta;
}

/** Membuat peta id_pimpinan → nama_lengkap, dipakai menampilkan nama pimpinan (bukan kode) di dashboard. */
function buatLookupPimpinan(daftarPimpinan) {
  const peta = {};
  daftarPimpinan.forEach((p) => { peta[p.id_pimpinan] = p.nama_lengkap; });
  return peta;
}

/** Menyeragamkan field tanggal/jam_mulai/jam_selesai agar selalu string, jaga-jaga jika API mengembalikan tipe Date.
 *  Sekalian resolusi id_ruangan → nama ruangan dan id_pimpinan → nama pimpinan yang bisa dibaca (fallback ke
 *  nilai aslinya kalau tidak ketemu — cocok untuk data yang field-nya sudah diisi nama langsung, bukan kode). */
function normalisasiAgenda(daftar, lookupRuangan, lookupPimpinan) {
  lookupRuangan = lookupRuangan || {};
  lookupPimpinan = lookupPimpinan || {};
  return daftar.map((a) => ({
    ...a,
    tanggal: String(a.tanggal),
    tanggal_selesai: String(a.tanggal_selesai || a.tanggal),
    jam_mulai: String(a.jam_mulai),
    jam_selesai: String(a.jam_selesai),
    ruanganTampilan: lookupRuangan[a.id_ruangan] || a.id_ruangan,
    pimpinanTampilan: lookupPimpinan[a.id_pimpinan] || a.id_pimpinan || ''
  }));
}

/* ---------------------------------------------------------- 3. ERROR HANDLING */
function tanganiErrorFetch(err) {
  const pesan = err instanceof ApiError
    ? pesanErrorUntukPengguna(err.tipe)
    : 'Terjadi kesalahan tak terduga saat mengambil data.';

  console.error('[app.js] Gagal memuat data dashboard:', err);

  const adaCache = gunakanDataCacheJikaAda(pesan);
  if (!adaCache) {
    Renderer.tampilkanBanner('error', pesan + ' Mencoba lagi secara otomatis…');
  }
}

function pesanErrorUntukPengguna(tipe) {
  switch (tipe) {
    case 'timeout': return 'Koneksi ke server lambat/timeout.';
    case 'network': return 'Tidak dapat menjangkau server.';
    case 'format':  return 'Format data dari server tidak sesuai.';
    default:        return 'Server mengembalikan respons yang tidak valid.';
  }
}

/** Mengambil data dari cache sebagai fallback. Mengembalikan true jika cache ditemukan & dipakai. */
function gunakanDataCacheJikaAda(alasan) {
  const cache = CacheService.ambil();
  if (!cache) return false;

  state.daftarAgendaTerakhir = cache.data;
  state.sudahAdaData = true;
  const menitLalu = Math.round(cache.umurMs / 60000);
  Renderer.tampilkanBanner('offline', `${alasan} (data cache — ${menitLalu < 1 ? 'baru saja' : menitLalu + ' menit lalu'})`);
  renderStrukturLambat();
  tickCepat();
  return true;
}

/* ---------------------------------------------------------- 4. OFFLINE MODE */
function inisialisasiPemantauKoneksi() {
  ConnectionMonitor.pantau((online) => {
    state.sedangOffline = !online;
    if (!online) {
      Renderer.tampilkanBanner('offline', 'Perangkat kehilangan koneksi internet.');
      gunakanDataCacheJikaAda('Perangkat sedang offline.');
    } else {
      Renderer.sembunyikanBanner();
      muatDataDariServer(); // koneksi pulih → langsung sinkronisasi ulang
    }
  });
}

/** Toggle mode gelap/terang — disimpan di localStorage supaya pilihan bertahan lintas refresh. */
function inisialisasiToggleTema() {
  const tombol = document.getElementById('tombol-tema');
  if (!tombol) return;

  tombol.addEventListener('click', () => {
    const sudahTerang = document.documentElement.getAttribute('data-theme') === 'light';
    if (sudahTerang) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('tema-dashboard', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('tema-dashboard', 'light');
    }
  });
}

/* ---------------------------------------------------------- 5. INISIALISASI APLIKASI */
async function init() {
  aktifkanAutoScale();
  inisialisasiToggleTema();
  ClockService.mulai(() => {}); // jam sebenarnya sudah dirender lewat tickCepat(); modul ini dipakai bila ingin memisah lebih lanjut

  inisialisasiPemantauKoneksi();

  // Tampilkan cache dulu (jika ada) agar layar tidak kosong selama menunggu fetch pertama
  gunakanDataCacheJikaAda('Memuat data tersimpan sementara data terbaru diambil…');
  Renderer.sembunyikanBanner();

  await muatDataDariServer();
  Renderer.sembunyikanLoadingScreen();

  setInterval(tickCepat, CONFIG.TICK_INTERVAL_MS);
  setInterval(muatDataDariServer, CONFIG.REFRESH_INTERVAL_MS);
}

window.addEventListener('DOMContentLoaded', init);
