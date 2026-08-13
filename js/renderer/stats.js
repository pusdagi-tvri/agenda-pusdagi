/**
 * ============================================================
 *  renderer/stats.js
 *  Render Executive Stats Bar (kartu berikon) dan Statistik Kategori.
 * ============================================================
 */

import { hitungRingkasanEksekutif } from '../executiveMetrics.js';
import { animasiAngka, setKelasKondisional } from '../animate.js';
import { $, setTeks, setLebar } from './domHelpers.js';
import { escapeHTML } from '../utils.js';

const WARNA_KATEGORI = ['#2563EB', '#60A5FA', '#93C5FD', '#1D4ED8', '#94A3B8'];

export const StatsRenderer = {

  /** daftarAgenda = agenda hari ini, daftarAgendaMendatang = hari ini + ke depan (dari /dashboard). */
  renderExecutiveBar(daftarAgenda, daftarAgendaMendatang, now) {
    const ringkasan = hitungRingkasanEksekutif(daftarAgenda, daftarAgendaMendatang, now);

    animasiAngka($('exec-total'), ringkasan.totalAgendaHariIni);
    animasiAngka($('exec-mendatang'), ringkasan.agendaMendatang7Hari);
    animasiAngka($('exec-berlangsung'), ringkasan.agendaBerlangsung);
    animasiAngka($('exec-selesai'), ringkasan.agendaSelesai);
    animasiAngka($('exec-prioritas'), ringkasan.agendaPrioritasTinggi.length);
    animasiAngka($('exec-tertunda'), ringkasan.agendaTertunda);

    setTeks('exec-progress-hari-label', `${ringkasan.progressHariPersen}%`);
    setLebar('exec-progress-hari-bar', ringkasan.progressHariPersen);

    setTeks('exec-progress-kerja-label', ringkasan.hariKerjaLibur ? 'Libur' : `${ringkasan.persentaseHariKerjaPersen}%`);
    setLebar('exec-progress-kerja-bar', ringkasan.persentaseHariKerjaPersen);

    // Progress Animation — sheen bergerak hanya saat progress berjalan (bukan 0% atau 100%)
    setKelasKondisional($('exec-progress-hari-bar'), 'progress-animated', ringkasan.progressHariPersen > 0 && ringkasan.progressHariPersen < 100);
    setKelasKondisional($('exec-progress-kerja-bar'), 'progress-animated', ringkasan.persentaseHariKerjaPersen > 0 && ringkasan.persentaseHariKerjaPersen < 100);

    // Indikator warna otomatis: chip Prioritas Tinggi berdenyut halus bila ada agenda prioritas tinggi yang belum selesai
    setKelasKondisional($('exec-prioritas'), 'animate-blink', ringkasan.agendaPrioritasTinggi.length > 0);
  },

  /**
   * Statistik Kategori — daftar ringkas (bukan donut chart), supaya tingginya
   * fleksibel mengikuti ruang tersedia (card ini flex-1), bukan ukuran SVG tetap.
   * Maks. 4 kategori teratas ditampilkan; sisanya digabung jadi "Lainnya" agar
   * tetap muat walau admin mengetik kategori baru bebas lewat Admin Panel.
   */
  renderStatistikKategori(daftarAgenda) {
    const container = $('statistik-content');
    if (!container) return;

    const counter = {};
    daftarAgenda.forEach((a) => {
      if (a.status === 'Batal') return;
      const label = a.kategori || 'Tanpa Kategori';
      counter[label] = (counter[label] || 0) + 1;
    });

    const terurut = Object.entries(counter).sort((a, b) => b[1] - a[1]);
    const utama = terurut.slice(0, 4);
    const sisa = terurut.slice(4).reduce((total, [, jumlah]) => total + jumlah, 0);
    if (sisa > 0) utama.push(['Lainnya', sisa]);

    const signature = JSON.stringify(utama);
    if (container.dataset.signature === signature) return;
    container.dataset.signature = signature;

    if (!utama.length) {
      container.innerHTML = `<p class="text-caption normal-case tracking-normal">Belum ada data kategori.</p>`;
      return;
    }

    container.innerHTML = utama.map(([label, jumlah], i) => `
      <div class="flex items-center justify-between py-1.5 border-b border-white/[0.06] last:border-0 animate-fade-in">
        <span class="flex items-center gap-2.5 text-[14px]">
          <span class="status-dot" style="background:${WARNA_KATEGORI[i % WARNA_KATEGORI.length]}"></span> ${escapeHTML(label)}
        </span>
        <span class="text-base font-semibold text-numeric">${jumlah}</span>
      </div>
    `).join('');
  }
};
