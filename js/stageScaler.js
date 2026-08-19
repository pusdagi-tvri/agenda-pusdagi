/**
 * ============================================================
 *  stageScaler.js
 *  Menskalakan kanvas #stage (1920x1080 tetap) mengikuti ukuran
 *  layar aktual — dipakai agar layout presisi di monitor kiosk
 *  resolusi berapa pun.
 * ============================================================
 */

const LEBAR_DESAIN = 1920;
const TINGGI_DESAIN = 1080;

function skalakan() {
  const stage = document.getElementById('stage');
  if (!stage) return;

  // Desktop/kiosk tetap memakai kanvas 1920x1080 persis seperti desain awal.
  // Tablet & mobile memakai layout responsif CSS agar konten tidak mengecil menjadi miniatur.
  if (window.innerWidth <= 1024) {
    stage.style.transform = 'none';
    return;
  }

  const skala = Math.min(window.innerWidth / LEBAR_DESAIN, window.innerHeight / TINGGI_DESAIN);
  const offsetX = (window.innerWidth - LEBAR_DESAIN * skala) / 2;
  const offsetY = (window.innerHeight - TINGGI_DESAIN * skala) / 2;

  stage.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${skala})`;
}

export function aktifkanAutoScale() {
  skalakan();
  window.addEventListener('resize', skalakan);
}
