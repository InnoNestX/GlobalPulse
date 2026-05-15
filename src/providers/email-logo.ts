const GLOBALPULSE_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 200" role="img" aria-label="GlobalPulse logo">
  <defs>
    <linearGradient id="pulse" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#13c4d8"/>
      <stop offset="1" stop-color="#03a9c9"/>
    </linearGradient>
    <linearGradient id="arc" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#083b9b"/>
      <stop offset="0.62" stop-color="#083b9b"/>
      <stop offset="1" stop-color="#0bbfd3"/>
    </linearGradient>
  </defs>
  <path d="M29 85a91 91 0 0 1 161-56" fill="none" stroke="url(#arc)" stroke-width="14" stroke-linecap="butt"/>
  <path d="M36 130a91 91 0 0 0 153 32" fill="none" stroke="url(#arc)" stroke-width="14" stroke-linecap="butt"/>
  <path fill="#073b9b" d="M51 58c21-24 58-35 95-22 20 7 36 20 46 37 6 10 9 21 9 33-5 2-9 5-10 10-1 4 1 8 6 10-5 15-15 28-28 38-5-7 2-18-4-24-5-5-14 1-22-3-9-4-12-16-5-23 6-6 16-3 21-9 7-8-4-20-15-19-10 1-17 9-27 9-11 0-16-10-25-14-11-5-22 3-23 15-2 17 18 29 14 45-3 10-14 14-23 10-13-5-17-21-13-35 5-17 20-26 15-43-3-12-17-17-28-15z"/>
  <circle cx="26" cy="100" r="12" fill="url(#pulse)"/>
  <path d="M25 100h58l12-23 14 57 22-87 20 89 16-36h53" fill="none" stroke="url(#pulse)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M174 97h42M169 112h66M205 128h35M216 82h18M198 144h18" fill="none" stroke="url(#pulse)" stroke-width="8" stroke-linecap="round"/>
  <circle cx="244" cy="82" r="5" fill="#13c4d8"/>
  <circle cx="251" cy="112" r="5" fill="#13c4d8"/>
  <circle cx="225" cy="144" r="6" fill="#13c4d8"/>
</svg>`;

export const DEFAULT_GLOBALPULSE_LOGO_SRC = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(GLOBALPULSE_LOGO_SVG)}`;
