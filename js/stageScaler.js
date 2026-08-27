/**
 * ============================================================
 *  stageScaler.js
 *  Menjaga kanvas desain 1920x1080 tetap proporsional dan stabil
 *  di berbagai resolusi desktop/kiosk tanpa mengubah struktur DOM.
 * ============================================================
 */

const LEBAR_DESAIN = 1920;
const TINGGI_DESAIN = 1080;

let rafId = 0;
let sudahAktif = false;

function ukuranViewport() {
  // visualViewport lebih akurat saat browser zoom / UI browser berubah.
  // Fallback ke innerWidth/innerHeight untuk browser yang tidak mendukungnya.
  const vv = window.visualViewport;
  return {
    lebar: Math.max(1, vv?.width || window.innerWidth || document.documentElement.clientWidth),
    tinggi: Math.max(1, vv?.height || window.innerHeight || document.documentElement.clientHeight)
  };
}

function skalakanSekarang() {
  const stage = document.getElementById('stage');
  if (!stage) return;

  const { lebar, tinggi } = ukuranViewport();

  // Tablet/HP memakai layout responsive CSS asli, bukan kanvas 1920x1080 yang dikecilkan.
  // Ini membuat teks tetap terbaca dan halaman dapat di-scroll secara natural di WebView/mobile.
  if (lebar <= 1024) {
    stage.style.transform = 'none';
    stage.style.willChange = 'auto';
    return;
  }

  const skala = Math.min(lebar / LEBAR_DESAIN, tinggi / TINGGI_DESAIN);

  // Pembulatan sub-pixel mengurangi teks/border terlihat sedikit bergeser atau blur
  // pada resolusi seperti 1366x768 dan 1600x900.
  const lebarHasil = LEBAR_DESAIN * skala;
  const tinggiHasil = TINGGI_DESAIN * skala;
  const offsetX = Math.round((lebar - lebarHasil) / 2 * 100) / 100;
  const offsetY = Math.round((tinggi - tinggiHasil) / 2 * 100) / 100;

  stage.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${skala})`;
  stage.style.willChange = 'transform';
}

function mintaSkalaUlang() {
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(skalakanSekarang);
}

export function aktifkanAutoScale() {
  if (sudahAktif) {
    mintaSkalaUlang();
    return;
  }
  sudahAktif = true;

  // Jalankan sedini mungkin, lalu ulangi sesudah font siap agar hasil first paint stabil.
  mintaSkalaUlang();
  if (document.fonts?.ready) {
    document.fonts.ready.then(mintaSkalaUlang).catch(() => {});
  }

  window.addEventListener('resize', mintaSkalaUlang, { passive: true });
  window.addEventListener('orientationchange', mintaSkalaUlang, { passive: true });
  window.visualViewport?.addEventListener('resize', mintaSkalaUlang, { passive: true });
}
