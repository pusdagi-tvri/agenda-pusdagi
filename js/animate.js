/**
 * ============================================================
 *  animate.js
 *  Utilitas animasi murni JavaScript (tanpa library) yang
 *  dipakai renderer.js untuk membuat dashboard terasa "hidup":
 *    - animasiAngka(): angka berjalan naik/turun (count-up)
 *    - pemicuUlang(): retrigger CSS animation pada elemen yang
 *      sama (browser tidak akan replay animasi kalau class-nya
 *      tidak benar-benar dilepas dulu)
 * ============================================================
 */

/** Easing halus — cepat di awal, melambat di akhir (dipakai count-up angka). */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Menganimasikan angka pada sebuah elemen dari nilai yang sedang
 * tertampil menuju nilai baru, memakai requestAnimationFrame murni.
 * @param {HTMLElement} el - elemen target (textContent akan diubah)
 * @param {number} nilaiTujuan - angka akhir yang ingin dicapai
 * @param {number} durasiMs - lama animasi (default 700ms)
 */
export function animasiAngka(el, nilaiTujuan, durasiMs = 700) {
  if (!el) return;

  const nilaiAwal = parseInt(el.textContent, 10);
  const mulaiDari = Number.isFinite(nilaiAwal) ? nilaiAwal : 0;

  if (mulaiDari === nilaiTujuan) {
    el.textContent = nilaiTujuan; // tetap set ulang, jaga-jaga format sebelumnya bukan angka murni
    return;
  }

  const waktuMulai = performance.now();

  function frame(waktuSekarang) {
    const progres = Math.min((waktuSekarang - waktuMulai) / durasiMs, 1);
    const nilaiSaatIni = Math.round(mulaiDari + (nilaiTujuan - mulaiDari) * easeOutCubic(progres));
    el.textContent = nilaiSaatIni;

    if (progres < 1) {
      requestAnimationFrame(frame);
    } else {
      el.textContent = nilaiTujuan; // pastikan nilai akhir presisi, tanpa sisa pembulatan
    }
  }

  requestAnimationFrame(frame);
}

/**
 * Melepas lalu memasang ulang sebuah class CSS animation pada elemen,
 * agar animasi (mis. clock-tick) benar-benar replay setiap dipanggil —
 * menambahkan class yang sudah ada tidak akan memicu ulang animasi.
 */
export function pemicuUlang(el, namaClass) {
  if (!el) return;
  el.classList.remove(namaClass);
  // Memaksa reflow agar browser "melupakan" state animasi sebelumnya
  void el.offsetWidth;
  el.classList.add(namaClass);
}

/** Menambah/menghapus class secara kondisional — helper kecil dipakai berulang di renderer. */
export function setKelasKondisional(el, namaClass, aktif) {
  if (!el) return;
  el.classList.toggle(namaClass, aktif);
}
