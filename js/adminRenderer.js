/**
 * ============================================================
 *  adminRenderer.js
 *  Satu-satunya modul yang menyentuh DOM di Admin Panel.
 * ============================================================
 */

const $ = (id) => document.getElementById(id);

const PETA_ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHTML = (nilai) => (nilai === null || nilai === undefined ? '' : String(nilai).replace(/[&<>"']/g, c => PETA_ESCAPE[c]));

/** Mengubah 'yyyy-mm-dd' jadi 'dd-mm-yyyy'. Mengembalikan apa adanya kalau formatnya tidak dikenali. */
function formatTanggalID(isoStr) {
  const bagian = (isoStr || '').split('-');
  if (bagian.length !== 3) return isoStr || '';
  return `${bagian[2]}-${bagian[1]}-${bagian[0]}`;
}

export const AdminRenderer = {

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
      const rentang = (a.tanggal_selesai && a.tanggal_selesai !== a.tanggal) ? ` s/d ${formatTanggalID(a.tanggal_selesai)}` : '';
      tr.innerHTML = `
        <td class="py-3 px-3 whitespace-nowrap">${formatTanggalID(a.tanggal)}${rentang}</td>
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
    $('form-tanggal').value = agenda.tanggal;
    // Tampilkan kosong kalau sama dengan Tanggal Mulai (berarti agenda 1 hari biasa) —
    // supaya form tidak "terlihat" seperti multi-hari padahal bukan.
    $('form-tanggal-selesai').value = (agenda.tanggal_selesai && agenda.tanggal_selesai !== agenda.tanggal) ? agenda.tanggal_selesai : '';
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
    $('form-judul-panel').textContent = 'Tambah Agenda Baru';
    $('form-tombol-submit').textContent = 'Simpan Agenda';
  },

  ambilDataForm() {
    const tanggalMulai = $('form-tanggal').value;
    const tanggalSelesaiDiisi = $('form-tanggal-selesai').value;
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
        <td class="py-3 px-3 whitespace-nowrap">${formatTanggalID(a.tanggal)}</td>
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
