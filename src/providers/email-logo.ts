const GLOBALPULSE_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="GlobalPulse logo">
  <rect width="128" height="128" rx="28" fill="#f8fbff"/>
  <defs>
    <linearGradient id="a" x1="18" y1="24" x2="106" y2="104" gradientUnits="userSpaceOnUse">
      <stop stop-color="#073b9b"/>
      <stop offset=".72" stop-color="#073b9b"/>
      <stop offset="1" stop-color="#0bbfd3"/>
    </linearGradient>
    <linearGradient id="b" x1="15" y1="64" x2="114" y2="64" gradientUnits="userSpaceOnUse">
      <stop stop-color="#13c4d8"/>
      <stop offset="1" stop-color="#00a8c8"/>
    </linearGradient>
  </defs>
  <path d="M30 54a38 38 0 0 1 69-22" fill="none" stroke="url(#a)" stroke-width="9" stroke-linecap="round"/>
  <path d="M32 78a38 38 0 0 0 67 18" fill="none" stroke="url(#a)" stroke-width="9" stroke-linecap="round"/>
  <path d="M37 45c12-13 31-17 47-9 12 6 20 17 21 30-6 2-8 7-4 12-4 9-11 16-20 20-4-5 1-13-4-17-5-3-13 2-17-4-4-5 2-11 8-12 7-1 14 3 19-2 4-6-3-13-11-12-10 1-15 9-24 7-7-2-8-10-14-13z" fill="#073b9b"/>
  <circle cx="22" cy="67" r="7" fill="url(#b)"/>
  <path d="M22 67h35l6-13 8 33 13-51 12 53 10-22h17" fill="none" stroke="url(#b)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M94 64h22M92 75h29M106 86h16" fill="none" stroke="url(#b)" stroke-width="5" stroke-linecap="round"/>
  <circle cx="121" cy="64" r="3.5" fill="#13c4d8"/>
  <circle cx="124" cy="75" r="3.5" fill="#13c4d8"/>
</svg>`;

export const DEFAULT_GLOBALPULSE_LOGO_SRC = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(GLOBALPULSE_LOGO_SVG)}`;
export const GLOBALPULSE_PROJECT_LOGO_URL = "https://pulse.xuxuclassmate.com/assets/globalpulse-project-logo.svg?v=20260516-svg";
