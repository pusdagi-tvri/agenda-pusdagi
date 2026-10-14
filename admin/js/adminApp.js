/**
 * ============================================================
 *  adminApp.js
 *  Entry point Admin Panel.
 * ============================================================
 */

import { AdminAuth } from './adminAuth.js';
import { AdminApiService } from './adminApiService.js';
import { AdminRenderer, formatTanggalID } from './adminRenderer.js';

function mulaiEdit(agenda) {
  AdminRenderer.isiFormUntukEdit(agenda);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Membuka modal kustom konfirmasi hapus — bukan prompt()/confirm() bawaan browser,
 *  karena keduanya sering diblokir/tidak muncul di banyak browser mobile. */
function batalkanAgenda(agenda) {
  const modal = document.getElementById('modal-batalkan');
  document.getElementById('modal-batalkan-judul').textContent = `"${agenda.judul_kegiatan}"`;
  modal.classList.remove('hidden');

  const tombolKonfirmasi = document.getElementById('modal-batalkan-konfirmasi');
  const tombolTutup = document.getElementById('modal-batalkan-tutup');

  function tutup() {
    modal.classList.add('hidden');
    tombolKonfirmasi.removeEventListener('click', konfirmasi);
    tombolTutup.removeEventListener('click', tutup);
  }

  async function konfirmasi() {
    tutup();
    AdminRenderer.tampilkanPesan('sukses', 'Menghapus agenda, memuat ulang daftar…');
    await AdminApiService.batalkanAgenda(agenda.id_agenda);
    await muatData();
    // Refresh kedua sebagai pengaman — kalau refresh pertama masih terlalu cepat
    // (penulisan di Apps Script belum benar-benar selesai), yang kedua ini menangkapnya.
    setTimeout(muatData, 3000);
  }

  tombolKonfirmasi.addEventListener('click', konfirmasi);
  tombolTutup.addEventListener('click', tutup);
}

let agendaTermuat = []; // salinan daftar agenda terakhir dari server — dipakai cek bentrok sebelum kirim

const potongJam = (j) => String(j || '').slice(0, 5);
const potongTanggal = (t) => String(t || '').slice(0, 10);

/**
 * Meniru aturan server (cariBentrokJadwal): bentrok kalau ada agenda aktif (bukan Batal)
 * dengan teks lokasi PERSIS sama, di tanggal mulai yang sama, dan jamnya tumpang tindih.
 * Dicek di sini karena pengiriman lewat form tersembunyi tidak bisa membaca penolakan server.
 * Server tetap jadi penentu akhir; ini cuma supaya admin langsung diberi tahu.
 */
function cariBentrokDiDaftar(data, idDikecualikan) {
  const mulaiBaru = potongJam(data.jam_mulai);
  const selesaiBaru = potongJam(data.jam_selesai);
  return agendaTermuat.find((a) => {
    if (a.status === 'Batal') return false;
    if (idDikecualikan && a.id_agenda === idDikecualikan) return false;
    if (a.id_ruangan !== data.id_ruangan || potongTanggal(a.tanggal) !== potongTanggal(data.tanggal)) return false;
    return mulaiBaru < potongJam(a.jam_selesai) && selesaiBaru > potongJam(a.jam_mulai);
  }) || null;
}

/** Saat edit, server cuma mengecek bentrok kalau tanggal/jam/lokasi berubah — samakan di sini. */
function perluCekBentrok(data) {
  if (!data.id_agenda) return true;
  const lama = agendaTermuat.find((a) => a.id_agenda === data.id_agenda);
  if (!lama) return true;
  return !(potongTanggal(lama.tanggal) === potongTanggal(data.tanggal)
    && potongJam(lama.jam_mulai) === potongJam(data.jam_mulai)
    && potongJam(lama.jam_selesai) === potongJam(data.jam_selesai)
    && lama.id_ruangan === data.id_ruangan);
}

async function tanganiSubmitForm(e) {
  e.preventDefault();
  const data = AdminRenderer.ambilDataForm();
  const { id_agenda, ...payload } = data;

  if (perluCekBentrok(data)) {
    const bentrok = cariBentrokDiDaftar(data, id_agenda);
    if (bentrok) {
      AdminRenderer.tampilkanPesan(
        'error',
        `Jadwal bentrok, agenda belum disimpan. Sudah ada "${bentrok.judul_kegiatan}" di ${bentrok.id_ruangan} pada ${formatTanggalID(bentrok.tanggal)}, ${potongJam(bentrok.jam_mulai)}-${potongJam(bentrok.jam_selesai)}. Ubah lokasi atau jam, lalu simpan lagi.`,
        10000
      );
      return;
    }
  }

  // Berkas ditangani terpisah dari field lain (butuh proses upload sendiri via
  // form multipart) — kalau admin pilih file baru, upload dulu & catat fileKey-nya;
  // kalau tidak pilih file baru (mis. lagi edit, tidak mau ganti), pakai fileKey
  // yang sudah ada sebelumnya (disimpan di dataset.existing saat isiFormUntukEdit).
  const inputBerkas = document.getElementById('form-berkas');
  const fileBaru = inputBerkas.files[0];

  if (fileBaru) {
    AdminRenderer.tampilkanPesan('sukses', `Membaca file "${fileBaru.name}" (${fileBaru.size} bytes)…`);
    const fileKey = `berkas_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await AdminApiService.uploadBerkas(fileKey, inputBerkas);
    AdminRenderer.tampilkanPesan('sukses', `Berkas terkirim dengan fileKey: ${fileKey}`);
    await new Promise((r) => setTimeout(r, 1500)); // beri waktu pesan di atas terbaca dulu
    payload.berkas = fileKey; // ekstensi ditentukan & ditambahkan otomatis di backend
  } else {
    payload.berkas = inputBerkas.dataset.existing || '';
  }

  AdminRenderer.tampilkanPesan('sukses', 'Agenda dikirim, memuat ulang daftar…');
  console.log('[tanganiSubmitForm] mode=' + (id_agenda ? 'UPDATE id=' + id_agenda : 'CREATE') + ', payload.berkas=' + payload.berkas + ', payload lengkap=' + JSON.stringify(payload));

  if (id_agenda) {
    await AdminApiService.updateAgenda(id_agenda, payload);
  } else {
    await AdminApiService.buatAgenda(payload);
  }

  AdminRenderer.resetForm();
  await muatData();

  // Pengiriman lewat form tidak bisa membaca balasan server, jadi untuk agenda BARU kita
  // cek sendiri apakah benar muncul di daftar (tunggu sebentar kalau server belum selesai).
  // Kalau tetap tidak muncul, kemungkinan server menolaknya (bentrok yang tidak terlihat
  // di daftar ini, atau data tidak lengkap) — beri tahu admin, jangan diam saja.
  if (!id_agenda) {
    const adaDiDaftar = () => agendaTermuat.some((a) =>
      a.judul_kegiatan === payload.judul_kegiatan
      && potongTanggal(a.tanggal) === potongTanggal(payload.tanggal)
      && potongJam(a.jam_mulai) === potongJam(payload.jam_mulai));
    if (!adaDiDaftar()) {
      await new Promise((r) => setTimeout(r, 4000));
      await muatData();
    }
    if (adaDiDaftar()) {
      AdminRenderer.tampilkanPesan('sukses', 'Agenda tersimpan.');
    } else {
      AdminRenderer.tampilkanPesan(
        'error',
        'Agenda belum muncul di daftar, kemungkinan ditolak server (mis. bentrok jadwal atau data belum lengkap). Periksa daftar agenda lalu coba simpan lagi.',
        10000
      );
    }
  }
}

let arsipLengkap = []; // disimpan supaya pencarian bisa filter tanpa fetch ulang ke server

/** Satu panggilan (/dashboard) untuk mengisi dropdown pimpinan/ruangan, daftar agenda, dan arsip rapat. */
async function muatData() {
  const { pimpinan, ruangan, agenda, arsip, kecepatanTeks } = await AdminApiService.ambilRingkasan();
  AdminRenderer.isiDatalist('datalist-pimpinan', pimpinan, 'nama_lengkap');
  AdminRenderer.isiDatalist('datalist-ruangan', ruangan, 'nama_ruangan');
  agendaTermuat = agenda;
  AdminRenderer.renderDaftarAgenda(agenda, mulaiEdit, batalkanAgenda);

  // Jangan timpa kalau field-nya sedang aktif diketik (fokus) — hindari mengganggu input berjalan.
  const inputKecepatan = document.getElementById('form-kecepatan-teks');
  if (inputKecepatan && document.activeElement !== inputKecepatan) inputKecepatan.value = kecepatanTeks;

  arsipLengkap = arsip;
  terapkanPencarianArsip(); // supaya kata kunci yang sudah diketik tetap berlaku setelah refresh data
}

/** Filter arsip berdasarkan kata kunci di kolom judul, tanggal, penyelenggara, atau peserta. */
function terapkanPencarianArsip() {
  const kataKunci = (document.getElementById('cari-arsip').value || '').trim().toLowerCase();
  const hasil = !kataKunci ? arsipLengkap : arsipLengkap.filter(a => {
    // Sertakan tanggal versi mentah (2026-08-19) DAN versi tampilan (19-08-2026) —
    // pengguna wajar mengetik sesuai yang terlihat di tabel, bukan format aslinya.
    const gabungan = [a.judul_kegiatan, a.tanggal, formatTanggalID(a.tanggal), a.penyelenggara, a.peserta].join(' ').toLowerCase();
    return gabungan.includes(kataKunci);
  });
  AdminRenderer.renderArsip(hasil, mulaiEdit); // pakai form yang sama — isi notulen lewat alur edit biasa
}

async function bukaPanel() {
  AdminRenderer.tampilkanPanel();
  try {
    await muatData();
  } catch (err) {
    AdminRenderer.tampilkanPesan('error', 'Gagal memuat data: ' + err.message);
  }
}

async function tanganiSubmitLogin(e) {
  e.preventDefault();
  const token = document.getElementById('input-token').value.trim();
  if (!token) return;

  AdminAuth.login(token);

  try {
    await AdminApiService.ambilRingkasan(); // panggilan ringan (lewat /dashboard) untuk validasi token
    await bukaPanel();
  } catch (err) {
    AdminAuth.logout();
    console.error('[adminApp.js] Gagal login:', err);
    AdminRenderer.tampilkanErrorLogin(`Gagal terhubung ke server: ${err.message}`);
  }
}

function tanganiLogout() {
  AdminAuth.logout();
  AdminRenderer.tampilkanLogin();
}

/** Toggle mode gelap/terang — disimpan di localStorage supaya pilihan bertahan lintas refresh. */
function inisialisasiToggleTemaAdmin() {
  const tombol = document.getElementById('tombol-tema-admin');
  if (!tombol) return;

  tombol.addEventListener('click', () => {
    const sudahGelap = document.documentElement.getAttribute('data-theme') === 'dark';
    if (sudahGelap) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('tema-admin', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('tema-admin', 'dark');
    }
  });
}

/** Membuat & mengunduh PDF rekap (tab baru, langsung unduh — tanpa preview). */
function unduhRekapPDF() {
  const pesan = document.getElementById('pesan-rekap');
  const rentang = bacaFilterTanggalRekap(pesan);
  if (!rentang) return;

  pesan.textContent = 'Membuat PDF… tab baru akan terbuka begitu selesai (bisa sampai 1 menit).';
  pesan.style.color = '#6B7280';
  window.open(AdminApiService.urlRekapPDF(rentang.dari, rentang.sampai, 'unduh'), '_blank');
}

/** Membaca & memvalidasi rentang tanggal dari form filter Rekap. Null kalau tidak valid. */
function bacaFilterTanggalRekap(pesanEl) {
  const dari = document.getElementById('rekap-dari').value;
  const sampai = document.getElementById('rekap-sampai').value;
  if (!dari || !sampai) {
    pesanEl.textContent = 'Isi kedua tanggal dulu.';
    pesanEl.style.color = '#DC2626';
    return null;
  }
  if (dari > sampai) {
    pesanEl.textContent = '"Dari Tanggal" tidak boleh setelah "Sampai Tanggal".';
    pesanEl.style.color = '#DC2626';
    return null;
  }
  return { dari, sampai };
}

function unduhRekapExcel() {
  const pesan = document.getElementById('pesan-rekap');
  const rentang = bacaFilterTanggalRekap(pesan);
  if (!rentang) return;

  pesan.textContent = 'Membuat Excel… tab baru akan terbuka begitu selesai (bisa sampai 1 menit).';
  pesan.style.color = '#6B7280';
  window.open(AdminApiService.urlRekapExcel(rentang.dari, rentang.sampai), '_blank');
}

async function simpanKecepatanTeks() {
  const input = document.getElementById('form-kecepatan-teks');
  const pesan = document.getElementById('pesan-kecepatan');
  let nilai = parseInt(input.value, 10);

  if (isNaN(nilai) || nilai < 1 || nilai > 10) {
    pesan.textContent = 'Isi angka 1-10.';
    pesan.style.color = '#DC2626';
    return;
  }

  pesan.textContent = 'Menyimpan…';
  pesan.style.color = '#6B7280';
  try {
    await AdminApiService.simpanKecepatanTeks(nilai);
    setTimeout(() => {
      pesan.textContent = 'Tersimpan.';
      pesan.style.color = '#059669';
    }, 2000);
  } catch (err) {
    pesan.textContent = 'Gagal menyimpan: ' + err.message;
    pesan.style.color = '#DC2626';
  }
}

function init() {
  inisialisasiToggleTemaAdmin();
  document.getElementById('form-login').addEventListener('submit', tanganiSubmitLogin);
  document.getElementById('form-agenda').addEventListener('submit', tanganiSubmitForm);
  document.getElementById('tombol-reset-form').addEventListener('click', () => AdminRenderer.resetForm());
  document.getElementById('tombol-logout').addEventListener('click', tanganiLogout);
  document.getElementById('cari-arsip').addEventListener('input', terapkanPencarianArsip);
  document.getElementById('tombol-simpan-kecepatan').addEventListener('click', simpanKecepatanTeks);
  document.getElementById('tombol-unduh-pdf').addEventListener('click', unduhRekapPDF);
  document.getElementById('tombol-unduh-excel').addEventListener('click', unduhRekapExcel);

  if (AdminAuth.sudahLogin()) {
    bukaPanel();
  } else {
    AdminRenderer.tampilkanLogin();
  }
}

window.addEventListener('DOMContentLoaded', init);
