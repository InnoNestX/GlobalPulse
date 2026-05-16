const GLOBALPULSE_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="GlobalPulse logo">
  <defs>
    <linearGradient id="arc" x1="15" y1="24" x2="108" y2="104" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#073b9b"/>
      <stop offset="0.68" stop-color="#073b9b"/>
      <stop offset="1" stop-color="#0bbfd3"/>
    </linearGradient>
    <linearGradient id="pulse" x1="9" y1="66" x2="123" y2="66" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#13c4d8"/>
      <stop offset="1" stop-color="#00a8c8"/>
    </linearGradient>
  </defs>
  <g fill="none" stroke="url(#arc)" stroke-width="8.5" stroke-linecap="round">
    <path d="M15 55C19 30 41 12 67 12c16 0 31 7 42 18"/>
    <path d="M18 79c7 22 27 37 50 37 18 0 34-9 44-23"/>
  </g>
  <path fill="#073b9b" d="M35 40c13-14 35-19 55-11 13 6 23 17 25 31-7 1-10 7-6 12-4 11-13 20-24 25-5-6 2-15-4-20-6-4-16 3-21-5-4-6 3-13 10-14 8-1 16 4 21-3 5-7-4-15-13-14-11 1-18 10-29 8-8-2-9-11-14-9z"/>
  <circle cx="13" cy="66" r="7.5" fill="url(#pulse)"/>
  <path d="M13 66h43l7-15 9 38 15-61 14 63 11-25h16" fill="none" stroke="url(#pulse)" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M100 63h22M96 74h28M109 85h15" fill="none" stroke="url(#pulse)" stroke-width="5" stroke-linecap="round"/>
  <circle cx="125" cy="63" r="3" fill="#13c4d8"/>
  <circle cx="126" cy="74" r="3" fill="#13c4d8"/>
</svg>`;

export const DEFAULT_GLOBALPULSE_LOGO_SRC = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(GLOBALPULSE_LOGO_SVG)}`;
export const GLOBALPULSE_PROJECT_LOGO_URL = "https://pulse.xuxuclassmate.com/assets/globalpulse-project-logo.svg?v=20260516-circle";
export { GLOBALPULSE_LOGO_SVG };
