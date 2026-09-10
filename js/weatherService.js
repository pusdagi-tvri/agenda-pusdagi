/**
 * ============================================================
 *  weatherService.js
 *  Mengambil data cuaca realtime untuk lokasi TVRI (Senayan,
 *  Jakarta) dari Open-Meteo — API cuaca gratis, tanpa API key,
 *  dan mendukung CORS langsung dari browser.
 * ============================================================
 */

// Koordinat TVRI Pusat, Jl. Gerbang Pemuda No. 8, Senayan, Jakarta Pusat.
const LATITUDE_TVRI = -6.2146;
const LONGITUDE_TVRI = 106.8006;

const URL_CUACA = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE_TVRI}&longitude=${LONGITUDE_TVRI}` +
  `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day` +
  `&timezone=Asia%2FJakarta`;

/** Ikon cuaca sekarang file SVG animasi lokal (amCharts weather icons), disimpan di
 *  assets/weather/ — bukan CDN luar, supaya layar kiosk tidak tergantung koneksi ke
 *  server pihak ketiga yang bisa saja tidak bisa diakses/lambat. */
const FOLDER_IKON = 'assets/weather';

// Kode cuaca WMO (standar dipakai Open-Meteo) → { ikon, label }. "ikon" di sini
// adalah nama file (tanpa .svg) di assets/weather/. Daftar kode WMO lengkap:
// https://open-meteo.com/en/docs
const PETA_KODE_CUACA = {
  0: { ikon: 'day', ikonMalam: 'night', label: 'Cerah' },
  1: { ikon: 'cloudy-day-1', ikonMalam: 'cloudy-night-1', label: 'Cerah Berawan' },
  2: { ikon: 'cloudy-day-2', ikonMalam: 'cloudy-night-2', label: 'Cerah Berawan' },
  3: { ikon: 'cloudy-day-3', ikonMalam: 'cloudy-night-3', label: 'Berawan' },
  45: { ikon: 'cloudy', label: 'Berkabut' },
  48: { ikon: 'cloudy', label: 'Berkabut' },
  51: { ikon: 'rainy-1', label: 'Gerimis Ringan' },
  53: { ikon: 'rainy-2', label: 'Gerimis' },
  55: { ikon: 'rainy-3', label: 'Gerimis Lebat' },
  56: { ikon: 'rainy-2', label: 'Gerimis Beku' },
  57: { ikon: 'rainy-3', label: 'Gerimis Beku Lebat' },
  61: { ikon: 'rainy-3', label: 'Hujan Ringan' },
  63: { ikon: 'rainy-4', label: 'Hujan' },
  65: { ikon: 'rainy-6', label: 'Hujan Lebat' },
  66: { ikon: 'rainy-4', label: 'Hujan Beku' },
  67: { ikon: 'rainy-6', label: 'Hujan Beku Lebat' },
  71: { ikon: 'snowy-1', label: 'Salju Ringan' },
  73: { ikon: 'snowy-3', label: 'Salju' },
  75: { ikon: 'snowy-5', label: 'Salju Lebat' },
  77: { ikon: 'snowy-2', label: 'Butiran Salju' },
  80: { ikon: 'rainy-3', label: 'Hujan Ringan' },
  81: { ikon: 'rainy-5', label: 'Hujan' },
  82: { ikon: 'rainy-7', label: 'Hujan Sangat Lebat' },
  85: { ikon: 'snowy-2', label: 'Hujan Salju Ringan' },
  86: { ikon: 'snowy-6', label: 'Hujan Salju Lebat' },
  95: { ikon: 'thunder', label: 'Badai Petir' },
  96: { ikon: 'thunder', label: 'Badai Petir + Hujan Es' },
  99: { ikon: 'thunder', label: 'Badai Petir + Hujan Es Lebat' }
};

function petakanKodeCuaca(kode, siangHari) {
  const info = PETA_KODE_CUACA[kode] || { ikon: 'cloudy', label: '-' };
  const ikon = (!siangHari && info.ikonMalam) ? info.ikonMalam : info.ikon;
  return { ikon, label: info.label };
}

let cuacaTerakhir = null; // cache di memori, dibaca renderer tanpa perlu fetch ulang tiap render

/** Mengambil data cuaca terbaru dari Open-Meteo, simpan ke cache di memori. */
async function ambilCuacaTerbaru() {
  try {
    const response = await fetch(URL_CUACA);
    if (!response.ok) throw new Error('Respons cuaca tidak OK: ' + response.status);
    const data = await response.json();
    const c = data.current;
    const info = petakanKodeCuaca(c.weather_code, c.is_day === 1);

    cuacaTerakhir = {
      suhu: Math.round(c.temperature_2m),
      terasaSeperti: Math.round(c.apparent_temperature),
      kelembapan: Math.round(c.relative_humidity_2m),
      kecepatanAngin: Math.round(c.wind_speed_10m),
      urlIkon: `${FOLDER_IKON}/${info.ikon}.svg`,
      label: info.label,
      diperbaruiPada: new Date()
    };
  } catch (err) {
    console.warn('[weatherService.js] Gagal mengambil data cuaca:', err.message);
    // Cache lama (kalau ada) dibiarkan apa adanya — lebih baik menampilkan data agak
    // basi daripada tidak menampilkan apa-apa sama sekali.
  }
}

/** Dipanggil sekali saat aplikasi mulai — fetch pertama langsung, lalu berulang tiap 10 menit
 *  (cuaca tidak berubah secepat itu, tidak perlu seagresif siklus refresh agenda). */
export function aktifkanPembaruanCuaca() {
  ambilCuacaTerbaru();
  setInterval(ambilCuacaTerbaru, 10 * 60 * 1000);
}

/** Dibaca renderer — null kalau fetch pertama belum selesai/gagal total. */
export function ambilCuacaTersimpan() {
  return cuacaTerakhir;
}
