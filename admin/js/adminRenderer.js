/**
 * ============================================================
 *  adminRenderer.js
 *  Satu-satunya modul yang menyentuh DOM di Admin Panel.
 * ============================================================
 */

const $ = (id) => document.getElementById(id);

const PETA_ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHTML = (nilai) => (nilai === null || nilai === undefined ? '' : String(nilai).replace(/[&<>"']/g, c => PETA_ESCAPE[c]));

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** Mengisi 3 dropdown (hari/bulan/tahun) untuk satu field tanggal. wajib=false artinya boleh dibiarkan kosong (Tanggal Selesai). */
function isiDropdownTanggal(prefix, wajib) {
  const selHari = $(`${prefix}-hari`);
  const selBulan = $(`${prefix}-bulan`);
  const selTahun = $(`${prefix}-tahun`);
  const kosong = wajib ? '' : '<option value="">-</option>';

  selHari.innerHTML = kosong + Array.from({ length: 31 }, (_, i) => i + 1)
    .map(h => `<option value="${String(h).padStart(2, '0')}">${h}</option>`).join('');

  selBulan.innerHTML = kosong + NAMA_BULAN
    .map((nama, i) => `<option value="${String(i + 1).padStart(2, '0')}">${nama}</option>`).join('');

  const tahunSekarang = new Date().getFullYear();
  selTahun.innerHTML = kosong + Array.from({ length: 6 }, (_, i) => tahunSekarang - 1 + i)
    .map(t => `<option value="${t}">${t}</option>`).join('');
}

/** Menggabungkan 3 dropdown jadi string ISO 'yyyy-mm-dd'. Kembalikan '' kalau ada yang belum dipilih (dan wajib=false). */
function gabungTanggal(prefix) {
  const hari = $(`${prefix}-hari`).value;
  const bulan = $(`${prefix}-bulan`).value;
  const tahun = $(`${prefix}-tahun`).value;
  if (!hari || !bulan || !tahun) return '';
  return `${tahun}-${bulan}-${hari}`;
}

/** Mengisi 3 dropdown dari string ISO 'yyyy-mm-dd'. Kosongkan semua kalau isoStr kosong/tidak valid. */
function pecahTanggal(prefix, isoStr) {
  const bagian = (isoStr || '').split('-');
  $(`${prefix}-tahun`).value = bagian[0] || '';
  $(`${prefix}-bulan`).value = bagian[1] || '';
  $(`${prefix}-hari`).value = bagian[2] || '';
}

export const AdminRenderer = {
  /** Dipanggil sekali saat halaman dimuat — mengisi opsi dropdown hari/bulan/tahun. */
  inisialisasiDropdownTanggal() {
    isiDropdownTanggal('form-tanggal', true);
    isiDropdownTanggal('form-tanggal-selesai', false);
  },

  tampilkanLogin() {
    $('layar-login').classList.remove('hidden');
    $('layar-panel').classList.add('hidden');
  },

  tampilkanPanel() {
    $('layar-login').classList.add('hidden');
    $('layar-panel').classList.remove('hidden');
  },

  isiDatalist(id, items, labelField) {
    const el = $(id);
    el.innerHTML = items.map(item => `<option value="${escapeHTML(item[labelField])}"></option>`).join('');
  },

  renderDaftarAgenda(daftar, onEdit, onBatalkan) {
    const tbody = $('tabel-agenda-body');
    if (!daftar.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-caption py-6">Belum ada agenda.</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    daftar.forEach(a => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-white/[0.06]';
      const rentang = (a.tanggal_selesai && a.tanggal_selesai !== a.tanggal) ? ` s/d ${a.tanggal_selesai}` : '';
      tr.innerHTML = `
        <td class="py-3 px-3 whitespace-nowrap">${a.tanggal}${rentang}</td>
        <td class="py-3 px-3">${a.jam_mulai}–${a.jam_selesai}</td>
        <td class="py-3 px-3">${escapeHTML(a.judul_kegiatan)}</td>
        <td class="py-3 px-3"><span class="badge-status badge-info">${escapeHTML(a.status)}</span></td>
        <td class="py-3 px-3">${escapeHTML(a.prioritas) || '-'}</td>
        <td class="py-3 px-3 text-right whitespace-nowrap"></td>
      `;

      const tdAksi = tr.querySelector('td:last-child');

      const tombolEdit = document.createElement('button');
      tombolEdit.textContent = 'Edit';
      tombolEdit.className = 'text-[#60A5FA] text-sm font-medium mr-3 hover-brighten';
      tombolEdit.addEventListener('click', () => onEdit(a));

      if (a.status !== 'Batal') {
        const tombolBatal = document.createElement('button');
        tombolBatal.textContent = 'Batalkan';
        tombolBatal.className = 'text-[#EF4444] text-sm font-medium hover-brighten';
        tombolBatal.addEventListener('click', () => onBatalkan(a));
        tdAksi.append(tombolEdit, tombolBatal);
      } else {
        tdAksi.append(tombolEdit);
      }

      tbody.appendChild(tr);
    });
  },

  isiFormUntukEdit(agenda) {
    $('form-id-agenda').value = agenda.id_agenda;
    $('form-judul').value = agenda.judul_kegiatan;
    pecahTanggal('form-tanggal', agenda.tanggal);
    // Tampilkan kosong kalau sama dengan Tanggal Mulai (berarti agenda 1 hari biasa) —
    // supaya form tidak "terlihat" seperti multi-hari padahal bukan.
    pecahTanggal('form-tanggal-selesai', (agenda.tanggal_selesai && agenda.tanggal_selesai !== agenda.tanggal) ? agenda.tanggal_selesai : '');
    $('form-jam-mulai').value = agenda.jam_mulai;
    $('form-jam-selesai').value = agenda.jam_selesai;
    $('form-pimpinan').value = agenda.id_pimpinan || '';
    $('form-ruangan').value = agenda.id_ruangan || '';
    $('form-kategori').value = agenda.kategori || '';
    $('form-prioritas').value = agenda.prioritas || 'Sedang';
    $('form-peserta').value = agenda.peserta || '';
    $('form-penyelenggara').value = agenda.penyelenggara || '';
    $('form-catatan').value = agenda.catatan || '';
    $('form-notulen').value = agenda.notulen || '';
    $('form-judul-panel').textContent = 'Edit Agenda';
    $('form-tombol-submit').textContent = 'Simpan Perubahan';
  },

  resetForm() {
    $('form-agenda').reset();
    $('form-id-agenda').value = '';
    pecahTanggal('form-tanggal', '');
    pecahTanggal('form-tanggal-selesai', '');
    $('form-judul-panel').textContent = 'Tambah Agenda Baru';
    $('form-tombol-submit').textContent = 'Simpan Agenda';
  },

  ambilDataForm() {
    const tanggalMulai = gabungTanggal('form-tanggal');
    const tanggalSelesaiDiisi = gabungTanggal('form-tanggal-selesai');
    return {
      id_agenda: $('form-id-agenda').value || null,
      judul_kegiatan: $('form-judul').value.trim(),
      tanggal: tanggalMulai,
      tanggal_selesai: tanggalSelesaiDiisi || tanggalMulai, // dikosongkan = agenda 1 hari
      jam_mulai: $('form-jam-mulai').value,
      jam_selesai: $('form-jam-selesai').value,
      id_pimpinan: $('form-pimpinan').value,
      id_ruangan: $('form-ruangan').value,
      kategori: $('form-kategori').value,
      prioritas: $('form-prioritas').value,
      peserta: $('form-peserta').value.trim(),
      penyelenggara: $('form-penyelenggara').value.trim(),
      catatan: $('form-catatan').value.trim(),
      notulen: $('form-notulen').value.trim()
    };
  },

  /** Arsip Rapat — daftar rapat yang sudah lewat, dengan tombol untuk isi/edit notulen. */
  renderArsip(daftar, onEdit) {
    const tbody = $('tabel-arsip-body');
    if (!daftar.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-caption py-6">Belum ada rapat yang sudah lewat.</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    daftar.forEach(a => {
      const adaNotulen = !!(a.notulen && a.notulen.trim());
      const previewNotulen = adaNotulen
        ? escapeHTML(a.notulen.length > 60 ? a.notulen.slice(0, 60) + '…' : a.notulen)
        : '<span class="text-caption normal-case tracking-normal">Belum diisi</span>';

      const tr = document.createElement('tr');
      tr.className = 'border-b border-white/[0.06]';
      tr.innerHTML = `
        <td class="py-3 px-3 whitespace-nowrap">${a.tanggal}</td>
        <td class="py-3 px-3">${escapeHTML(a.judul_kegiatan)}</td>
        <td class="py-3 px-3">${escapeHTML(a.penyelenggara) || '-'}</td>
        <td class="py-3 px-3 max-w-[220px]">${previewNotulen}</td>
        <td class="py-3 px-3 text-right whitespace-nowrap"></td>
      `;

      const tombolEdit = document.createElement('button');
      tombolEdit.textContent = adaNotulen ? 'Edit Notulen' : 'Isi Notulen';
      tombolEdit.className = 'text-[#60A5FA] text-sm font-medium hover-brighten';
      tombolEdit.addEventListener('click', () => onEdit(a));
      tr.querySelector('td:last-child').appendChild(tombolEdit);

      tbody.appendChild(tr);
    });
  },

  tampilkanPesan(tipe, teks) {
    const el = $('pesan-panel');
    const warna = tipe === 'error'
      ? 'background:rgba(239,68,68,0.14); color:#FCA5A5; border:1px solid rgba(239,68,68,0.3);'
      : 'background:rgba(34,197,94,0.14); color:#86EFAC; border:1px solid rgba(34,197,94,0.3);';
    el.style.cssText = warna;
    el.textContent = teks;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 5000);
  },

  tampilkanErrorLogin(teks) {
    $('pesan-login').textContent = teks;
    $('pesan-login').classList.remove('hidden');
  }
};
