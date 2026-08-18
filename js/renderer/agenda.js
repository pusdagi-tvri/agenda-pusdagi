/**
 * ============================================================
 *  renderer/agenda.js
 *  Render konten inti agenda: timeline hari ini, sedang berlangsung,
 *  berikutnya, dan agenda mendatang (7 hari ke depan).
 * ============================================================
 */

import { STATUS_COLOR_CLASS, STATUS_OTOMATIS } from '../config.js';
import { escapeHTML, gabungTanggalJam, formatTanggalIndonesia } from '../utils.js';
import { hitungStatusOtomatis, hitungCountdown, cariAgendaBerlangsung, cariAgendaBerikutnya } from '../statusEngine.js';
import { hitungAgendaMendatang7Hari } from '../executiveMetrics.js';
import { $ } from './domHelpers.js';

const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function labelHariRelatif(tanggalStr, now) {
  const tgl = gabungTanggalJam(tanggalStr, '00:00');
  const selisihHari = Math.round((tgl - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
  if (selisihHari === 0) return 'Hari Ini';
  if (selisihHari === 1) return 'Besok';
  return formatTanggalSingkat(tanggalStr);
}

function formatTanggalSingkat(tanggalStr) {
  const [, bulan, tgl] = tanggalStr.split('-').map(Number);
  return `${tgl} ${BULAN_SINGKAT[bulan - 1]}`;
}

/** Tambah N hari ke string tanggal ISO 'yyyy-mm-dd', kembalikan ISO baru. */
function tambahHari(tanggalStr, jumlahHari) {
  const [t, b, h] = tanggalStr.split('-').map(Number);
  const d = new Date(t, b - 1, h + jumlahHari);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Memecah satu agenda multi-hari jadi beberapa "salinan" — satu per hari, judul dan
 * detail lain sama persis, cuma tanggalnya beda — supaya di Agenda Mendatang tampil
 * sebagai kartu terpisah per hari (bukan satu kartu dengan badge "s/d ..."). Dibatasi
 * maksimal 7 hari per agenda, dan tidak melewati batasAkhir (ujung jendela 7 hari ke depan).
 */
function pecahAgendaMultiHari(agenda, batasAkhirISO) {
  const multiHari = agenda.tanggal_selesai && agenda.tanggal_selesai !== agenda.tanggal;
  if (!multiHari) return [agenda];

  const hasil = [];
  let tglBerjalan = agenda.tanggal;
  for (let i = 0; i < 7; i++) {
    if (tglBerjalan > agenda.tanggal_selesai || tglBerjalan >= batasAkhirISO) break;
    hasil.push({ ...agenda, tanggal: tglBerjalan });
    tglBerjalan = tambahHari(tglBerjalan, 1);
  }
  return hasil;
}

const WARNA_STATUS_HEX = {
  [STATUS_OTOMATIS.BELUM_DIMULAI]: '#2563EB',
  [STATUS_OTOMATIS.BERLANGSUNG]: '#F59E0B',
  [STATUS_OTOMATIS.SELESAI]: '#22C55E',
  [STATUS_OTOMATIS.BATAL]: '#EF4444'
};

export const AgendaRenderer = {

  /**
   * Timeline vertikal seluruh agenda hari ini (kolom kiri) — bukan cuma
   * satu agenda seperti card "Sedang Berlangsung" di kolom kanan. Agenda
   * yang sedang berlangsung disorot (border + latar tint), sesuai referensi
   * desain yang diberikan.
   */
  renderAgendaHariIni(daftarAgenda, now) {
    const skeleton = $('agenda-hari-ini-skeleton');
    const content = $('agenda-hari-ini-content');
    const tanggalLabel = $('tanggal-timeline');
    if (!content) return;

    if (skeleton) skeleton.classList.add('hidden');
    content.classList.remove('hidden');

    const aktif = [...daftarAgenda].filter((a) => a.status !== 'Batal').sort((a, b) => gabungTanggalJam(a.tanggal, a.jam_mulai) - gabungTanggalJam(b.tanggal, b.jam_mulai));

    if (tanggalLabel) tanggalLabel.textContent = formatTanggalIndonesia(now);

    if (!aktif.length) {
      if (content.dataset.signature !== '') {
        content.innerHTML = `<p class="text-body-elegant flex items-center h-full">Tidak ada agenda yang terjadwal hari ini.</p>`;
        content.dataset.signature = '';
      }
      return;
    }

    // Status tiap baris bisa berubah murni karena waktu berjalan (Belum Dimulai → Berlangsung
    // → Selesai) tanpa data baru — jadi signature ikut menyertakan status per baris, bukan cuma ID.
    // Status expand/ciutkan (Lihat Semua) ikut disertakan supaya rebuild terjadi kalau tombol diklik.
    const expanded = content.dataset.expanded === '1';
    const signature = aktif.map((a) => `${a.id_agenda}:${hitungStatusOtomatis(a, now)}`).join(',') + '|' + expanded;
    if (content.dataset.signature === signature) return;
    content.dataset.signature = signature;

    const BATAS_TAMPIL = 4;
    const ditampilkan = expanded ? aktif : aktif.slice(0, BATAS_TAMPIL);

    const baris = ditampilkan.map((a) => {
      const status = hitungStatusOtomatis(a, now);
      const warnaHex = WARNA_STATUS_HEX[status];
      const aktifBerlangsung = status === STATUS_OTOMATIS.BERLANGSUNG;
      const warnaBadge = STATUS_COLOR_CLASS[status];

      const multiHari = a.tanggal_selesai && a.tanggal_selesai !== a.tanggal;

      return `
        <div class="timeline-row" style="margin-bottom:22px;">
          <span class="timeline-dot ${aktifBerlangsung ? 'animate-pulse-ring' : ''}" style="background:${warnaHex}"></span>
          <div class="${aktifBerlangsung ? 'rounded-xl p-3' : ''}" ${aktifBerlangsung ? 'style="background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.25);"' : ''}>
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <span class="text-[13px] font-semibold" style="color:${warnaHex}">${a.jam_mulai}</span>
                ${multiHari ? `<span class="text-[11px] font-medium ml-2 px-2 py-0.5 rounded-full" style="background:rgba(139,92,246,0.15); color:#A78BFA;">s/d ${formatTanggalSingkat(a.tanggal_selesai)}</span>` : ''}
                <h3 class="text-[17px] font-semibold text-[#F8FAFC] truncate mt-0.5">${escapeHTML(a.judul_kegiatan)}</h3>
                ${a.penyelenggara ? `<p class="text-[13px] text-[#94A3B8] truncate mt-0.5">Penyelenggara: ${escapeHTML(a.penyelenggara)}</p>` : ''}
                <p class="text-[13px] text-[#94A3B8] truncate mt-0.5">${escapeHTML(a.ruanganTampilan) || '-'}${a.pimpinanTampilan ? ' · ' + escapeHTML(a.pimpinanTampilan) : ''}</p>
                ${a.peserta ? `<p class="text-[12px] text-[#64748B] truncate mt-0.5">Peserta: ${escapeHTML(a.peserta)}</p>` : ''}
              </div>
              <span class="badge-status ${warnaBadge.badge} text-[11px] shrink-0">${status}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const adaLebihBanyak = aktif.length > BATAS_TAMPIL;
    const tombolLihatSemua = adaLebihBanyak
      ? `<button id="tombol-lihat-semua-hari-ini" class="text-[13px] font-medium text-[#60A5FA] hover-brighten mt-1">
           ${expanded ? 'Ciutkan' : `Lihat Semua Agenda Hari Ini (${aktif.length})`}
         </button>`
      : '';

    content.innerHTML = `<div class="h-full overflow-y-auto pr-1">${baris}${tombolLihatSemua}</div>`;

    const tombol = content.querySelector('#tombol-lihat-semua-hari-ini');
    if (tombol) {
      tombol.addEventListener('click', () => {
        content.dataset.expanded = expanded ? '0' : '1';
        content.dataset.signature = ''; // paksa render ulang meski status agenda tidak berubah
        this.renderAgendaHariIni(daftarAgenda, now);
      });
    }
  },

  renderBerlangsung(daftarAgenda, now) {
    const skeleton = $('berlangsung-skeleton');
    const content = $('berlangsung-content');
    const card = $('card-berlangsung');
    if (!content) return;

    if (skeleton) skeleton.classList.add('hidden');
    content.classList.remove('hidden');

    const agenda = cariAgendaBerlangsung(daftarAgenda, now);

    if (!agenda) {
      if (content.dataset.signature !== '') {
        if (card) Object.values(STATUS_COLOR_CLASS).forEach((c) => card.classList.remove(c.accent, 'animate-soft-pulse'));
        content.innerHTML = `<p class="text-body-elegant text-sm">Tidak ada agenda yang sedang berlangsung saat ini.</p>`;
        content.dataset.signature = '';
      }
      return;
    }

    const { label, persenBerjalan } = hitungCountdown(agenda, now);
    const warna = STATUS_COLOR_CLASS[STATUS_OTOMATIS.BERLANGSUNG];

    const selesai = gabungTanggalJam(agenda.tanggal_selesai || agenda.tanggal, agenda.jam_selesai);
    const sisaMenit = selesai ? (selesai - now) / 60000 : 999;
    const hampirBerakhir = sisaMenit > 0 && sisaMenit <= 5;

    if (content.dataset.signature === agenda.id_agenda) {
      const fill = content.querySelector('[data-progress-fill]');
      const teks = content.querySelector('[data-progress-teks]');
      const lokasi = content.querySelector('[data-lokasi]');
      if (fill) fill.style.width = `${persenBerjalan}%`;
      if (teks) {
        teks.textContent = label;
        teks.classList.toggle('animate-blink', hampirBerakhir);
      }
      if (lokasi) lokasi.textContent = agenda.ruanganTampilan || '-';
      return;
    }
    content.dataset.signature = agenda.id_agenda;

    if (card) {
      Object.values(STATUS_COLOR_CLASS).forEach((c) => card.classList.remove(c.accent, 'animate-soft-pulse'));
      card.classList.add(warna.accent, 'animate-soft-pulse');
    }

    content.innerHTML = `
      <div class="badge-status ${warna.badge} animate-fade-in text-[12px]">
        <span class="status-dot ${warna.dot} animate-pulse-ring"></span> Sedang Berlangsung
      </div>
      <h3 class="text-heading text-xl mt-2 animate-fade-in truncate">${escapeHTML(agenda.judul_kegiatan)}</h3>
      <p class="text-body-elegant text-[13px] mt-1 truncate">
        ${agenda.jam_mulai} – ${agenda.jam_selesai} &nbsp;·&nbsp; <span data-lokasi>${escapeHTML(agenda.ruanganTampilan) || '-'}</span>
      </p>
      <div class="mt-3">
        <div class="progress-track-premium h-1.5 w-full">
          <div class="${warna.progress} h-full transition-premium progress-animated" data-progress-fill style="width:${persenBerjalan}%"></div>
        </div>
        <p class="text-caption mt-1.5 normal-case tracking-normal text-[12px] ${hampirBerakhir ? 'animate-blink' : ''}" data-progress-teks>${label}</p>
      </div>
    `;
  },

  /** Kartu ringkas — hanya 1 agenda berikutnya (ruang kartu ini terbatas). */
  renderBerikutnya(daftarAgenda, now) {
    const skeleton = $('berikutnya-skeleton');
    const content = $('berikutnya-content');
    if (!content) return;

    if (skeleton) skeleton.classList.add('hidden');
    content.classList.remove('hidden');

    const [agenda] = cariAgendaBerikutnya(daftarAgenda, now, 1);

    if (!agenda) {
      content.innerHTML = `<p class="text-body-elegant text-sm">Tidak ada agenda berikutnya hari ini.</p>`;
      content.dataset.signature = '';
      return;
    }

    if (content.dataset.signature === agenda.id_agenda) {
      const el = content.querySelector('[data-countdown]');
      if (el) el.textContent = hitungCountdown(agenda, now).label;
      return;
    }
    content.dataset.signature = agenda.id_agenda;

    const { label } = hitungCountdown(agenda, now);
    const warna = STATUS_COLOR_CLASS[STATUS_OTOMATIS.BELUM_DIMULAI];

    content.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <p class="text-[12px] text-[#94A3B8] uppercase tracking-wide">Agenda Berikutnya</p>
        <p class="font-semibold text-sm shrink-0 ml-3" style="color:#F59E0B" data-countdown>${label}</p>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="status-dot ${warna.dot} shrink-0"></span>
        <span class="text-[13px] text-caption normal-case tracking-normal">${agenda.jam_mulai}</span>
      </div>
      <h3 class="text-[16px] font-semibold text-[#F8FAFC] mt-1" style="display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.3;">${escapeHTML(agenda.judul_kegiatan)}</h3>
    `;
  },

  /**
   * Menampilkan agenda 7 hari ke depan sebagai kartu horizontal — dipanggil
   * hanya saat data berubah (siklus 15 detik). Filter besok-s/d-7-hari dipusatkan
   * di executiveMetrics.js (hitungAgendaMendatang7Hari) supaya angka di kartu
   * statistik atas selalu cocok dengan jumlah kartu yang tampil di sini.
   */
  renderAgendaMendatang(daftarAgendaMendatang, now) {
    const skeleton = $('agenda-mendatang-skeleton');
    const content = $('agenda-mendatang-content');
    if (!content) return;

    if (skeleton) skeleton.classList.add('hidden');
    content.classList.remove('hidden');

    const belumDipecah = hitungAgendaMendatang7Hari(daftarAgendaMendatang, now);
    const batasAkhirISO = tambahHari(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`, 7);
    const daftar = belumDipecah.flatMap((a) => pecahAgendaMultiHari(a, batasAkhirISO)).slice(0, 5);

    if (!daftar.length) {
      if (content.dataset.signature !== '') {
        content.innerHTML = `<p class="text-body-elegant flex items-center h-full">Tidak ada agenda terjadwal untuk 7 hari ke depan.</p>`;
        content.dataset.signature = '';
      }
      return;
    }

    const signature = daftar.map((a) => `${a.id_agenda}:${a.tanggal}`).join(',');
    if (content.dataset.signature === signature) return;
    content.dataset.signature = signature;

    const WARNA_PRIORITAS = { Tinggi: 'badge-danger', Sedang: 'badge-warning', Rendah: 'badge-info' };
    const DOT_PRIORITAS = { Tinggi: '#EF4444', Sedang: '#F59E0B', Rendah: '#2563EB' };

    const kartu = daftar.map((a) => {
      const prioritas = a.prioritas || 'Sedang';
      return `
        <div class="flex-1 min-w-0 rounded-2xl bg-white/[0.03] border border-white/10 p-4 flex flex-col">
          <div class="flex items-center gap-2 mb-2">
            <span class="w-2 h-2 rounded-full shrink-0" style="background:${DOT_PRIORITAS[prioritas] || '#94A3B8'}"></span>
            <span class="text-[13px] font-medium truncate" style="color:${DOT_PRIORITAS[prioritas] || '#94A3B8'}">${labelHariRelatif(a.tanggal, now)}</span>
          </div>
          <h3 class="text-[17px] font-semibold text-[#F8FAFC] truncate">${escapeHTML(a.judul_kegiatan)}</h3>
          ${a.penyelenggara ? `<p class="text-[13px] text-[#94A3B8] truncate mt-0.5">Penyelenggara: ${escapeHTML(a.penyelenggara)}</p>` : ''}
          <p class="text-[13px] text-[#94A3B8] truncate mt-0.5">${escapeHTML(a.ruanganTampilan) || '-'}</p>
          ${a.peserta ? `<p class="text-[12px] text-[#64748B] truncate mt-0.5">${escapeHTML(a.peserta)}</p>` : ''}
          <div class="flex items-center justify-between mt-auto pt-3">
            <span class="text-[13px] text-[#CBD5E1]">${a.jam_mulai}–${a.jam_selesai}</span>
            <span class="badge-status ${WARNA_PRIORITAS[prioritas] || 'badge-info'} text-[11px]">${escapeHTML(prioritas)}</span>
          </div>
        </div>
      `;
    }).join('');

    content.innerHTML = `<div class="flex gap-4 h-full animate-fade-in">${kartu}</div>`;
  }
};
