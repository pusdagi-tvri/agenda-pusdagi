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
  `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
  `&timezone=Asia%2FJakarta`;

// Kode cuaca WMO (standar dipakai Open-Meteo) → { ikon, label }. Daftar lengkap:
// https://open-meteo.com/en/docs — dipetakan ke salah satu dari 6 jenis ikon animasi.
const PETA_KODE_CUACA = {
  0: { ikon: 'cerah', label: 'Cerah' },
  1: { ikon: 'cerah-berawan', label: 'Cerah Berawan' },
  2: { ikon: 'cerah-berawan', label: 'Cerah Berawan' },
  3: { ikon: 'berawan', label: 'Berawan' },
  45: { ikon: 'kabut', label: 'Berkabut' },
  48: { ikon: 'kabut', label: 'Berkabut' },
  51: { ikon: 'hujan', label: 'Gerimis Ringan' },
  53: { ikon: 'hujan', label: 'Gerimis' },
  55: { ikon: 'hujan', label: 'Gerimis Lebat' },
  56: { ikon: 'hujan', label: 'Gerimis Beku' },
  57: { ikon: 'hujan', label: 'Gerimis Beku Lebat' },
  61: { ikon: 'hujan', label: 'Hujan Ringan' },
  63: { ikon: 'hujan', label: 'Hujan' },
  65: { ikon: 'hujan', label: 'Hujan Lebat' },
  66: { ikon: 'hujan', label: 'Hujan Beku' },
  67: { ikon: 'hujan', label: 'Hujan Beku Lebat' },
  71: { ikon: 'salju', label: 'Salju Ringan' },
  73: { ikon: 'salju', label: 'Salju' },
  75: { ikon: 'salju', label: 'Salju Lebat' },
  77: { ikon: 'salju', label: 'Butiran Salju' },
  80: { ikon: 'hujan', label: 'Hujan Ringan' },
  81: { ikon: 'hujan', label: 'Hujan' },
  82: { ikon: 'hujan', label: 'Hujan Sangat Lebat' },
  85: { ikon: 'salju', label: 'Hujan Salju Ringan' },
  86: { ikon: 'salju', label: 'Hujan Salju Lebat' },
  95: { ikon: 'badai', label: 'Badai Petir' },
  96: { ikon: 'badai', label: 'Badai Petir + Hujan Es' },
  99: { ikon: 'badai', label: 'Badai Petir + Hujan Es Lebat' }
};

function petakanKodeCuaca(kode) {
  return PETA_KODE_CUACA[kode] || { ikon: 'berawan', label: '-' };
}

let cuacaTerakhir = null; // cache di memori, dibaca renderer tanpa perlu fetch ulang tiap render

/** Mengambil data cuaca terbaru dari Open-Meteo, simpan ke cache di memori. */
async function ambilCuacaTerbaru() {
  try {
    const response = await fetch(URL_CUACA);
    if (!response.ok) throw new Error('Respons cuaca tidak OK: ' + response.status);
    const data = await response.json();
    const c = data.current;
    const info = petakanKodeCuaca(c.weather_code);

    cuacaTerakhir = {
      suhu: Math.round(c.temperature_2m),
      terasaSeperti: Math.round(c.apparent_temperature),
      kelembapan: Math.round(c.relative_humidity_2m),
      kecepatanAngin: Math.round(c.wind_speed_10m),
      ikon: info.ikon,
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
