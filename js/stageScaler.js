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
const BATAS_LEBAR_HP = 640; // sejalan dengan class "mode-hp" di index.html — sengaja rendah, khusus HP (bukan jendela desktop yang cuma sempit)

function skalakan() {
  const stage = document.getElementById('stage');
  if (!stage) return;

  // Di layar sempit (HP), aktifkan class "mode-hp" di <html> — CSS-nya (di index.html)
  // yang mengambil alih (layout tumpuk vertikal, scroll halaman biasa). Deteksinya murni
  // dari window.innerWidth (bukan viewport meta/@media), supaya tidak terpengaruh
  // pengaturan viewport yang tetap dikunci width=1920 untuk layar kiosk.
  const hp = window.innerWidth <= BATAS_LEBAR_HP;
  document.documentElement.classList.toggle('mode-hp', hp);

  if (hp) {
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
