/**
 * ============================================================
 *  renderer.js
 *  Barrel file — menggabungkan seluruh sub-renderer (renderer/*)
 *  menjadi satu objek Renderer publik. Dipecah per area agar tiap
 *  file tetap kecil dan fokus (header, agenda, stats, footer, system),
 *  tapi pemanggil (app.js) tetap memakai Renderer.xxx seperti biasa —
 *  tidak ada perubahan API publik dari pemecahan ini.
 *
 *  Aturan tetap sama: SATU-SATUNYA lapisan yang menyentuh DOM.
 *  Modul lain (statusEngine, apiService, dst.) murni logika/data.
 * ============================================================
 */

import { HeaderRenderer } from './renderer/header.js';
import { AgendaRenderer } from './renderer/agenda.js';
import { StatsRenderer } from './renderer/stats.js';
import { FooterRenderer } from './renderer/footer.js';
import { SystemRenderer } from './renderer/system.js';

export const Renderer = {
  ...HeaderRenderer,
  ...AgendaRenderer,
  ...StatsRenderer,
  ...FooterRenderer,
  ...SystemRenderer
};
