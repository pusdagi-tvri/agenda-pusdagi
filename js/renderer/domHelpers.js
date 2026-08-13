/**
 * ============================================================
 *  renderer/domHelpers.js
 *  Utilitas DOM generik yang dipakai lintas sub-renderer.
 * ============================================================
 */

export const $ = (id) => document.getElementById(id);

export function setTeks(id, teks) {
  const el = $(id);
  if (el) el.textContent = teks;
}

export function setLebar(id, persen) {
  const el = $(id);
  if (el) el.style.width = `${persen}%`;
}
