/**
 * ============================================================
 *  clockService.js
 *  Jam digital realtime — berjalan independen dari siklus
 *  auto-refresh data API, karena jam harus tetap presisi per
 *  detik meskipun data agenda diperbarui tiap 15 detik.
 * ============================================================
 */

export const ClockService = {
  /**
   * Menjalankan jam realtime, memanggil onTick(date) setiap detik.
   * Mengembalikan fungsi stop() untuk menghentikan interval.
   */
  mulai(onTick) {
    onTick(new Date()); // render pertama tanpa menunggu 1 detik
    const intervalId = setInterval(() => onTick(new Date()), 1000);
    return () => clearInterval(intervalId);
  }
};
