/**
 * ============================================================
 *  adminApp.js
 *  Entry point Admin Panel.
 * ============================================================
 */

import { AdminAuth } from './adminAuth.js';
import { AdminApiService } from './adminApiService.js';
import { AdminRenderer } from './adminRenderer.js';

function mulaiEdit(agenda) {
  AdminRenderer.isiFormUntukEdit(agenda);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Membuka modal kustom untuk minta alasan pembatalan — bukan prompt() bawaan browser,
 *  karena prompt() sering diblokir/tidak muncul di banyak browser mobile. */
function batalkanAgenda(agenda) {
  const modal = document.getElementById('modal-batalkan');
  const inputAlasan = document.getElementById('modal-batalkan-alasan');
  document.getElementById('modal-batalkan-judul').textContent = `"${agenda.judul_kegiatan}"`;
  inputAlasan.value = '';
  modal.classList.remove('hidden');

  const tombolKonfirmasi = document.getElementById('modal-batalkan-konfirmasi');
  const tombolTutup = document.getElementById('modal-batalkan-tutup');

  function tutup() {
    modal.classList.add('hidden');
    tombolKonfirmasi.removeEventListener('click', konfirmasi);
    tombolTutup.removeEventListener('click', tutup);
  }

  async function konfirmasi() {
    const alasan = inputAlasan.value.trim();
    tutup();
    AdminRenderer.tampilkanPesan('sukses', 'Permintaan pembatalan dikirim, memuat ulang daftar…');
    await AdminApiService.batalkanAgenda(agenda.id_agenda, alasan);
    await muatData();
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

/** Satu panggilan (/dashboard) untuk mengisi dropdown pimpinan/ruangan, daftar agenda, dan arsip rapat. */
async function muatData() {
  const { pimpinan, ruangan, agenda, arsip } = await AdminApiService.ambilRingkasan();
  AdminRenderer.isiDatalist('datalist-pimpinan', pimpinan, 'nama_lengkap');
  AdminRenderer.isiDatalist('datalist-ruangan', ruangan, 'nama_ruangan');
  AdminRenderer.renderDaftarAgenda(agenda, mulaiEdit, batalkanAgenda);
  AdminRenderer.renderArsip(arsip, mulaiEdit); // pakai form yang sama — isi notulen lewat alur edit biasa
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

function init() {
  document.getElementById('form-login').addEventListener('submit', tanganiSubmitLogin);
  document.getElementById('form-agenda').addEventListener('submit', tanganiSubmitForm);
  document.getElementById('tombol-reset-form').addEventListener('click', () => AdminRenderer.resetForm());
  document.getElementById('tombol-logout').addEventListener('click', tanganiLogout);

  if (AdminAuth.sudahLogin()) {
    bukaPanel();
  } else {
    AdminRenderer.tampilkanLogin();
  }
}

window.addEventListener('DOMContentLoaded', init);
