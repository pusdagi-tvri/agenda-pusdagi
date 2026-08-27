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

async function tanganiSubmitForm(e) {
  e.preventDefault();
  const data = AdminRenderer.ambilDataForm();
  const { id_agenda, ...payload } = data;

  AdminRenderer.tampilkanPesan('sukses', 'Agenda dikirim, memuat ulang daftar…');

  if (id_agenda) {
    await AdminApiService.updateAgenda(id_agenda, payload);
  } else {
    await AdminApiService.buatAgenda(payload);
  }

  AdminRenderer.resetForm();
  await muatData();
  // Catatan: karena pengiriman lewat form (bukan fetch), validasi bentrok jadwal
  // dari server tidak bisa dibaca langsung di sini — cek daftar di bawah untuk
  // memastikan agenda benar-benar tersimpan sesuai yang diharapkan.
}

let arsipLengkap = []; // disimpan supaya pencarian bisa filter tanpa fetch ulang ke server

/** Satu panggilan (/dashboard) untuk mengisi dropdown pimpinan/ruangan, daftar agenda, dan arsip rapat. */
async function muatData() {
  const { pimpinan, ruangan, agenda, arsip, kecepatanTeks } = await AdminApiService.ambilRingkasan();
  AdminRenderer.isiDatalist('datalist-pimpinan', pimpinan, 'nama_lengkap');
  AdminRenderer.isiDatalist('datalist-ruangan', ruangan, 'nama_ruangan');
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

/** Menyimpan pengaturan kecepatan running teks (1-10) ke sheet Pengaturan. */
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

  if (AdminAuth.sudahLogin()) {
    bukaPanel();
  } else {
    AdminRenderer.tampilkanLogin();
  }
}

window.addEventListener('DOMContentLoaded', init);
