/**
 * ============================================================
 *  renderer/footer.js
 *  Render running text footer.
 * ============================================================
 */

import { cariAgendaBerlangsung, cariAgendaBerikutnya } from '../statusEngine.js';
import { escapeHTML } from '../utils.js';
import { $ } from './domHelpers.js';

const PEMISAH = '<span class="separator-logo"></span>';

export const FooterRenderer = {
  renderRunningText(daftarAgenda, now) {
    const a = $('marquee-a');
    const b = $('marquee-b');
    if (!a || !b) return;

    const berlangsung = cariAgendaBerlangsung(daftarAgenda, now);
    const [berikutnya] = cariAgendaBerikutnya(daftarAgenda, now, 1);

    const bagian = ['Selamat datang di TVRI — Pusat Data dan Strategi'];
    if (berlangsung) bagian.push(`${berlangsung.judul_kegiatan} sedang berlangsung di ${berlangsung.ruanganTampilan || 'lokasi terjadwal'}`);
    if (berikutnya) bagian.push(`Agenda berikutnya: ${berikutnya.judul_kegiatan} pukul ${berikutnya.jam_mulai}`);

    // Beralih ke innerHTML karena separatornya sekarang ikon (bukan karakter teks) —
    // setiap bagian teks WAJIB di-escapeHTML dulu (data judul/lokasi berasal dari spreadsheet).
    const teks = bagian.map((s) => escapeHTML(s)).join(PEMISAH) + PEMISAH;
    a.innerHTML = teks;
    b.innerHTML = teks;
  }
};
