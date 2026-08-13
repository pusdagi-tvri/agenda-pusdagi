/**
 * ============================================================
 *  renderer/header.js
 *  Render area header: jam digital, tanggal, indikator auto-refresh.
 * ============================================================
 */

import { formatJam, formatTanggalIndonesia } from '../utils.js';
import { pemicuUlang } from '../animate.js';
import { $ } from './domHelpers.js';

export const HeaderRenderer = {
  renderJam(now) {
    const jamEl = $('jam-digital');
    const tanggalEl = $('tanggal-indonesia');
    if (jamEl) {
      jamEl.textContent = formatJam(now);
      pemicuUlang(jamEl, 'clock-tick'); // Realtime Clock Animation — denyut halus tiap detik
    }
    if (tanggalEl) tanggalEl.textContent = formatTanggalIndonesia(now);
  },

  tandaiSedangRefresh() {
    const dot = $('refresh-dot');
    if (!dot) return;
    dot.classList.remove('status-dot-success');
    dot.classList.add('status-dot-info', 'spin');
  },

  tandaiRefreshSelesai() {
    const dot = $('refresh-dot');
    if (!dot) return;
    dot.classList.remove('status-dot-info', 'spin');
    dot.classList.add('status-dot-success');
  },

  perbaruiLabelRefresh(detikSejakRefresh) {
    const label = $('refresh-label');
    if (!label) return;
    label.textContent = detikSejakRefresh < 5 ? 'Diperbarui baru saja' : `Diperbarui ${detikSejakRefresh} detik lalu`;
  }
};
