/**
 * ============================================================
 *  renderer/agenda.js
 *  Render konten inti agenda: timeline hari ini, sedang berlangsung,
 *  berikutnya, dan seluruh agenda mendatang.
 * ============================================================
 */

import { STATUS_COLOR_CLASS, STATUS_OTOMATIS } from '../config.js';
import { escapeHTML, gabungTanggalJam, formatTanggalIndonesia } from '../utils.js';
import { hitungStatusOtomatis, hitungCountdown, cariAgendaBerlangsung, cariAgendaBerikutnya } from '../statusEngine.js';
import { hitungTanggalMendatang } from '../executiveMetrics.js';
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

const WARNA_STATUS_HEX = {
  [STATUS_OTOMATIS.BELUM_DIMULAI]: '#2563EB',
  [STATUS_OTOMATIS.BERLANGSUNG]: '#F59E0B',
  [STATUS_OTOMATIS.SELESAI]: '#22C55E',
  [STATUS_OTOMATIS.BATAL]: '#EF4444'
};

let karoselStafIntervalId = null;
let karoselStafIndeks = 0;

/** Memecah daftar staf jadi slide: Kapusdagi sendiri (1 slide), sisanya berpasangan 2-2. */
function buatSlideStaf(daftarStaf) {
  if (!daftarStaf || !daftarStaf.length) return [];
  // Deteksi Kapusdagi lewat kolom khusus "kapusdagi" (isi "Ya"/"TRUE"/dst di satu baris)
  // — TERPISAH dari kolom "peran" (yang dipakai bebas untuk nama divisi/jabatan kerja
  // tiap staf, bukan penanda solo/berpasangan).
  const kapusdagi = daftarStaf.find((s) => /^(ya|true|1|yes)$/i.test(String(s.kapusdagi || '').trim()));
  const stafLain = daftarStaf.filter((s) => s !== kapusdagi);
  const slides = [];
  if (kapusdagi) slides.push([kapusdagi]);
  for (let i = 0; i < stafLain.length; i += 2) {
    slides.push(stafLain.slice(i, i + 2));
  }
  return slides;
}

/** Satu kartu profil (foto + nama + jabatan) — pakai avatar inisial kalau kolom foto kosong. */
function kartuStaf(staf, besar) {
  const tinggiKartu = besar ? 'h-[360px]' : 'h-[300px]';
  const lebarFoto = besar ? 'w-[220px]' : 'w-[180px]';
  const lebarKartu = besar ? 'max-w-[520px]' : 'max-w-[420px]';

  const fotoHTML = staf.foto
    ? `<img src="assets/staf/${escapeHTML(staf.foto)}" alt="${escapeHTML(staf.nama)}" class="${lebarFoto} h-full object-cover shrink-0" />`
    : `<div class="${lebarFoto} h-full flex items-center justify-center text-5xl font-bold text-white shrink-0" style="background:#2563EB;">${escapeHTML((staf.nama || '?').charAt(0).toUpperCase())}</div>`;

  const kontakHTML = (staf.email || staf.hp) ? `
    <div class="flex flex-col gap-1.5 mt-3">
      ${staf.email ? `
        <div class="flex items-center gap-2 text-[13px] text-[#94A3B8]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" stroke-width="2" class="shrink-0"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>
          <span>${escapeHTML(staf.email)}</span>
        </div>` : ''}
      ${staf.hp ? `
        <div class="flex items-center gap-2 text-[13px] text-[#94A3B8]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" stroke-width="2" class="shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>
          <span>${escapeHTML(staf.hp)}</span>
        </div>` : ''}
    </div>
  ` : '';

  const motoHTML = staf.moto ? `
    <p class="text-[13px] italic mt-3 pt-3 leading-snug" style="color:#A78BFA; border-top:1px solid rgba(255,255,255,0.08);">&ldquo;${escapeHTML(staf.moto)}&rdquo;</p>
  ` : '';

  return `
    <div class="flex ${tinggiKartu} ${lebarKartu} w-full rounded-xl overflow-hidden" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08);">
      ${fotoHTML}
      <div class="flex-1 min-w-0 flex flex-col justify-center p-6">
        <div class="w-10 h-[3px] rounded-full mb-3" style="background:#2563EB;"></div>
        <p class="text-[22px] font-bold text-[#F8FAFC] leading-tight">${escapeHTML(staf.nama)}</p>
        <p class="text-[14px] font-medium mt-1" style="color:#60A5FA;">${escapeHTML(staf.jabatan || '')}</p>
        ${kontakHTML}
        ${motoHTML}
      </div>
    </div>
  `;
}

function tampilkanSlideStaf(content, slides, indeks) {
  const slide = slides[indeks];
  if (!slide) return;

  const gantiIsi = () => {
    content.innerHTML = `
      <div class="flex items-center justify-center h-full gap-10">
        ${slide.map((s) => kartuStaf(s, slide.length === 1)).join('')}
      </div>
    `;
    // Baris berikutnya sengaja dipisah dari innerHTML di atas — browser butuh "napas"
    // satu frame supaya transisi opacity 0→1 benar-benar teranimasi (kalau digabung
    // jadi satu langkah, browser sering melompatinya, transisinya jadi tidak terlihat).
    requestAnimationFrame(() => { content.style.opacity = '1'; });
  };

  if (!content.innerHTML.trim()) {
    // Render pertama kali (belum ada slide sebelumnya) — langsung tampil, tidak perlu
    // memudar-keluar dulu karena tidak ada apa pun yang perlu "dihilangkan".
    gantiIsi();
    return;
  }

  content.style.opacity = '0';
  setTimeout(gantiIsi, 350); // tunggu transisi memudar-keluar (350ms) baru ganti isinya
}

/** Menjalankan karosel profil staf (berputar tiap 10 detik) — dipanggil saat Agenda Hari Ini kosong. */
function renderKarouselStaf(content, daftarStaf) {
  const slides = buatSlideStaf(daftarStaf);
  if (!slides.length) {
    if (content.dataset.signature !== '') {
      content.innerHTML = `<p class="text-body-elegant flex items-center h-full">Tidak ada agenda yang terjadwal hari ini.</p>`;
      content.dataset.signature = '';
    }
    return;
  }

  // Kalau karosel sudah berjalan, biarkan jalan terus — jangan di-restart tiap kali
  // fungsi ini dipanggil ulang (siklus refresh data tiap 15 detik), supaya tidak
  // "lompat" balik ke slide pertama terus-menerus.
  if (karoselStafIntervalId) return;

  content.style.transition = 'opacity 0.35s ease';
  karoselStafIndeks = 0;
  tampilkanSlideStaf(content, slides, karoselStafIndeks);
  content.dataset.signature = 'karosel-staf';

  karoselStafIntervalId = setInterval(() => {
    karoselStafIndeks = (karoselStafIndeks + 1) % slides.length;
    tampilkanSlideStaf(content, slides, karoselStafIndeks);
  }, 10000);
}

/** Menghentikan karosel staf — dipanggil begitu Agenda Hari Ini terisi lagi. */
function hentikanKarouselStaf(content) {
  if (karoselStafIntervalId) {
    clearInterval(karoselStafIntervalId);
    karoselStafIntervalId = null;
  }
  // Bersihkan inline style — kalau tadi berhenti persis di tengah fase memudar-keluar,
  // opacity bisa nyangkut di 0 dan timeline agenda ikut jadi tak kelihatan.
  if (content) {
    content.style.opacity = '';
    content.style.transition = '';
  }
}

export const AgendaRenderer = {

  /**
   * Timeline vertikal seluruh agenda hari ini (kolom kiri) — bukan cuma
   * satu agenda seperti card "Sedang Berlangsung" di kolom kanan. Agenda
   * yang sedang berlangsung disorot (border + latar tint), sesuai referensi
   * desain yang diberikan.
   */
  renderAgendaHariIni(daftarAgenda, now, daftarStaf) {
    const skeleton = $('agenda-hari-ini-skeleton');
    const content = $('agenda-hari-ini-content');
    const tanggalLabel = $('tanggal-timeline');
    if (!content) return;

    if (skeleton) skeleton.classList.add('hidden');
    content.classList.remove('hidden');

    const aktif = [...daftarAgenda].filter((a) => a.status !== 'Batal').sort((a, b) => gabungTanggalJam(a.tanggal, a.jam_mulai) - gabungTanggalJam(b.tanggal, b.jam_mulai));

    if (tanggalLabel) tanggalLabel.textContent = formatTanggalIndonesia(now);

    if (!aktif.length) {
      renderKarouselStaf(content, daftarStaf);
      return;
    }

    hentikanKarouselStaf(content); // Agenda Hari Ini terisi lagi — hentikan karosel profil staf kalau tadi berjalan

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
        this.renderAgendaHariIni(daftarAgenda, now, daftarStaf);
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
        <p class="text-[12px] text-[#94A3B8] uppercase tracking-wide flex items-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2.5" class="shrink-0"><path d="M13 5l7 7-7 7M5 12h14"/></svg>
          Agenda Berikutnya
        </p>
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
   * Menampilkan seluruh agenda mendatang. Area utama tetap pada tinggi/layout
   * yang sama dan memuat kartu sebanyak yang aman terbaca. Jika masih ada
   * agenda lain, tombol "Lihat selengkapnya" membuka daftar lengkap.
   */
  renderAgendaMendatang(daftarAgendaMendatang, now) {
    const skeleton = $('agenda-mendatang-skeleton');
    const content = $('agenda-mendatang-content');
    const tombolLihatSemua = $('agenda-mendatang-lihat-semua');
    const modal = $('agenda-mendatang-modal');
    const modalContent = $('agenda-mendatang-modal-content');
    const modalCount = $('agenda-mendatang-modal-count');
    const tombolTutup = $('agenda-mendatang-modal-tutup');
    if (!content) return;

    if (skeleton) skeleton.classList.add('hidden');
    content.classList.remove('hidden');

    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const daftar = daftarAgendaMendatang
      .filter((a) => a.status !== 'Batal')
      .flatMap((a) => hitungTanggalMendatang(a, todayISO).map((tgl) => ({ ...a, tanggal: tgl })))
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.jam_mulai.localeCompare(b.jam_mulai));

    if (!daftar.length) {
      if (content.dataset.signature !== '') {
        content.innerHTML = `<p class="text-body-elegant flex items-center h-full">Tidak ada agenda mendatang yang terjadwal.</p>`;
        content.dataset.signature = '';
      }
      if (tombolLihatSemua) tombolLihatSemua.classList.add('hidden');
      if (modal) modal.classList.add('hidden');
      return;
    }

    const WARNA_PRIORITAS = { Tinggi: 'badge-danger', Sedang: 'badge-warning', Rendah: 'badge-info' };
    const DOT_PRIORITAS = { Tinggi: '#EF4444', Sedang: '#F59E0B', Rendah: '#2563EB' };

    const buatKartu = (a, versiModal = false) => {
      const prioritas = a.prioritas || 'Sedang';
      return `
        <div class="${versiModal ? '' : 'flex-1 min-w-0'} rounded-2xl bg-white/[0.03] border border-white/10 p-4 flex flex-col">
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
    };

    // Dengan lebar stage 1920px, 5 kartu tetap terbaca nyaman di area yang ada.
    // Data di luar 5 terdekat tetap tersedia melalui "Lihat selengkapnya".
    const BATAS_KARTU_UTAMA = 5;
    const daftarUtama = daftar.slice(0, BATAS_KARTU_UTAMA);
    const signature = daftar.map((a) => `${a.id_agenda}:${a.tanggal}:${a.jam_mulai}`).join(',');
    if (content.dataset.signature !== signature) {
      content.dataset.signature = signature;
      content.innerHTML = `<div class="flex gap-4 h-full animate-fade-in">${daftarUtama.map((a) => buatKartu(a)).join('')}</div>`;
      if (modalContent) modalContent.innerHTML = daftar.map((a) => buatKartu(a, true)).join('');
      if (modalCount) modalCount.textContent = `${daftar.length} agenda akan datang`;
    }

    const adaSisa = daftar.length > BATAS_KARTU_UTAMA;
    if (tombolLihatSemua) {
      tombolLihatSemua.classList.toggle('hidden', !adaSisa);
      tombolLihatSemua.classList.toggle('flex', adaSisa);
    }

    if (tombolLihatSemua && modal && !tombolLihatSemua.dataset.bound) {
      tombolLihatSemua.dataset.bound = '1';
      tombolLihatSemua.addEventListener('click', () => {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      });
    }
    if (tombolTutup && modal && !tombolTutup.dataset.bound) {
      tombolTutup.dataset.bound = '1';
      tombolTutup.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      });
      modal.addEventListener('click', (event) => {
        if (event.target === modal) tombolTutup.click();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modal.classList.contains('hidden')) tombolTutup.click();
      });
    }
  }};
