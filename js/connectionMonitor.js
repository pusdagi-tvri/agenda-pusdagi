/**
 * ============================================================
 *  connectionMonitor.js
 *  Memantau status koneksi internet perangkat (Online/Offline
 *  Mode) menggunakan event bawaan browser, tanpa polling manual.
 * ============================================================
 */

export const ConnectionMonitor = {
  /**
   * Mendaftarkan callback yang dipanggil setiap kali status koneksi berubah.
   * callback menerima satu argumen boolean: true = online, false = offline.
   * Mengembalikan fungsi untuk melepas listener (cleanup).
   */
  pantau(callback) {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Panggil sekali di awal agar state awal langsung sinkron
    callback(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },

  statusSaatIni() {
    return navigator.onLine;
  }
};
