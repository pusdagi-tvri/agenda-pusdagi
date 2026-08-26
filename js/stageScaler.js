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
const BATAS_LEBAR_HP = 900; // sejalan dengan @media (max-width: 900px) di index.html

function skalakan() {
  const stage = document.getElementById('stage');
  if (!stage) return;

  // Di layar sempit (HP), biarkan CSS mode-HP yang mengatur (layout tumpuk vertikal,
  // scroll halaman biasa) — jangan dipaksa skala kiosk 1920x1080, karena hasilnya
  // jadi terlalu kecil untuk dibaca dan tidak bisa di-scroll.
  if (window.innerWidth <= BATAS_LEBAR_HP) {
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
