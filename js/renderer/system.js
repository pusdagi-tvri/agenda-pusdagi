/**
 * ============================================================
 *  renderer/system.js
 *  Render elemen sistem yang bukan bagian data agenda:
 *  loading screen awal, banner error/offline non-intrusive.
 * ============================================================
 */

import { $ } from './domHelpers.js';

export const SystemRenderer = {
  sembunyikanLoadingScreen() {
    const el = $('loading-screen');
    if (!el) return;
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 600);
  },

  tampilkanBanner(tipe, pesan) {
    let banner = $('status-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'status-banner';
      banner.className = 'fixed left-1/2 -translate-x-1/2 z-[500] px-5 py-2.5 rounded-chip text-sm font-medium animate-fade-in-down shadow-soft-md';
      banner.style.top = '16px';
      document.body.appendChild(banner);
    }

    const gaya = {
      error: 'background:rgba(239,68,68,0.16); color:#FCA5A5; border:1px solid rgba(239,68,68,0.35);',
      offline: 'background:rgba(245,158,11,0.16); color:#FCD34D; border:1px solid rgba(245,158,11,0.35);',
      info: 'background:rgba(37,99,235,0.16); color:#93C5FD; border:1px solid rgba(37,99,235,0.35);'
    };

    banner.style.cssText += gaya[tipe] || gaya.info;
    banner.textContent = pesan;
    banner.classList.remove('hidden');
  },

  sembunyikanBanner() {
    const banner = $('status-banner');
    if (banner) banner.classList.add('hidden');
  }
};
