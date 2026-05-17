export function renderAdminUi(): Response {
  return new Response(adminHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

const adminHtml = `<!doctype html>
<html lang="zh">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GlobalPulse Admin</title>
  <link rel="icon" href="https://avatars.githubusercontent.com/u/273979879?v=4" sizes="any" type="image/png">
  <style>
    :root, html[data-theme="dark"] {
      color-scheme: dark;
      --bg: #070b12;
      --surface: #0f1724;
      --surface-2: #141f2e;
      --text: #f4f7fb;
      --muted: #94a3b8;
      --line: #263548;
      --accent: #4f9cf9;
      --accent-2: #22c55e;
      --danger: #fb7185;
      --ok: #4ade80;
      --shadow: 0 18px 60px rgba(0, 0, 0, .25);
      --chip: #1d2a3b;
    }
    html[data-theme="light"] {
      color-scheme: light;
      --bg: #f5f7fb;
      --surface: #ffffff;
      --surface-2: #f1f5f9;
      --text: #101828;
      --muted: #64748b;
      --line: #d7dee8;
      --accent: #2563eb;
      --accent-2: #16a34a;
      --danger: #b42318;
      --ok: #15803d;
      --shadow: 0 18px 45px rgba(15, 23, 42, .08);
      --chip: #e8eef7;
    }
    @media (prefers-color-scheme: light) {
      html[data-theme="system"] {
        color-scheme: light;
        --bg: #f5f7fb;
        --surface: #ffffff;
        --surface-2: #f1f5f9;
        --text: #101828;
        --muted: #64748b;
        --line: #d7dee8;
        --accent: #2563eb;
        --accent-2: #16a34a;
        --danger: #b42318;
        --ok: #15803d;
        --shadow: 0 18px 45px rgba(15, 23, 42, .08);
        --chip: #e8eef7;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background:
        linear-gradient(180deg, rgba(79, 156, 249, .14), rgba(34, 197, 94, .05) 360px, transparent 620px),
        var(--bg);
      color: var(--text);
      font: 14px/1.5 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    a { color: inherit; text-decoration: none; }
    header {
      position: sticky;
      top: 0;
      z-index: 5;
      border-bottom: 1px solid var(--line);
      background: color-mix(in srgb, var(--surface) 90%, transparent);
      backdrop-filter: blur(18px);
    }
    .bar, main {
      width: min(1400px, calc(100vw - 32px));
      margin: 0 auto;
    }
    .bar {
      min-height: 76px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 13px;
      min-width: 0;
    }
    .mark {
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      border: 1px solid var(--line);
      border-radius: 10px;
      background:
        linear-gradient(135deg, var(--text), var(--accent)),
        var(--surface);
      color: var(--surface);
      font-weight: 850;
      letter-spacing: 0;
      box-shadow: var(--shadow);
    }
    .brand-logo {
      width: 42px;
      height: 42px;
      border: 0;
      border-radius: 0;
      background: transparent;
      object-fit: contain;
      object-position: center;
      display: block;
    }
    .brand-title { display: grid; gap: 1px; }
    h1, h2, h3 { margin: 0; line-height: 1.15; letter-spacing: 0; }
    h1 { font-size: 20px; }
    h2 { font-size: 17px; }
    h3 { font-size: 14px; }
    .muted { color: var(--muted); }
    .toolbar, .row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .toolbar { justify-content: flex-end; }
    main {
      padding: 22px 0 40px;
      display: grid;
      gap: 18px;
    }
    .hero {
      display: grid;
      grid-template-columns: 1fr;
      gap: 18px;
      align-items: end;
      padding: 22px 0 4px;
    }
    .hero h2 { font-size: clamp(28px, 3vw, 44px); max-width: 820px; }
    .hero-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
    .layout {
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr);
      gap: 18px;
      align-items: start;
    }
    .admin-main {
      display: grid;
      grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
      gap: 18px;
      align-items: start;
    }
    .panel {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: var(--shadow);
      padding: 18px;
    }
    .panel.tight { padding: 14px; }
    .stack { display: grid; gap: 14px; }
    .section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .cols {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    label {
      display: grid;
      gap: 6px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
    }
    .inline-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text);
      background: var(--surface-2);
      border: 1px solid var(--line);
      border-radius: 7px;
      padding: 9px 11px;
      font-size: 13px;
      font-weight: 600;
    }
    .inline-checkbox input[type="checkbox"] {
      width: auto;
      margin: 0;
      padding: 0;
      border-radius: 4px;
    }
    input, select, textarea, button {
      font: inherit;
      border-radius: 7px;
    }
    input, select, textarea {
      width: 100%;
      border: 1px solid var(--line);
      background: var(--surface-2);
      color: var(--text);
      padding: 10px 11px;
      outline: none;
    }
    textarea {
      min-height: 150px;
      resize: vertical;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13px;
    }
    input:focus, select:focus, textarea:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
    }
    button, .button-link {
      min-height: 38px;
      border: 1px solid transparent;
      background: var(--text);
      color: var(--surface);
      padding: 9px 12px;
      font-weight: 760;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      white-space: nowrap;
    }
    button:hover, .button-link:hover { filter: brightness(.95); }
    button.primary { background: var(--accent); color: #fff; }
    button.secondary, .button-link.secondary {
      color: var(--text);
      background: var(--surface-2);
      border-color: var(--line);
    }
    button.danger { background: var(--danger); color: #fff; }
    .icon-button {
      width: 38px;
      padding: 0;
      font-size: 16px;
    }
    .hidden { display: none !important; }
    .status { min-height: 22px; color: var(--muted); }
    .mini-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .metric {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface-2);
      padding: 11px;
    }
    .metric strong {
      display: block;
      font-size: 17px;
      color: var(--text);
    }
    .provider-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    .provider-form {
      display: grid;
      gap: 12px;
    }
    .provider-config {
      border: 1px solid var(--line);
      background: var(--surface-2);
      border-radius: 8px;
      padding: 12px;
      display: grid;
      gap: 10px;
    }
    .provider-config h3 {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .provider-card {
      border: 1px solid var(--line);
      background: var(--surface-2);
      border-radius: 8px;
      padding: 10px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      justify-content: space-between;
      gap: 8px;
      align-items: center;
      cursor: pointer;
      transition: border-color .15s, box-shadow .15s, background .15s;
    }
    .provider-card .provider-title {
      display: grid;
      gap: 2px;
      min-width: 0;
      text-align: left;
      color: var(--text);
      font-weight: 760;
      font-size: 15px;
    }
    .provider-card .provider-hint {
      color: var(--muted);
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .provider-card .badge {
      white-space: nowrap;
    }
    .provider-card.configured {
      border-color: color-mix(in srgb, var(--ok) 40%, var(--line));
      background: color-mix(in srgb, var(--ok) 9%, var(--surface-2));
    }
    .provider-card.unconfigured {
      border-color: color-mix(in srgb, var(--danger) 40%, var(--line));
      background: color-mix(in srgb, var(--danger) 8%, var(--surface-2));
    }
    .provider-card.active {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      padding: 3px 8px;
      border-radius: 999px;
      background: var(--chip);
      color: var(--muted);
      font-size: 12px;
      font-weight: 760;
    }
    .badge.ok { color: var(--ok); }
    .badge.warn {
      color: color-mix(in srgb, var(--danger) 80%, #ffcc8a);
      background: color-mix(in srgb, var(--danger) 10%, var(--chip));
    }
    .target-list {
      display: grid;
      gap: 8px;
    }
    .target-list label {
      grid-template-columns: 18px 1fr;
      align-items: center;
      color: var(--text);
      background: var(--surface-2);
      border: 1px solid var(--line);
      border-radius: 7px;
      padding: 9px;
      font-size: 13px;
      font-weight: 600;
    }
    .target-list input, .days input { width: auto; }
    .schedule {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface);
      overflow: hidden;
    }
    .schedule-summary {
      list-style: none;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 13px 14px;
      background: color-mix(in srgb, var(--surface-2) 80%, transparent);
    }
    .schedule-summary::-webkit-details-marker { display: none; }
    .schedule-summary-main {
      min-width: 0;
      display: grid;
      gap: 3px;
    }
    .schedule-summary-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .schedule-chevron {
      color: color-mix(in srgb, var(--text) 72%, var(--muted));
      font-size: 16px;
      font-weight: 800;
      line-height: 1;
      min-width: 20px;
      text-align: center;
      transition: transform .15s ease;
      transform-origin: center;
    }
    details.schedule[open] .schedule-chevron {
      transform: rotate(180deg);
    }
    .schedule-body {
      padding: 14px;
      display: grid;
      gap: 13px;
      border-top: 1px solid var(--line);
    }
    .days {
      display: grid;
      grid-template-columns: repeat(7, minmax(38px, 1fr));
      gap: 7px;
    }
    .days label {
      place-items: center;
      border: 1px solid var(--line);
      border-radius: 7px;
      padding: 7px 4px;
      color: var(--text);
      background: var(--surface-2);
      font-size: 12px;
      cursor: pointer;
    }
    .logs {
      display: grid;
      gap: 8px;
      max-height: 370px;
      overflow: auto;
    }
    .log {
      border: 1px solid var(--line);
      border-left: 4px solid var(--line);
      padding: 10px;
      background: var(--surface-2);
      border-radius: 7px;
    }
    .log.ok { border-left-color: var(--ok); }
    .log.fail { border-left-color: var(--danger); }
    .collapsible-section {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    .collapsible-section summary {
      list-style: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      cursor: pointer;
      background: var(--surface);
      user-select: none;
      border-bottom: 1px solid transparent;
      transition: background 0.15s;
    }
    .collapsible-section summary:hover {
      background: var(--surface-2);
    }
    .collapsible-section[open] summary {
      border-bottom-color: var(--line);
    }
    .collapsible-section summary::-webkit-details-marker {
      display: none;
    }
    .collapsible-section summary .section-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 15px;
      font-weight: 700;
    }
    .collapsible-section summary .section-title .emoji {
      font-size: 18px;
    }
    .collapsible-section summary .chevron {
      transition: transform 0.2s;
      color: color-mix(in srgb, var(--text) 72%, var(--muted));
      font-size: 16px;
      font-weight: 800;
      line-height: 1;
      min-width: 20px;
      text-align: center;
    }
    .collapsible-section[open] summary .chevron {
      transform: rotate(180deg);
    }
    .collapsible-section .section-body {
      padding: 16px;
    }
    .preview-list {
      display: grid;
      gap: 12px;
    }
    .preview-card {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface-2);
      overflow: hidden;
    }
    .preview-card header {
      position: static;
      border-bottom: 1px solid var(--line);
      background: transparent;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .preview-card pre {
      margin: 0;
      padding: 13px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
      font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      color: var(--text);
    }
    .login {
      max-width: 460px;
      margin: 80px auto;
    }
    @media (max-width: 1024px) {
      .layout { grid-template-columns: 1fr; }
      .admin-main { grid-template-columns: 1fr; }
      .sidebar { display: none; }
      .sidebar.open { display: flex; }
    }
    @media (max-width: 1260px) {
      .admin-main { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      .hero { grid-template-columns: 1fr; }
      .hero-actions { justify-content: flex-start; }
      .cols { grid-template-columns: 1fr; }
      .provider-grid { grid-template-columns: 1fr; }
      .mini-grid { grid-template-columns: 1fr; }
      .bar { flex-wrap: wrap; gap: 10px; }
    }
    @media (max-width: 480px) {
      .bar { flex-direction: column; align-items: stretch; }
      .toolbar { justify-content: space-between; }
      .login { margin: 40px auto; }
      .panel { padding: 12px; }
    }
    .code-inline {
      background: var(--chip);
      border: 1px solid var(--line);
      border-radius: 4px;
      padding: 1px 6px;
      font-family: ui-monospace, monospace;
      font-size: 12px;
    }
    .login-screen {
      display: grid;
      gap: 10px;
      min-height: 0;
      align-items: start;
      padding: 2px 0 6px;
    }
    .login-shell {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(340px, 430px);
      gap: 18px;
      align-items: stretch;
    }
    .login-info {
      display: grid;
      gap: 14px;
      min-height: 300px;
      align-content: start;
    }
    .login-title {
      font-size: clamp(28px, 3.2vw, 44px);
      font-weight: 880;
      line-height: 1.1;
      margin: 0;
      letter-spacing: 0;
      background: linear-gradient(135deg, #0f2f94 0%, #0f3a98 45%, #17bde6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .login-tagline {
      margin: 0;
      font-size: 16px;
      color: var(--text);
      font-weight: 650;
    }
    .login-desc {
      margin: 0;
      max-width: 62ch;
      font-size: 14px;
      color: var(--muted);
    }
    .login-feature-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .login-feature-item {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface-2);
      padding: 10px;
      display: grid;
      gap: 3px;
    }
    .login-feature-item strong {
      font-size: 13px;
      color: var(--text);
    }
    .login-feature-item span {
      font-size: 12px;
      color: var(--muted);
    }
    .login-cta {
      display: flex;
      flex-wrap: wrap;
      gap: 9px;
    }
    .login-panel {
      width: 100%;
      padding: 18px;
      border-radius: 10px;
      background: color-mix(in srgb, var(--surface) 95%, #fff 5%);
      border: 1px solid color-mix(in srgb, var(--line) 80%, var(--accent) 20%);
      box-shadow: 0 20px 44px rgba(7, 19, 36, .24);
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 12px;
      align-self: stretch;
      min-height: 100%;
    }
    .login-panel h2 {
      font-size: 18px;
      line-height: 1.2;
      text-align: center;
    }
    .login-extra-tags {
      display: flex;
      gap: 8px;
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 2px;
    }
    .tag-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      text-decoration: none;
      transition: opacity 0.15s;
    }
    .tag-chip:hover { opacity: 0.8; }
    .bug-tag {
      background: color-mix(in srgb, #ef4444 12%, transparent);
      color: #ef4444;
      border: 1px solid color-mix(in srgb, #ef4444 30%, transparent);
    }
    .sponsor-tag {
      background: color-mix(in srgb, #f97316 12%, transparent);
      color: #f97316;
      border: 1px solid color-mix(in srgb, #f97316 30%, transparent);
    }
    .login-brand-stack {
      display: grid;
      justify-items: center;
      gap: 10px;
      padding: 3px 0 4px;
    }
    .login-logo-icon {
      width: 86px;
      height: 86px;
      object-fit: contain;
      border-radius: 14px;
      border: 1px solid color-mix(in srgb, var(--line) 68%, var(--accent) 32%);
      background: #fff;
      padding: 6px;
    }
    .login-actions {
      display: flex;
      justify-content: center;
    }
    .login-actions button.primary {
      min-width: 100%;
      width: 100%;
      padding: 11px 24px;
      font-size: 15px;
      font-weight: 700;
      border-radius: 8px;
    }
    .login-reference {
      display: grid;
      gap: 8px;
      padding: 12px 16px;
      border-radius: 10px;
      background: var(--surface);
      border: 1px solid var(--line);
    }
    .login-reference h3 {
      font-size: 15px;
      font-weight: 700;
      margin: 0;
    }
    .login-reference-list {
      margin: 0;
      padding-left: 18px;
      display: grid;
      gap: 6px;
      color: var(--muted);
      font-size: 13px;
    }
    .login-reference-list li {
      line-height: 1.5;
    }
    @media (max-width: 1024px) {
      .login-shell {
        grid-template-columns: 1fr;
      }
      .login-panel {
        position: static;
        order: -1;
      }
      .login-info {
        min-height: 0;
      }
    }
    @media (max-width: 720px) {
      .login-feature-grid {
        grid-template-columns: 1fr;
      }
      .login-logo-icon {
        width: 74px;
        height: 74px;
      }
      .login-logo-wordmark {
        width: min(220px, 95%);
      }
    }
    /* Sidebar for admin */
    .sidebar {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .sidebar-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 7px;
      border: 1px solid transparent;
      color: var(--muted);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all .15s;
    }
    .sidebar-item:hover, .sidebar-item.active {
      background: var(--surface-2);
      border-color: var(--line);
      color: var(--text);
    }
    .sidebar-item.active {
      border-color: var(--accent);
      color: var(--accent);
    }
    .sidebar-divider {
      height: 1px;
      background: var(--line);
      margin: 6px 0;
    }
    /* Page-level footer */
    footer {
      border-top: 1px solid var(--line);
      background: var(--surface);
      padding: 24px 0 14px;
      margin-top: auto;
    }
    .page-footer {
      width: min(1400px, calc(100vw - 32px));
      margin: 0 auto;
      display: grid;
      gap: 16px;
    }
    .page-footer-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 28px;
      padding-bottom: 8px;
    }
    .page-footer-col {
      display: grid;
      gap: 10px;
    }
    .page-footer-col h3 {
      margin: 0;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 0;
    }
    .page-footer-desc {
      margin: 0;
      color: var(--muted);
      font-size: 16px;
    }
    .page-footer-links {
      display: grid;
      gap: 8px;
    }
    .page-footer-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      width: fit-content;
      color: var(--muted);
      font-size: 14px;
      font-weight: 600;
      transition: color .15s;
    }
    .page-footer-link:hover {
      color: var(--text);
    }
    .page-footer-bottom {
      border-top: 1px solid var(--line);
      padding-top: 12px;
    }
    .page-footer-copy {
      margin: 0;
      text-align: center;
      font-size: 12px;
      color: var(--muted);
    }
    @media (max-width: 780px) {
      .page-footer-grid {
        grid-template-columns: 1fr;
        gap: 18px;
      }
      .page-footer-col h3 {
        font-size: 24px;
      }
      .page-footer-desc {
        font-size: 14px;
      }
    }
    .sidebar-toggle { display: none; }
    @media (max-width: 1024px) {
      .sidebar-toggle { display: flex; }
    }

    /* Email address book */
    #emailAddressBook { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line); }
    #emailAddressBook h3 { margin: 0 0 8px; font-size: 14px; color: var(--text); }
    #emailRecipientsList { margin-bottom: 8px; }
    .email-recipient-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px solid var(--line); }
    .email-recipient-row:last-child { border-bottom: none; }
    .email-recipient-address { flex: 1; font-size: 13px; }
    .email-recipient-note { font-size: 12px; color: var(--muted); }
    .email-recipient-row button { font-size: 11px; padding: 2px 6px; }
    .email-recipient-select { display: flex; flex-direction: column; gap: 4px; }
</style>
</head>
<body>
  <header>
    <div class="bar">
      <a class="brand" href="https://github.com/InnoNestX" target="_blank" rel="noreferrer">
        <img class="brand-logo" src="https://avatars.githubusercontent.com/u/273979879?v=4" alt="InnoNestX">
        <div class="brand-title">
          <h1>GlobalPulse</h1>
          <div class="muted">by InnoNestX</div>
        </div>
      </a>
      <div class="toolbar">
        <button class="secondary icon-button" id="langButton" title="Toggle language">EN</button>
        <button class="secondary icon-button" id="themeButton" title="Theme">◐</button>
        <button class="secondary hidden" id="logoutButton" data-i18n="logout">退出</button>
      </div>
    </div>
  </header>
  <main>
    <section id="loginView">
      <div class="login-screen">
        <div class="login-shell">
          <section class="login-info panel">
            <span class="badge">GlobalPulse</span>
            <h2 class="login-title" data-i18n="heroTitleLP">金融与国际热点智能推送平台</h2>
            <p class="login-tagline" data-i18n="heroTagline">金融与国际热点智能推送平台</p>
            <p class="login-desc" data-i18n="heroDesc">多市场交易日历 · 多渠道实时推送 · 灵活模板配置 · 定时简报发送</p>
            <div class="login-feature-grid">
              <article class="login-feature-item">
                <strong data-i18n="feat1Title">多平台推送</strong>
                <span data-i18n="feat1Desc">支持飞书、微信公众号、Telegram、WeChat Clawbot 等多种渠道</span>
              </article>
              <article class="login-feature-item">
                <strong data-i18n="feat2Title">定时简报</strong>
                <span data-i18n="feat2Desc">基于 A股/US stock/crypto 交易日历自动发送，不错过任何交易日</span>
              </article>
              <article class="login-feature-item">
                <strong data-i18n="feat3Title">管理后台</strong>
                <span data-i18n="feat3Desc">可视化配置模板、渠道、日历，一键测试发送</span>
              </article>
              <article class="login-feature-item">
                <strong data-i18n="feat4Title">内容预览</strong>
                <span data-i18n="feat4Desc">实时预览推送到各渠道的实际内容，确保万无一失</span>
              </article>
            </div>
            <div class="login-cta">
              <a class="button-link primary" href="https://github.com/InnoNestX/GlobalPulse" target="_blank" rel="noreferrer" data-i18n="starGithub">⭐ Star on GitHub</a>
              <a class="button-link secondary" href="https://github.com/InnoNestX/GlobalPulse/pulls" target="_blank" rel="noreferrer" data-i18n="submitPR">🔧 Submit PR</a>
            </div>
          </section>

          <section class="login-panel" id="loginCard">
            <div class="login-brand-stack">
              <img
                class="login-logo-icon"
                src="/assets/globalpulse-project-logo.png?v=20260517-original"
                alt="GlobalPulse icon"
              >
            </div>
            <h2 data-i18n="loginTitle">Admin 登录</h2>
            <label>
              <span data-i18n="password">密码</span>
              <input id="passwordInput" type="password" autocomplete="current-password">
            </label>
            <div class="login-actions">
              <button type="button" class="primary" id="loginButton" onclick="window.__gpLogin && window.__gpLogin()" data-i18n="login">登录</button>
            </div>
            <span class="status" id="loginStatus"></span>
          </section>
        </div>

        <section class="login-reference">
          <h3 data-i18n="deployTitle">快速部署</h3>
          <ol class="login-reference-list">
            <li data-i18n="step1Desc">Fork github.com/InnoNestX/GlobalPulse 到你的 GitHub 账户</li>
            <li data-i18n="step2Desc">使用 Wrangler CLI 部署，或直接 push 到 GitHub 触发 Pages 部署</li>
            <li data-i18n="step3Desc">在 Cloudflare Dashboard 设置 ADMIN_PASSWORD 和各渠道的 WEBHOOK/TOKEN</li>
            <li data-i18n="step4Desc">访问 /admin 路径，输入密码登录并配置推送</li>
          </ol>
        </section>
      </div>
    </section>

    <section class="hidden" id="adminView">
      <div class="hero">
        <div>
          <div class="badge">InnoNestX Ops</div>
          <h2 data-i18n="heroTitle">金融与国际热点推送控制台</h2>
          <p class="muted" data-i18n="heroText">管理多市场交易日、内容模板、推送渠道和测试发送。</p>
        </div>
      </div>

      <section class="layout">
        <nav class="sidebar" id="sidebar">
          <button class="sidebar-item active" data-section="globalSettings">
            <span>⚙️</span> <span data-i18n="globalSettings">全局设置</span>
          </button>
          <button class="sidebar-item" data-section="schedules">
            <span>📅</span> <span data-i18n="schedules">推送时间表</span>
          </button>
          <button class="sidebar-item" data-section="preview">
            <span>📊</span> <span data-i18n="previewTitle">推送预览</span>
          </button>
          <button class="sidebar-item" data-section="template">
            <span>📝</span> <span data-i18n="template">全局模板</span>
          </button>
          <button class="sidebar-item" data-section="providers">
            <span>📡</span> <span data-i18n="providers">通知渠道</span>
          </button>
          <button class="sidebar-item" data-section="logs">
            <span>📜</span> <span data-i18n="logs">发送记录</span>
          </button>
        </nav>

        <div class="admin-main">
          <aside class="stack" id="sidebar-system">
            <details class="collapsible-section" id="section-globalSettings" open>
              <summary>
                <span class="section-title"><span class="emoji">⚙️</span> <span data-i18n="globalSettings">全局设置</span></span>
                <span class="chevron">▾</span>
              </summary>
              <div class="section-body stack">
                <label><span data-i18n="appName">应用名称</span><input id="appName"></label>
                <div class="cols">
                  <label><span data-i18n="contentLanguage">内容语言</span><select id="language"><option value="zh">中文</option><option value="en">English</option></select></label>
                  <label><span data-i18n="format">默认格式</span><select id="outputFormat"><option value="markdown">Markdown</option><option value="text">Text</option><option value="json">JSON</option></select></label>
                </div>
                <label><span data-i18n="timezone">时区</span><select id="timezone"></select></label>
                <label><span data-i18n="topicFocus">关注主题</span><textarea id="topicFocus"></textarea></label>
                <div>
                  <h3 data-i18n="defaultTargets">默认推送目标</h3>
                  <div class="target-list" id="defaultTargets"></div>
                </div>
                <div class="provider-form" id="researchSettingsForm"></div>
                <div class="row">
                  <button class="primary" id="saveButton" data-i18n="save">保存</button>
                  <button class="secondary" id="refreshButton" data-i18n="refresh">刷新</button>
                </div>
                <div class="status" id="saveStatus"></div>
              </div>
            </details>

            <details class="collapsible-section" id="section-providers" open>
              <summary>
                <span class="section-title"><span class="emoji">📡</span> <span data-i18n="providers">通知渠道</span></span>
                <span class="chevron">▾</span>
              </summary>
              <div class="section-body stack">
                <p class="muted" data-i18n="providerHelp">这里配置的 token / webhook 会存入 KV；Cloudflare secrets 也会继续生效。</p>
                <div class="provider-grid" id="providerStatus"></div>
                <div class="provider-form" id="providerSettingsForm"></div>
                <div class="stack hidden" id="providerExtras">
                  <div class="provider-config">
                    <h3><span>Email Provider</span><span class="badge">Brevo / Resend</span></h3>
                    <div id="emailProviderStatus"></div>
                  </div>
                  <div id="emailAddressBook">
                    <h3 data-i18n="emailAddressBook">邮件地址簿</h3>
                    <div id="emailRecipientsList"></div>
                    <div class="row">
                      <input id="newEmailAddress" placeholder="address@example.com" type="email" style="flex:1">
                      <input id="newEmailNote" placeholder="备注（可选）" style="flex:1">
                      <button class="secondary" id="addEmailRecipient" data-i18n="add">添加</button>
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </aside>

          <div class="stack">
            <details class="collapsible-section" id="section-schedules" open>
              <summary>
                <span class="section-title"><span class="emoji">📅</span> <span data-i18n="schedules">推送时间表</span></span>
                <span class="chevron">▾</span>
              </summary>
              <div class="section-body stack">
                <div class="section-head">
                  <button class="secondary" id="addScheduleButton" data-i18n="addSchedule">新增时间点</button>
                </div>
                <div class="provider-config">
                  <h3><span data-i18n="scheduleConfigurator">日报配置器</span><span class="badge" data-i18n="batchBuilder">批量生成</span></h3>
                  <div class="cols">
                    <label><span data-i18n="reportType">日报类型</span>
                      <select id="builderReportType">
                        <option value="a_share">A股</option>
                        <option value="us_stock">美股</option>
                        <option value="crypto">加密</option>
                        <option value="daily_hot">每日热点</option>
                        <option value="custom">自定义</option>
                      </select>
                    </label>
                    <label><span data-i18n="customReportName">自定义名称</span><input id="builderCustomName" placeholder="例如：AI 热点"></label>
                  </div>
                  <label><span data-i18n="slotTimes">时间点（多选后一次生成）</span>
                    <div class="target-list" id="builderSlots"></div>
                  </label>
                  <div class="row">
                    <button class="secondary" id="applySlotTemplateButton" data-i18n="applySlotTemplate">套用预置时间</button>
                    <button class="primary" id="buildSchedulesButton" data-i18n="buildSchedules">按所选时间生成计划</button>
                    <span class="status" id="builderStatus"></span>
                  </div>
                </div>
                <div class="stack" id="schedules"></div>
              </div>
            </details>

            <details class="collapsible-section" id="section-preview">
              <summary>
                <span class="section-title"><span class="emoji">📊</span> <span data-i18n="previewTitle">推送预览</span></span>
                <span class="chevron">▾</span>
              </summary>
              <div class="section-body">
                <div class="section-head">
                  <div>
                    <div class="muted" data-i18n="previewHelp">查看当前配置会发送到各渠道的实际内容。</div>
                  </div>
                  <div class="row">
                    <select id="previewScheduleSelect" aria-label="Preview schedule"></select>
                    <button class="secondary" id="refreshPreviewButton" data-i18n="refreshPreview">刷新预览</button>
                  </div>
                </div>
                <div class="status" id="previewStatus"></div>
                <div class="preview-list" id="previewList"></div>
              </div>
            </details>

            <details class="collapsible-section" id="section-template">
              <summary>
                <span class="section-title"><span class="emoji">📝</span> <span data-i18n="template">全局模板</span></span>
                <span class="chevron">▾</span>
              </summary>
              <div class="section-body">
                <textarea id="template"></textarea>
                <div class="muted" data-i18n="variables">变量：{{generatedAt}}, {{timezone}}, {{topicQuery}}, {{sourceUrl}}, {{itemsMarkdown}}, {{itemsText}}, {{itemsJson}}</div>
              </div>
            </details>

            <details class="collapsible-section" id="section-logs">
              <summary>
                <span class="section-title"><span class="emoji">📜</span> <span data-i18n="logs">发送记录</span></span>
                <span class="chevron">▾</span>
              </summary>
              <div class="section-body">
                <div class="section-head">
                  <button class="secondary" id="loadLogsButton" data-i18n="refreshLogs">刷新记录</button>
                </div>
                <div class="logs" id="logs"></div>
              </div>
            </details>
          </div>
        </div>
      </section>
    </section>
  </main>

  <footer>
    <div class="page-footer">
      <div class="page-footer-grid">
        <section class="page-footer-col">
          <h3 data-i18n="footerContribute">Contribute</h3>
          <p class="page-footer-desc" data-i18n="footerContributeDesc">Found a bug or want to contribute?</p>
          <div class="page-footer-links">
            <a class="page-footer-link" href="https://github.com/InnoNestX/GlobalPulse/issues/new/choose" target="_blank" rel="noreferrer" data-i18n="footerBug">🐛 Report Bug</a>
            <a class="page-footer-link" href="https://github.com/InnoNestX/GlobalPulse/pulls" target="_blank" rel="noreferrer" data-i18n="footerPR">🔧 Submit PR</a>
            <a class="page-footer-link" href="https://github.com/InnoNestX/GlobalPulse/stargazers" target="_blank" rel="noreferrer" data-i18n="footerStar">⭐ Star Repo</a>
          </div>
        </section>
        <section class="page-footer-col">
          <h3 data-i18n="footerSupport">Support</h3>
          <p class="page-footer-desc" data-i18n="footerSupportDesc">Enjoy the API? Support the project!</p>
          <div class="page-footer-links">
            <a class="page-footer-link" href="https://github.com/sponsors/InnoNestX" target="_blank" rel="noreferrer" data-i18n="footerSponsor">💖 Sponsor</a>
            <a class="page-footer-link" href="https://github.com/sponsors/InnoNestX" target="_blank" rel="noreferrer" data-i18n="footerCoffee">☕ Buy Me a Coffee</a>
            <a class="page-footer-link" href="https://github.com/InnoNestX/GlobalPulse/discussions" target="_blank" rel="noreferrer" data-i18n="footerDiscuss">💬 Discussions</a>
          </div>
        </section>
      </div>
      <div class="page-footer-bottom">
        <p class="page-footer-copy" data-i18n="footerCopy">© 2026 InnoNestX · Made with ❤️ for the community</p>
      </div>
    </div>
  </footer>

  <script>
    const providers = ["feishu", "wechat_official_account", "wechat_clawbot", "telegram", "email"];
    const providerLabels = {
      feishu: "Feishu",
      wechat_official_account: "WeChat OA",
      wechat_clawbot: "WeChat Bot",
      telegram: "Telegram",
      email: "Email"
    };
    const marketOptions = [
      ["everyday", "Every day"],
      ["a_share", "A-share"],
      ["us_stock", "US stock"],
      ["crypto", "Crypto"]
    ];
    const reportTypeOptions = [
      ["a_share", "A股"],
      ["us_stock", "美股"],
      ["crypto", "加密"],
      ["daily_hot", "每日热点"],
      ["custom", "Custom"]
    ];
    const reportModeOptions = [
      ["market", "市场报告"],
      ["digest", "通用简报"]
    ];
    const marketSessionOptions = [
      ["pre_open", "开盘前"],
      ["intraday", "盘中"],
      ["post_close", "盘后"]
    ];
    const slotTemplates = {
      a_share: ["09:00", "13:00", "16:00"],
      us_stock: ["21:30", "23:30", "04:30", "07:30"],
      crypto: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"],
      daily_hot: ["10:00", "17:00"],
      custom: []
    };
    const timezones = ["Asia/Hong_Kong", "Asia/Shanghai", "UTC", "America/New_York", "Europe/London", "Europe/Paris", "Asia/Tokyo", "Asia/Singapore"];
    const dict = {
      zh: {
        feedback: "提 Bug / 需求",
        logout: "退出",
        loginTitle: "Admin 登录",
        password: "密码",
        login: "登录",
        heroTitle: "金融与国际热点推送控制台",
        heroText: "管理多市场交易日、内容模板、推送渠道和测试发送。",
        globalSettings: "全局设置",
        localOnly: "配置保存在 KV",
        appName: "应用名称",
        contentLanguage: "内容语言",
        timezone: "时区",
        format: "默认格式",
        topicFocus: "关注主题",
        defaultTargets: "默认推送目标",
        save: "保存",
        refresh: "刷新",
        providers: "通知渠道",
        providerHelp: "这里配置的 token / webhook 会存入 KV；Cloudflare secrets 也会继续生效。",
        researchHelp: "研究引擎配置会存入 KV；Cloudflare Secrets 会继续作为兜底。",
        configured: "已配置",
        notConfigured: "未配置",
        providerConfig: "渠道参数",
        feishuWebhookUrl: "飞书 Webhook URL",
        feishuSigningSecret: "飞书签名密钥",
        wechatOfficialAppId: "微信公众号 App ID",
        wechatOfficialAppSecret: "微信公众号 App Secret",
        wechatOfficialOpenId: "微信公众号 OpenID",
        wechatClawbotWebhookUrl: "wechat clawbot Webhook URL",
        wechatClawbotWebhookKey: "wechat clawbot Webhook Key",
        telegramBotToken: "Telegram Bot Token",
        telegramChatId: "Telegram Chat ID",
        brevoApiKey: "BREVO_API_KEY",
        emailFrom: "EMAIL_FROM（发件人）",
        emailFromOverride: "发件人地址（可选，覆盖全局）",
        clickToEdit: "点击编辑",
        clickToSaveAndClose: "再次点击自动保存并收起",
        emailAddressBook: "邮件地址簿",
        addEmailRecipient: "添加",
        removeEmailRecipient: "移除",
        noEmailRecipients: "暂无邮件地址，点击添加",
        emailRecipientsSection: "邮件发送对象",        schedules: "推送时间表",
        addSchedule: "新增时间点",
        scheduleConfigurator: "日报配置器",
        batchBuilder: "批量生成",
        reportType: "日报类型",
        reportMode: "报告模式",
        marketSession: "交易阶段",
        customReportName: "自定义名称",
        slotTimes: "时间点（可多选）",
        applySlotTemplate: "套用预置时间",
        buildSchedules: "按所选时间生成计划",
        triggerMode: "触发模式",
        triggerModeSlots: "时间点匹配",
        triggerModeCron: "手工 cron",
        cronExpression: "Cron 表达式",
        cronHelp: "Cron 为 5 段格式，分钟位需兼容 5 分钟轮询。",
        skipNonTradingInCron: "Cron 模式跳过非交易日",
        focusSymbols: "特别关注代码",
        positionSymbols: "持仓代码",
        symbolsHelp: "支持逗号/空格/换行，自动去重。",
        autoMarketSourceExternal: "交易日来源：第三方交易日历（自动）",
        autoMarketSourceAlwaysOpen: "交易日来源：自然日/7x24（自动）",
        sourceStateLive: "实时数据",
        sourceStateFallback: "回退预览",
        previewTitle: "推送预览",
        previewHelp: "查看当前配置会发送到各渠道的实际内容。",
        refreshPreview: "刷新预览",
        previewEmpty: "选择一个时间表后查看预览。",
        template: "全局模板",
        variables: "变量：{{generatedAt}}, {{timezone}}, {{topicQuery}}, {{sourceUrl}}, {{itemsMarkdown}}, {{itemsText}}, {{itemsJson}}, {{marketReport}}",
        logs: "最近记录",
        refreshLogs: "刷新记录",
        name: "名称",
        enabled: "启用",
        disabled: "停用",
        time: "时间",
        days: "星期",
        targets: "推送目标",
        topicQuery: "热点查询",
        sourceUrl: "RSS 来源 URL",
        scheduleTemplate: "时间点模板",
        marketCalendar: "交易日历",
        tradingDaySource: "交易日判断",
        weekdayManual: "工作日 + 手工休市日",
        externalCalendar: "第三方自动获取",
        marketHolidayDates: "额外休市日",
        marketHolidayHelp: "多个日期用逗号、空格或换行分隔，例如 2026-01-01。",
        testSend: "测试发送",
        remove: "删除",
        saved: "已保存",
        loaded: "已加载",
        testing: "正在收集并推送...",
        testQueued: "测试已发送",
        loginFailed: "登录失败",
        loginOk: "登录成功",
        noLogs: "暂无记录",
        themeToggle: "切换主题",
        heroTitleLP: "金融与国际热点智能推送平台",
        heroTagline: "金融与国际热点智能推送平台",
        heroDesc: "多市场交易日历 · 多渠道实时推送 · 灵活模板配置 · 定时简报发送",
        starGithub: "⭐ Star on GitHub",
        submitPR: "🔧 Submit PR",
        bugLabel: "Bug",
        sponsorLabel: "请我喝咖啡",
        contributeTitle: "Contribute",
        reportBug: "Report Bug",
        starRepo: "Star Repo",
        supportTitle: "Support",
        sponsor: "Sponsor",
        buyCoffee: "Buy Me a Coffee",
        discussions: "Discussions",
        feat1Title: "多平台推送",
        feat1Desc: "支持飞书、微信公众号、Telegram、WeChat Clawbot 等多种渠道",
        feat2Title: "定时简报",
        feat2Desc: "基于 A股/US stock/crypto 交易日历自动发送，不错过任何交易日",
        feat3Title: "管理后台",
        feat3Desc: "可视化配置模板、渠道、日历，一键测试发送",
        feat4Title: "内容预览",
        feat4Desc: "实时预览推送到各渠道的实际内容，确保万无一失",
        apiTitle: "API Endpoints",
        api1Desc: "发送消息到已配置渠道",
        api2Desc: "健康检查接口",
        api3Desc: "触发测试推送",
        api4Desc: "获取推送时间表",
        deployTitle: "快速部署",
        step1Title: "Fork 本项目",
        step1Desc: "Fork github.com/InnoNestX/GlobalPulse 到你的 GitHub 账户",
        step2Title: "部署到 Cloudflare Workers",
        step2Desc: "使用 Wrangler CLI 部署，或直接 push 到 GitHub 触发 Pages 部署",
        step3Title: "配置环境变量",
        step3Desc: "在 Cloudflare Dashboard 设置 ADMIN_PASSWORD 和各渠道的 WEBHOOK/TOKEN",
        step4Title: "访问 Admin 后台",
        step4Desc: "访问 /admin 路径，输入密码登录并配置推送",
        footerContribute: "Contribute",
        footerContributeDesc: "发现 Bug 或想参与贡献？",
        footerSupport: "Support",
        footerSupportDesc: "喜欢这个 API？欢迎支持项目！",
        footerBug: "🐛 Report Bug",
        footerPR: "🔧 Submit PR",
        footerStar: "⭐ Star Repo",
        footerSponsor: "💖 Sponsor",
        footerCoffee: "☕ Buy Me a Coffee",
        footerDiscuss: "💬 Discussions",
        footerCopy: "© 2026 InnoNestX · Made with ❤️ for the community",
        moduleNews: "新闻",
        moduleUsMarket: "美股",
        moduleAShare: "A股",
        moduleCrypto: "加密货币",
        moduleFearGreed: "恐慌贪婪",
        moduleTechnicals: "技术指标",
        moduleSentiment: "情绪",
        moduleCatalysts: "催化剂",
        moduleXSentiment: "X情绪",
        modulePositions: "持仓",
        moduleMacro: "宏观",
        researchEngine: "研究引擎",
        geminiApiKey: "Gemini API Key",
        geminiBaseUrl: "Gemini Base URL",
        geminiModel: "Gemini Model",
        workersAiModel: "Workers AI Model",
        alphaVantageApiKey: "Alpha Vantage API Key",
        fredApiKey: "FRED API Key",
        blsApiKey: "BLS API Key",
        beaApiKey: "BEA API Key"
      },
      en: {
        feedback: "Bug / request",
        logout: "Log out",
        loginTitle: "Admin Login",
        password: "Password",
        login: "Login",
        heroTitle: "Finance and global hotspot control center",
        heroText: "Manage market calendars, templates, providers, and test sends.",
        globalSettings: "Global Settings",
        localOnly: "Stored in KV",
        appName: "App name",
        contentLanguage: "Content language",
        timezone: "Timezone",
        format: "Default format",
        topicFocus: "Topic focus",
        defaultTargets: "Default targets",
        save: "Save",
        refresh: "Refresh",
        providers: "Providers",
        providerHelp: "Tokens and webhooks saved here are stored in KV; Cloudflare secrets still work.",
        researchHelp: "Research engine settings are stored in KV; Cloudflare Secrets remain as fallback.",
        configured: "Configured",
        notConfigured: "Not configured",
        providerConfig: "Provider parameters",
        feishuWebhookUrl: "Feishu webhook URL",
        feishuSigningSecret: "Feishu signing secret",
        wechatOfficialAppId: "WeChat Official Account App ID",
        wechatOfficialAppSecret: "WeChat Official Account App Secret",
        wechatOfficialOpenId: "WeChat Official Account OpenID",
        wechatClawbotWebhookUrl: "wechat clawbot webhook URL",
        wechatClawbotWebhookKey: "wechat clawbot webhook key",
        telegramBotToken: "Telegram bot token",
        telegramChatId: "Telegram chat ID",
        brevoApiKey: "BREVO_API_KEY",
        emailFrom: "EMAIL_FROM (sender)",
        emailRecipients: "Email recipients (comma-separated)",
        emailFromOverride: "Sender address (optional, overrides global)",
        clickToEdit: "Click to edit",
        clickToSaveAndClose: "Click again to save and close",
        emailAddressBook: "Email Address Book",
        addEmailRecipient: "Add",
        removeEmailRecipient: "Remove",
        noEmailRecipients: "No email addresses yet, click Add",
        emailRecipientsSection: "Email Recipients",        schedules: "Schedules",
        addSchedule: "Add time",
        scheduleConfigurator: "Report configurator",
        batchBuilder: "Batch builder",
        reportType: "Report type",
        reportMode: "Report mode",
        marketSession: "Market session",
        customReportName: "Custom name",
        slotTimes: "Time slots (multi-select)",
        applySlotTemplate: "Apply preset slots",
        buildSchedules: "Build schedules from selected slots",
        triggerMode: "Trigger mode",
        triggerModeSlots: "Time slots",
        triggerModeCron: "Manual cron",
        cronExpression: "Cron expression",
        cronHelp: "Use 5-field cron; minute values must match 5-minute polling.",
        skipNonTradingInCron: "Skip non-trading days in cron mode",
        focusSymbols: "Focus symbols",
        positionSymbols: "Position symbols",
        symbolsHelp: "Comma/space/newline supported, auto-deduped.",
        autoMarketSourceExternal: "Trading-day source: third-party market calendar (auto)",
        autoMarketSourceAlwaysOpen: "Trading-day source: natural day / 7x24 (auto)",
        sourceStateLive: "Live data",
        sourceStateFallback: "Fallback preview",
        previewTitle: "Push preview",
        previewHelp: "See the exact payload each selected provider will receive.",
        refreshPreview: "Refresh preview",
        previewEmpty: "Select a schedule to preview.",
        template: "Global template",
        variables: "Variables: {{generatedAt}}, {{timezone}}, {{topicQuery}}, {{sourceUrl}}, {{itemsMarkdown}}, {{itemsText}}, {{itemsJson}}, {{marketReport}}",
        logs: "Recent logs",
        refreshLogs: "Refresh logs",
        name: "Name",
        enabled: "Enabled",
        disabled: "Disabled",
        time: "Time",
        days: "Days",
        targets: "Targets",
        topicQuery: "Topic query",
        sourceUrl: "RSS source URL",
        scheduleTemplate: "Schedule template",
        marketCalendar: "Market calendar",
        tradingDaySource: "Trading-day check",
        weekdayManual: "Weekday + manual closed dates",
        externalCalendar: "Auto third-party",
        marketHolidayDates: "Extra closed dates",
        marketHolidayHelp: "Separate dates with commas, spaces, or line breaks, for example 2026-01-01.",
        testSend: "Test send",
        remove: "Remove",
        saved: "Saved",
        loaded: "Loaded",
        testing: "Collecting and sending...",
        testQueued: "Test sent",
        loginFailed: "Login failed",
        loginOk: "Logged in",
        noLogs: "No logs yet",
        themeToggle: "Toggle theme",
        heroTitleLP: "AI-Powered Finance and Global News Push Platform",
        heroTagline: "AI-Powered Finance and Global News Push Platform",
        heroDesc: "Multi-market trading calendars · Multi-channel real-time push · Flexible template config · Scheduled digest delivery",
        starGithub: "⭐ Star on GitHub",
        submitPR: "🔧 Submit PR",
        bugLabel: "Bug",
        sponsorLabel: "Buy me a coffee",
        contributeTitle: "Contribute",
        reportBug: "Report Bug",
        starRepo: "Star Repo",
        supportTitle: "Support",
        sponsor: "Sponsor",
        buyCoffee: "Buy Me a Coffee",
        discussions: "Discussions",
        feat1Title: "Multi-Platform Push",
        feat1Desc: "Supports Feishu, WeChat Official Account, Telegram, WeChat Clawbot and more",
        feat2Title: "Scheduled Digests",
        feat2Desc: "Auto-sends based on A-share/US stock/crypto trading calendars — never miss a trading day",
        feat3Title: "Admin Dashboard",
        feat3Desc: "Visual config for templates, channels, and calendars with one-click test send",
        feat4Title: "Content Preview",
        feat4Desc: "Real-time preview of actual content sent to each channel",
        apiTitle: "API Endpoints",
        api1Desc: "Send messages to configured channels",
        api2Desc: "Health check endpoint",
        api3Desc: "Trigger test push",
        api4Desc: "Get push schedule",
        deployTitle: "Quick Deploy",
        step1Title: "Fork this project",
        step1Desc: "Fork github.com/InnoNestX/GlobalPulse to your GitHub account",
        step2Title: "Deploy to Cloudflare Workers",
        step2Desc: "Deploy via Wrangler CLI, or push to GitHub to trigger Pages deployment",
        step3Title: "Configure env vars",
        step3Desc: "Set ADMIN_PASSWORD and channel WEBHOOK/TOKEN in Cloudflare Dashboard",
        step4Title: "Access Admin panel",
        step4Desc: "Visit /admin, enter password to login and configure push",
        footerContribute: "Contribute",
        footerContributeDesc: "Found a bug or want to contribute?",
        footerSupport: "Support",
        footerSupportDesc: "Enjoy the API? Support the project!",
        footerBug: "🐛 Report Bug",
        footerPR: "🔧 Submit PR",
        footerStar: "⭐ Star Repo",
        footerSponsor: "💖 Sponsor",
        footerCoffee: "☕ Buy Me a Coffee",
        footerDiscuss: "💬 Discussions",
        footerCopy: "© 2026 InnoNestX · Made with ❤️ for the community",
        moduleNews: "News",
        moduleUsMarket: "US Market",
        moduleAShare: "A-Share",
        moduleCrypto: "Crypto",
        moduleFearGreed: "Fear & Greed",
        moduleTechnicals: "Technicals",
        moduleSentiment: "Sentiment",
        moduleCatalysts: "Catalysts",
        moduleXSentiment: "X Sentiment",
        modulePositions: "Positions",
        moduleMacro: "Macro",
        researchEngine: "Research Engine",
        geminiApiKey: "Gemini API Key",
        geminiBaseUrl: "Gemini Base URL",
        geminiModel: "Gemini Model",
        workersAiModel: "Workers AI Model",
        alphaVantageApiKey: "Alpha Vantage API Key",
        fredApiKey: "FRED API Key",
        blsApiKey: "BLS API Key",
        beaApiKey: "BEA API Key"
      }
    };
    const dayLabels = {
      zh: ["日", "一", "二", "三", "四", "五", "六"],
      en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    };
    let state = null;
    let providerStatus = [];
    let activeProvider = null;
    let password = localStorage.getItem("globalpulse_admin_password") || "";
    let uiLanguage = localStorage.getItem("globalpulse_ui_language") || "en";
    let theme = "";

    const $ = (id) => {
      const el = document.getElementById(id);
      if (!el) console.warn("[admin-ui] Element not found:", id);
      return el;
    };

    function t(key) {
      return (dict[uiLanguage] && dict[uiLanguage][key]) || dict.zh[key] || key;
    }

    function applyTheme() {
      const stored = localStorage.getItem("globalpulse_theme");
      if (!stored) {
        theme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      } else {
        theme = stored;
      }
      document.documentElement.dataset.theme = theme;
      const icon = theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "💻";
      const themeBtn = $("themeButton");
      if (themeBtn) themeBtn.textContent = icon;
    }

    function cycleTheme() {
      const order = ["dark", "light", "system"];
      const stored = localStorage.getItem("globalpulse_theme");
      const current = stored || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
      const idx = order.indexOf(current);
      theme = order[(idx + 1) % order.length];
      localStorage.setItem("globalpulse_theme", theme);
      applyTheme();
    }

    function applyI18n() {
      document.documentElement.lang = uiLanguage;
      const langBtn = $("langButton");
      if (langBtn) langBtn.textContent = uiLanguage === "en" ? "中" : "EN";
      if (langBtn) langBtn.title = uiLanguage === "en" ? "Switch to 中文" : "Switch to English";
      document.querySelectorAll("[data-i18n]").forEach((node) => {
        node.textContent = t(node.dataset.i18n);
      });
    }

    async function api(path, options = {}) {
      const response = await fetch(path, {
        ...options,
        headers: {
          "Authorization": "Bearer " + password,
          "Content-Type": "application/json",
          ...(options.headers || {})
        }
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || response.statusText);
      return body;
    }

    async function login() {
      password = $("passwordInput").value.trim();
      $("loginStatus").textContent = "";
      try {
        await api("/api/admin/login", { method: "POST", body: JSON.stringify({ password }) });
        localStorage.setItem("globalpulse_admin_password", password);
        $("loginStatus").textContent = t("loginOk");
        await loadSettings();
      } catch (error) {
        const reason = (error && error.message) ? error.message : t("loginFailed");
        $("loginStatus").textContent = t("loginFailed") + " (" + reason + ")";
      }
    }
    window.__gpLogin = login;

    async function loadSettings() {
      const body = await api("/api/admin/settings");
      state = body.settings;
      providerStatus = body.providers || [];
      activeProvider = null;
      $("loginView").classList.add("hidden");
      $("adminView").classList.remove("hidden");
      $("logoutButton").classList.remove("hidden");
      render();
      await loadLogs();
      await loadPreview().catch((error) => {
        $("previewStatus").textContent = error.message || "Preview failed";
      });
    }

    function render() {
      state.providerSettings = state.providerSettings || {};
      $("appName").value = state.appName;
      $("language").value = state.language;
      $("outputFormat").value = state.outputFormat;
      $("topicFocus").value = state.topicFocus;
      $("template").value = state.template;
      renderTimezoneSelect($("timezone"), state.timezone);
      renderTargetList($("defaultTargets"), state.defaultTargets, "default");
      renderProviderStatus();
      renderProviderSettings();
      renderResearchSettings();
      renderProviderExtras();
      renderSlotBuilder();
      renderSchedules();
      renderPreviewSelect();
      applyI18n();
    }

    function renderProviderStatus() {
      $("providerStatus").innerHTML = providers.map((provider) => {
        const status = providerStatus.find((entry) => entry.name === provider);
        const ok = status && status.configured;
        const isActive = activeProvider === provider;
        return '<button type="button" class="provider-card ' + (ok ? "configured" : "unconfigured") + (isActive ? " active" : "") + '" data-provider-card="' + provider + '">' +
          '<span class="provider-title">' + escapeHtml(providerLabels[provider]) + '<span class="provider-hint">' + escapeHtml(isActive ? t("clickToSaveAndClose") : t("clickToEdit")) + '</span></span>' +
          '<span class="badge ' + (ok ? "ok" : "warn") + '">' + (ok ? t("configured") : t("notConfigured")) + '</span>' +
          '</button>';
      }).join("");
    }

    function renderEmailProviderStatus() {
      const el = $("emailProviderStatus");
      if (!el) return;
      const emailConfigured = providerStatus.find((p) => p.name === "email")?.configured ?? false;
      el.innerHTML = '<div class="row"><span class="badge ' + (emailConfigured ? "ok" : "warn") + '">' + (emailConfigured ? t("configured") : t("notConfigured")) + '</span><span class="muted">BREVO_API_KEY + EMAIL_FROM</span></div>';
    }

    function renderProviderSettings() {
      const values = state.providerSettings || {};
      const groups = {
        feishu: {
          name: "Feishu",
          fields: [
            ["feishuWebhookUrl", t("feishuWebhookUrl"), "text"],
            ["feishuSigningSecret", t("feishuSigningSecret"), "password"]
          ]
        },
        wechat_official_account: {
          name: "WeChat OA",
          fields: [
            ["wechatOfficialAppId", t("wechatOfficialAppId"), "password"],
            ["wechatOfficialAppSecret", t("wechatOfficialAppSecret"), "password"],
            ["wechatOfficialOpenId", t("wechatOfficialOpenId"), "password"]
          ]
        },
        wechat_clawbot: {
          name: "WeChat Bot",
          fields: [
            ["wechatClawbotWebhookUrl", t("wechatClawbotWebhookUrl"), "text"],
            ["wechatClawbotWebhookKey", t("wechatClawbotWebhookKey"), "password"]
          ]
        },
        telegram: {
          name: "Telegram",
          fields: [
            ["telegramBotToken", t("telegramBotToken"), "password"],
            ["telegramChatId", t("telegramChatId"), "text"]
          ]
        },
        email: {
          name: "Email",
          fields: [
            ["brevoApiKey", t("brevoApiKey"), "password"],
            ["emailFrom", t("emailFrom"), "text"],
            ["emailFromOverride", t("emailFromOverride"), "text"]
          ]
        }
      };

      if (!activeProvider || !groups[activeProvider]) {
        $("providerSettingsForm").innerHTML = '<div class="provider-config"><h3><span>' + t("providerConfig") + '</span><span class="badge">' + t("providers") + '</span></h3><p class="muted">' + t("clickToEdit") + '</p></div>';
        return;
      }

      const group = groups[activeProvider];
      $("providerSettingsForm").innerHTML = '<div class="provider-config" data-provider-group="' + activeProvider + '"><h3><span>' + group.name + '</span><span class="badge">' + t("providerConfig") + '</span></h3>' +
        group.fields.map(([key, label, type]) => renderMaskedProviderField(values, key, label, type)).join("") + '</div>';
    }

    function renderResearchSettings() {
      const values = state.providerSettings || {};
      const fields = [
        ["geminiApiKey", t("geminiApiKey"), "password"],
        ["geminiBaseUrl", t("geminiBaseUrl"), "text"],
        ["geminiModel", t("geminiModel"), "text"],
        ["workersAiModel", t("workersAiModel"), "text"],
        ["alphaVantageApiKey", t("alphaVantageApiKey"), "password"],
        ["fredApiKey", t("fredApiKey"), "password"],
        ["blsApiKey", t("blsApiKey"), "password"],
        ["beaApiKey", t("beaApiKey"), "password"]
      ];
      $("researchSettingsForm").innerHTML = '<div class="provider-config"><h3><span>' + t("researchEngine") + '</span><span class="badge">Gemini / Alpha / Macro</span></h3>' +
        '<p class="muted">' + t("researchHelp") + '</p>' +
        fields.map(([key, label, type]) => renderMaskedProviderField(values, key, label, type)).join("") + '</div>';
    }

    function renderProviderExtras() {
      const wrapper = $("providerExtras");
      if (!wrapper) return;
      const showEmailExtras = activeProvider === "email";
      wrapper.classList.toggle("hidden", !showEmailExtras);
      if (!showEmailExtras) return;
      renderEmailProviderStatus();
      renderEmailAddressBook();
    }

    function renderMaskedProviderField(values, key, label, type) {
      const raw = String(values[key] || "");
      const masked = maskProviderValue(raw);
      const maskedFlag = raw ? "1" : "0";
      const renderedValue = raw ? masked : "";
      return '<label>' + label + '<input type="' + type + '" autocomplete="off" spellcheck="false" data-provider-setting="' + key + '" data-masked="' + maskedFlag + '" value="' + escapeAttr(renderedValue) + '"></label>';
    }

    function maskProviderValue(value) {
      const trimmed = String(value || "").trim();
      if (!trimmed) return "";
      if (trimmed.length <= 4) return "••••";
      return "••••••" + trimmed.slice(-4);
    }

    // ─── Email Address Book ───────────────────────────────────────────────────

    function renderEmailAddressBook() {
      const list = $("emailRecipientsList");
      if (!list) return;
      const recipients = state.emailRecipients || [];
      if (!recipients.length) {
        list.innerHTML = '<div class="muted" data-i18n="noEmailRecipients">' + t("noEmailRecipients") + '</div>';
        return;
      }
      list.innerHTML = recipients.map((r) =>
        '<div class="email-recipient-row">' +
          '<span class="email-recipient-address">' + escapeHtml(r.address) + '</span>' +
          (r.note ? '<span class="email-recipient-note muted">' + escapeHtml(r.note) + '</span>' : '') +
          '<button class="danger small" data-action="removeEmailRecipient" data-id="' + r.id + '" data-i18n="remove">' + t("remove") + '</button>' +
        '</div>'
      ).join("");
    }

    function addEmailRecipient() {
      const addressInput = $("newEmailAddress");
      const noteInput = $("newEmailNote");
      if (!addressInput || !noteInput) return;
      const address = addressInput.value.trim();
      const note = noteInput.value.trim();
      if (!address || !address.includes("@")) {
        addressInput.focus();
        return;
      }
      state.emailRecipients = state.emailRecipients || [];
      state.emailRecipients.push({
        id: crypto.randomUUID(),
        address,
        note,
        enabled: true,
      });
      addressInput.value = "";
      noteInput.value = "";
      renderEmailAddressBook();
    }

    function removeEmailRecipient(id) {
      state.emailRecipients = (state.emailRecipients || []).filter((r) => r.id !== id);
      renderEmailAddressBook();
    }

    // ─── Email recipient selector for a schedule ─────────────────────────────

    function renderScheduleEmailSelect(index) {
      const recipients = state.emailRecipients || [];
      if (!recipients.length) return '<div class="muted">' + t("noEmailRecipients") + '</div>';
      const selected = (state.schedules[index].emailRecipientIds || []);
      return recipients.map((r) =>
        '<label class="inline-checkbox">' +
          '<input type="checkbox" data-index="' + index + '" data-field="emailRecipientIds" value="' + r.id + '"' +
            (selected.includes(r.id) ? " checked" : "") + '>' +
          '<span>' + escapeHtml(r.address) + (r.note ? " (" + escapeHtml(r.note) + ")" : "") + '</span>' +
        '</label>'
      ).join("");
    }

    function collectEmailRecipientIds(schedule) {
      const checkboxes = document.querySelectorAll(
        'input[data-index][data-field="emailRecipientIds"]:checked'
      );
      // Only collect for the specific schedule index
      schedule.emailRecipientIds = Array.from(checkboxes)
        .filter((cb) => Number(cb.dataset.index) === state.schedules.indexOf(schedule))
        .map((cb) => cb.value);
    }

    function collectModuleSwitches(index, schedule) {
      const readChecked = (field) => {
        const node = document.querySelector('input[data-index="' + index + '"][data-field="' + field + '"]');
        return !!(node && node.checked);
      };

      schedule.moduleSwitches = {
        news: readChecked("moduleSwitches_news"),
        us_market: readChecked("moduleSwitches_us_market"),
        a_share: readChecked("moduleSwitches_a_share"),
        crypto: readChecked("moduleSwitches_crypto"),
        fear_greed: readChecked("moduleSwitches_fear_greed"),
        technicals: readChecked("moduleSwitches_technicals"),
        sentiment: readChecked("moduleSwitches_sentiment"),
        catalysts: readChecked("moduleSwitches_catalysts"),
        x_sentiment: readChecked("moduleSwitches_x_sentiment"),
        positions: readChecked("moduleSwitches_positions"),
        macro: readChecked("moduleSwitches_macro"),
      };

      // Cleanup flattened transient fields used during editing
      delete schedule.moduleSwitches_news;
      delete schedule.moduleSwitches_us_market;
      delete schedule.moduleSwitches_a_share;
      delete schedule.moduleSwitches_crypto;
      delete schedule.moduleSwitches_fear_greed;
      delete schedule.moduleSwitches_technicals;
      delete schedule.moduleSwitches_sentiment;
      delete schedule.moduleSwitches_catalysts;
      delete schedule.moduleSwitches_x_sentiment;
      delete schedule.moduleSwitches_positions;
      delete schedule.moduleSwitches_macro;
    }

    function renderTimezoneSelect(select, value) {
      select.innerHTML = timezones.map((zone) => '<option value="' + zone + '">' + zone + '</option>').join("");
      select.value = value || "Asia/Hong_Kong";
    }

    function renderTargetList(container, selected, name) {
      container.innerHTML = providers.map((provider) => {
        const checked = selected.includes(provider) ? "checked" : "";
        return '<label><input type="checkbox" name="' + name + '" value="' + provider + '" ' + checked + '><span>' + providerLabels[provider] + '</span></label>';
      }).join("");
    }

    function renderSlotBuilder() {
      const reportType = $("builderReportType").value || "a_share";
      const slots = slotTemplates[reportType] || [];

      $("builderSlots").innerHTML = slots.map((slot) =>
        '<label><input type="checkbox" name="builder-slots" value="' + slot + '" checked><span>' + slot + '</span></label>'
      ).join("");
      $("builderStatus").textContent = "";
    }

    function renderSchedules() {
      $("schedules").innerHTML = state.schedules.map((schedule, index) => {
        schedule.triggerMode = schedule.triggerMode || "slots";
        schedule.skipNonTradingInCron = Boolean(schedule.skipNonTradingInCron);
        schedule.cronExpression = schedule.cronExpression || "";
        schedule.marketCalendar = schedule.marketCalendar || "everyday";
        schedule.tradingDaySource = (schedule.marketCalendar === "a_share" || schedule.marketCalendar === "us_stock") ? "external" : "weekday";
        schedule.marketHolidayDates = schedule.marketHolidayDates || [];
        if (schedule.tradingDaySource === "external") {
          schedule.marketHolidayDates = [];
        }
        schedule.reportType = schedule.reportType || inferReportType(schedule);
        schedule.reportMode = schedule.reportMode || "market";
        schedule.marketSession = schedule.marketSession || "intraday";
        schedule.focusSymbols = Array.isArray(schedule.focusSymbols) ? schedule.focusSymbols : parseSymbols(schedule.focusSymbols);
        schedule.positionSymbols = Array.isArray(schedule.positionSymbols) ? schedule.positionSymbols : parseSymbols(schedule.positionSymbols);
        const triggerLabel = schedule.triggerMode === "cron" ? "cron" : schedule.time;
        const days = dayLabels[uiLanguage].map((label, day) => {
          const checked = schedule.days.includes(day) ? "checked" : "";
          return '<label><input type="checkbox" data-index="' + index + '" data-field="days" value="' + day + '" ' + checked + '><span>' + label + '</span></label>';
        }).join("");
        const targets = providers.map((provider) => {
          const checked = schedule.targets.includes(provider) ? "checked" : "";
          return '<label><input type="checkbox" data-index="' + index + '" data-field="targets" value="' + provider + '" ' + checked + '><span>' + providerLabels[provider] + '</span></label>';
        }).join("");
        return '<details class="schedule" data-index="' + index + '"' + (index === 0 ? " open" : "") + '>' +
          '<summary class="schedule-summary">' +
          '<div class="schedule-summary-main">' +
          '<div class="schedule-summary-row"><h3>' + escapeHtml(schedule.name) + '</h3><span class="badge">' + escapeHtml(triggerLabel) + '</span></div>' +
          '<div class="muted">' + escapeHtml(schedule.timezone) + ' · ' + escapeHtml(schedule.marketCalendar) + ' · ' + (schedule.enabled ? t("enabled") : t("disabled")) + '</div>' +
          '</div>' +
          '<span class="schedule-chevron">▾</span>' +
          '</summary>' +
          '<div class="schedule-body">' +
          '<div class="schedule-summary-row"><label class="inline-checkbox"><input type="checkbox" data-index="' + index + '" data-field="enabled" ' + (schedule.enabled ? "checked" : "") + '>' + t("enabled") + '</label></div>' +
          '<div class="cols">' +
          field(t("name"), "name", schedule.name, index) +
          selectField(t("reportType"), "reportType", schedule.reportType, index, reportTypeOptions) +
          selectField(t("reportMode"), "reportMode", schedule.reportMode, index, reportModeOptions) +
          selectField(t("marketSession"), "marketSession", schedule.marketSession, index, marketSessionOptions) +
          selectField(t("triggerMode"), "triggerMode", schedule.triggerMode, index, [["slots", t("triggerModeSlots")], ["cron", t("triggerModeCron")]]) +
          field(t("time"), "time", schedule.time, index, "time") +
          field(t("cronExpression"), "cronExpression", schedule.cronExpression, index, "text") +
          selectField(t("contentLanguage"), "language", schedule.language, index, [["zh", "中文"], ["en", "English"]]) +
          selectField(t("format"), "outputFormat", schedule.outputFormat, index, [["markdown", "Markdown"], ["text", "Text"], ["json", "JSON"]]) +
          '</div>' +
          '<div class="muted">' + t("cronHelp") + '</div>' +
          '<div class="cols">' +
          '<label>' + t("timezone") + '<select data-index="' + index + '" data-field="timezone">' + timezones.map((zone) => '<option value="' + zone + '"' + (zone === schedule.timezone ? " selected" : "") + '>' + zone + '</option>').join("") + '</select></label>' +
          selectField(t("marketCalendar"), "marketCalendar", schedule.marketCalendar, index, marketOptions) +
          '</div>' +
          '<div class="muted">' + ((schedule.marketCalendar === "a_share" || schedule.marketCalendar === "us_stock") ? t("autoMarketSourceExternal") : t("autoMarketSourceAlwaysOpen")) + '</div>' +
          '<label class="inline-checkbox"><input type="checkbox" data-index="' + index + '" data-field="skipNonTradingInCron" ' + (schedule.skipNonTradingInCron ? "checked" : "") + '><span>' + t("skipNonTradingInCron") + '</span></label>' +
          '<label>' + t("topicQuery") + '<input data-index="' + index + '" data-field="topicQuery" value="' + escapeAttr(schedule.topicQuery) + '"></label>' +
          '<label>' + t("sourceUrl") + '<input data-index="' + index + '" data-field="sourceUrl" value="' + escapeAttr(schedule.sourceUrl || "") + '"></label>' +
          '<div class="cols">' +
          '<label>' + t("focusSymbols") + '<textarea data-index="' + index + '" data-field="focusSymbolsText">' + escapeHtml((schedule.focusSymbols || []).join("\\n")) + '</textarea><span class="muted">' + t("symbolsHelp") + '</span></label>' +
          '<label>' + t("positionSymbols") + '<textarea data-index="' + index + '" data-field="positionSymbolsText">' + escapeHtml((schedule.positionSymbols || []).join("\\n")) + '</textarea><span class="muted">' + t("symbolsHelp") + '</span></label>' +
          '</div>' +
          (schedule.triggerMode === "slots" ? ('<div><h3>' + t("days") + '</h3><div class="days">' + days + '</div></div>') : "") +
          '<div><h3>' + t("targets") + '</h3><div class="target-list">' + targets + '</div></div>' +
          '<div><h3>' + t("emailRecipientsSection") + '</h3><div class="email-recipient-select">' + renderScheduleEmailSelect(index) + '</div></div>' +
          '<div class="module-switches row">' +
          '<label class="inline-checkbox"><input type="checkbox" data-index="' + index + '" data-field="moduleSwitches_news" ' + (schedule.moduleSwitches?.news ? "checked" : "") + '>' + t("moduleNews") + '</label>' +
          '<label class="inline-checkbox"><input type="checkbox" data-index="' + index + '" data-field="moduleSwitches_us_market" ' + (schedule.moduleSwitches?.us_market ? "checked" : "") + '>' + t("moduleUsMarket") + '</label>' +
          '<label class="inline-checkbox"><input type="checkbox" data-index="' + index + '" data-field="moduleSwitches_a_share" ' + (schedule.moduleSwitches?.a_share ? "checked" : "") + '>' + t("moduleAShare") + '</label>' +
          '<label class="inline-checkbox"><input type="checkbox" data-index="' + index + '" data-field="moduleSwitches_crypto" ' + (schedule.moduleSwitches?.crypto ? "checked" : "") + '>' + t("moduleCrypto") + '</label>' +
          '<label class="inline-checkbox"><input type="checkbox" data-index="' + index + '" data-field="moduleSwitches_fear_greed" ' + (schedule.moduleSwitches?.fear_greed ? "checked" : "") + '>' + t("moduleFearGreed") + '</label>' +
          '<label class="inline-checkbox"><input type="checkbox" data-index="' + index + '" data-field="moduleSwitches_technicals" ' + (schedule.moduleSwitches?.technicals ? "checked" : "") + '>' + t("moduleTechnicals") + '</label>' +
          '<label class="inline-checkbox"><input type="checkbox" data-index="' + index + '" data-field="moduleSwitches_sentiment" ' + (schedule.moduleSwitches?.sentiment ? "checked" : "") + '>' + t("moduleSentiment") + '</label>' +
          '<label class="inline-checkbox"><input type="checkbox" data-index="' + index + '" data-field="moduleSwitches_catalysts" ' + (schedule.moduleSwitches?.catalysts ? "checked" : "") + '>' + t("moduleCatalysts") + '</label>' +
          '<label class="inline-checkbox"><input type="checkbox" data-index="' + index + '" data-field="moduleSwitches_x_sentiment" ' + (schedule.moduleSwitches?.x_sentiment ? "checked" : "") + '>' + t("moduleXSentiment") + '</label>' +
          '<label class="inline-checkbox"><input type="checkbox" data-index="' + index + '" data-field="moduleSwitches_positions" ' + (schedule.moduleSwitches?.positions ? "checked" : "") + '>' + t("modulePositions") + '</label>' +
          '<label class="inline-checkbox"><input type="checkbox" data-index="' + index + '" data-field="moduleSwitches_macro" ' + (schedule.moduleSwitches?.macro ? "checked" : "") + '>' + t("moduleMacro") + '</label>' +
          '</div>' +
          '<label>' + t("scheduleTemplate") + '<textarea data-index="' + index + '" data-field="template">' + escapeHtml(schedule.template) + '</textarea></label>' +
          '<div class="row"><button class="primary" data-action="run" data-index="' + index + '">' + t("testSend") + '</button><button class="danger" data-action="remove" data-index="' + index + '">' + t("remove") + '</button><span class="status" id="scheduleStatus-' + index + '"></span></div>' +
          '</div>' +
          '</details>';
      }).join("");
    }

    function field(label, fieldName, value, index, type = "text") {
      return '<label>' + label + '<input type="' + type + '" data-index="' + index + '" data-field="' + fieldName + '" value="' + escapeAttr(value) + '"></label>';
    }

    function selectField(label, fieldName, value, index, options) {
      return '<label>' + label + '<select data-index="' + index + '" data-field="' + fieldName + '">' + options.map(([key, text]) => '<option value="' + key + '"' + (key === value ? " selected" : "") + '>' + text + '</option>').join("") + '</select></label>';
    }

    function localizedTradingDayOptions() {
      return [
        ["weekday", t("weekdayManual")],
        ["external", t("externalCalendar")]
      ];
    }

    function renderPreviewSelect() {
      const select = $("previewScheduleSelect");
      const previousValue = select.value;
      select.innerHTML = state.schedules.map((schedule, index) =>
        '<option value="' + index + '">' + escapeHtml(schedule.name || ("Schedule " + (index + 1))) + '</option>'
      ).join("");
      if (previousValue && state.schedules[Number(previousValue)]) {
        select.value = previousValue;
      }
      if (!state.schedules.length) {
        $("previewList").innerHTML = '<div class="muted">' + t("previewEmpty") + '</div>';
      }
    }

    function collectSettings() {
      state.appName = $("appName").value;
      state.language = $("language").value;
      state.timezone = $("timezone").value;
      state.outputFormat = $("outputFormat").value;
      state.topicFocus = $("topicFocus").value;
      state.template = $("template").value;
      state.defaultTargets = checkedValues("default");
      state.providerSettings = state.providerSettings || {};
      document.querySelectorAll("[data-provider-setting]").forEach((node) => {
        const key = node.dataset.providerSetting;
        if (!key) return;
        if (node.dataset.masked === "1") {
          return;
        }
        state.providerSettings[key] = node.value.trim();
      });
      state.schedules.forEach((schedule) => {
        const scheduleIndex = state.schedules.indexOf(schedule);
        schedule.marketHolidayDates = Array.isArray(schedule.marketHolidayDates) ? schedule.marketHolidayDates : parseDates(schedule.marketHolidayDates);
        schedule.focusSymbols = Array.isArray(schedule.focusSymbols) ? schedule.focusSymbols : parseSymbols(schedule.focusSymbolsText || "");
        schedule.positionSymbols = Array.isArray(schedule.positionSymbols) ? schedule.positionSymbols : parseSymbols(schedule.positionSymbolsText || "");
        delete schedule.focusSymbolsText;
        delete schedule.positionSymbolsText;
        collectModuleSwitches(scheduleIndex, schedule);
        // Collect emailRecipientIds from form checkboxes
        collectEmailRecipientIds(schedule);
      });
      return state;
    }

    function checkedValues(name) {
      return Array.from(document.querySelectorAll('input[name="' + name + '"]:checked')).map((node) => node.value);
    }

    function validateActiveProviderSettings() {
      if (!activeProvider) return { ok: true };
      const form = document.querySelector('[data-provider-group="' + activeProvider + '"]');
      if (!form) return { ok: true };
      const fields = Array.from(form.querySelectorAll("[data-provider-setting]"));
      for (const node of fields) {
        const key = node.dataset.providerSetting;
        if (!key || node.dataset.masked === "1") continue;
        const value = node.value.trim();
        if (!value) continue;
        if (key.toLowerCase().includes("webhookurl")) {
          const lower = value.toLowerCase();
          if (!(lower.startsWith("http://") || lower.startsWith("https://"))) {
            return { ok: false, message: key + " must start with http:// or https://" };
          }
        }
        if (key === "emailFrom" || key === "emailFromOverride") {
          const bracketMatch = /<([^>]+)>/.exec(value);
          const emailCandidate = (bracketMatch && bracketMatch[1] ? bracketMatch[1] : value).trim();
          const parts = emailCandidate.split("@");
          const local = parts[0] || "";
          const domain = parts[1] || "";
          if (parts.length !== 2 || !local || !domain || !domain.includes(".")) {
            return { ok: false, message: key + " is not a valid email sender format" };
          }
        }
      }
      return { ok: true };
    }

    async function toggleProviderEditor(provider) {
      if (!provider) return;
      if (activeProvider === provider) {
        const validation = validateActiveProviderSettings();
        if (!validation.ok) {
          $("saveStatus").textContent = validation.message || "Invalid provider field";
          return;
        }
        await saveSettings();
        activeProvider = null;
        $("saveStatus").textContent = t("saved");
        renderProviderStatus();
        renderProviderSettings();
        renderResearchSettings();
        renderProviderExtras();
        return;
      }
      activeProvider = provider;
      $("saveStatus").textContent = "";
      renderProviderStatus();
      renderProviderSettings();
      renderResearchSettings();
      renderProviderExtras();
    }

    async function saveSettings() {
      collectSettings();
      $("saveStatus").textContent = "";
      const body = await api("/api/admin/settings", { method: "PUT", body: JSON.stringify(state) });
      state = body.settings;
      providerStatus = body.providers || providerStatus;
      $("saveStatus").textContent = t("saved");
      render();
      await loadPreview().catch((error) => {
        $("previewStatus").textContent = error.message || "Preview failed";
      });
    }

    async function runSchedule(index) {
      const pendingNode = $("scheduleStatus-" + index);
      if (pendingNode) pendingNode.textContent = t("testing");
      collectSettings();
      await saveSettings();
      await api("/api/admin/run", {
        method: "POST",
        body: JSON.stringify({
          scheduleId: state.schedules[index].id,
          schedule: state.schedules[index]
        })
      });
      const doneNode = $("scheduleStatus-" + index);
      if (doneNode) doneNode.textContent = t("testQueued");
      await loadLogs();
    }

    async function loadPreview() {
      collectSettings();
      const index = Number($("previewScheduleSelect").value || 0);
      const schedule = state.schedules[index];

      if (!schedule) {
        $("previewList").innerHTML = '<div class="muted">' + t("previewEmpty") + '</div>';
        return;
      }

      $("previewStatus").textContent = "";
      const body = await api("/api/admin/preview", { method: "POST", body: JSON.stringify({ schedule }) });
      renderPreview(body.preview);
    }

    function renderPreview(preview) {
      const statusLabel = preview.sourceStatus === "fallback" ? t("sourceStateFallback") : t("sourceStateLive");
      $("previewStatus").textContent = preview.generatedAt + " · " + statusLabel + " · " + preview.sourceMessage + " · " + preview.sourceUrl;
      $("previewList").innerHTML = preview.deliveries.map((delivery) =>
        '<article class="preview-card"><header><strong>' + escapeHtml(delivery.label) + '</strong><span class="badge">' + escapeHtml(delivery.format) + '</span></header><pre>' + escapeHtml(delivery.content) + '</pre></article>'
      ).join("");
    }

    async function loadLogs() {
      const body = await api("/api/admin/logs");
      const logs = body.logs || [];
      $("logs").innerHTML = logs.length ? logs.map((log) =>
        '<div class="log ' + (log.ok ? "ok" : "fail") + '"><strong>' + escapeHtml(log.scheduleName || "") + '</strong><div>' + escapeHtml(log.message) + '</div><div class="muted">' + escapeHtml(log.createdAt) + ' · delivered ' + log.delivered + ' · failed ' + log.failed + '</div></div>'
      ).join("") : '<div class="muted">' + t("noLogs") + '</div>';
    }

    function addSchedule() {
      state.schedules.push({
        id: "schedule-" + Date.now(),
        name: "New Pulse",
        enabled: true,
        triggerMode: "slots",
        skipNonTradingInCron: false,
        cronExpression: "",
        time: "09:00",
        days: [1, 2, 3, 4, 5],
        timezone: state.timezone,
        language: state.language,
        outputFormat: state.outputFormat,
        reportType: "a_share",
        reportMode: "market",
        marketSession: "intraday",
        focusSymbols: [],
        positionSymbols: [],
        emailRecipientIds: [],
        targets: state.defaultTargets,
        moduleSwitches: {
          news: true,
          us_market: false,
          a_share: true,
          crypto: false,
          fear_greed: false,
          technicals: false,
          sentiment: false,
          catalysts: false,
          x_sentiment: false,
          positions: false,
          macro: false,
        },
        marketCalendar: "a_share",
        tradingDaySource: "external",
        marketHolidayDates: [],
        topicQuery: state.topicFocus,
        template: state.template
      });
      render();
    }

    function applySlotTemplate() {
      renderSlotBuilder();
    }

    function buildSchedulesFromBuilder() {
      const reportType = $("builderReportType").value || "a_share";
      const customName = $("builderCustomName").value.trim();
      const selectedSlots = Array.from(document.querySelectorAll('input[name="builder-slots"]:checked')).map((node) => node.value);

      if (!selectedSlots.length) {
        $("builderStatus").textContent = uiLanguage === "zh" ? "请至少选择一个时间点" : "Select at least one time slot";
        return;
      }

      const calendarByReport = {
        a_share: "a_share",
        us_stock: "us_stock",
        crypto: "crypto",
        daily_hot: "everyday",
        custom: "everyday"
      };
      const sessionByReport = {
        a_share: "pre_open",
        us_stock: "post_close",
        crypto: "intraday",
        daily_hot: "intraday",
        custom: "intraday"
      };
      const baseName = reportType === "custom" ? (customName || "Custom Report") : reportTypeLabel(reportType);

      const defaultModuleSwitches = {
        news: true,
        us_market: reportType === "us_stock",
        a_share: reportType === "a_share",
        crypto: reportType === "crypto",
        fear_greed: false,
        technicals: false,
        sentiment: false,
        catalysts: false,
        x_sentiment: false,
        positions: false,
        macro: false,
      };

      selectedSlots.forEach((time, offset) => {
        state.schedules.push({
          id: "schedule-" + Date.now() + "-" + offset,
          name: baseName + " " + time,
          enabled: true,
          triggerMode: "slots",
          skipNonTradingInCron: false,
          cronExpression: "",
          time,
          days: reportType === "crypto" || reportType === "daily_hot" ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5],
          timezone: state.timezone,
          language: state.language,
          outputFormat: state.outputFormat,
          reportType,
          reportMode: "market",
          marketSession: sessionByReport[reportType] || "intraday",
          focusSymbols: [],
          positionSymbols: [],
          emailRecipientIds: [],
          targets: state.defaultTargets,
          moduleSwitches: { ...defaultModuleSwitches },
          marketCalendar: calendarByReport[reportType] || "everyday",
          tradingDaySource: reportType === "a_share" || reportType === "us_stock" ? "external" : "weekday",
          marketHolidayDates: [],
          topicQuery: state.topicFocus,
          template: state.template
        });
      });

      $("builderStatus").textContent = uiLanguage === "zh"
        ? "已生成 " + selectedSlots.length + " 条计划"
        : "Built " + selectedSlots.length + " schedules";
      render();
    }

    function parseDates(value) {
      if (Array.isArray(value)) return value;
      return String(value || "").split(/[,\\s]+/).map((date) => date.trim()).filter((date) => /^\\d{4}-\\d{2}-\\d{2}$/.test(date));
    }

    function parseSymbols(value) {
      const entries = Array.isArray(value)
        ? value.map((entry) => String(entry).trim().toUpperCase()).filter(Boolean)
        : String(value || "")
          .split(/[\\s,\\n]+/)
          .map((entry) => entry.trim().toUpperCase())
          .filter(Boolean);

      return Array.from(new Set(entries));
    }

    function inferReportType(schedule) {
      if (schedule.marketCalendar === "a_share") return "a_share";
      if (schedule.marketCalendar === "us_stock") return "us_stock";
      if (schedule.marketCalendar === "crypto") return "crypto";
      const hint = ((schedule.name || "") + " " + (schedule.topicQuery || "")).toLowerCase();
      if (hint.includes("hot") || hint.includes("热点")) return "daily_hot";
      return "custom";
    }

    function reportTypeLabel(reportType) {
      if (reportType === "a_share") return "A股";
      if (reportType === "us_stock") return "美股";
      if (reportType === "crypto") return "加密";
      if (reportType === "daily_hot") return "每日热点";
      return "Custom";
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    }

    function escapeAttr(value) {
      return escapeHtml(value);
    }

    function bind(id, eventName, handler) {
      const el = $(id);
      if (!el) return;
      el.addEventListener(eventName, handler);
    }

    bind("loginButton", "click", login);
    bind("passwordInput", "keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        login();
      }
    });
    bind("logoutButton", "click", () => {
      localStorage.removeItem("globalpulse_admin_password");
      location.reload();
    });
    bind("themeButton", "click", cycleTheme);
    const themeBtn = $("themeButton");
    if (themeBtn) themeBtn.title = t("themeToggle");
    const sidebar = $("sidebar");
    if (sidebar) sidebar.addEventListener("click", (event) => {
      const item = event.target.closest(".sidebar-item");
      if (!item || !item.dataset.section) return;
      const legacySectionMap = {
        system: "globalSettings"
      };
      const sectionName = legacySectionMap[item.dataset.section] || item.dataset.section;
      const sectionId = "section-" + sectionName;
      const section = document.getElementById(sectionId);
      if (!section) return;
      // Open the details element if it's closed
      if (section.tagName === "DETAILS" && !section.hasAttribute("open")) {
        section.setAttribute("open", "");
      }
      document.querySelectorAll(".sidebar-item[data-section]").forEach((el) => el.classList.remove("active"));
      item.classList.add("active");
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    bind("langButton", "click", () => {
      uiLanguage = uiLanguage === "zh" ? "en" : "zh";
      localStorage.setItem("globalpulse_ui_language", uiLanguage);
      applyI18n();
    });
    bind("saveButton", "click", saveSettings);
    bind("refreshButton", "click", loadSettings);
    bind("loadLogsButton", "click", loadLogs);
    bind("addScheduleButton", "click", addSchedule);
    bind("addEmailRecipient", "click", addEmailRecipient);
    bind("builderReportType", "change", renderSlotBuilder);
    bind("applySlotTemplateButton", "click", applySlotTemplate);
    bind("buildSchedulesButton", "click", buildSchedulesFromBuilder);
    bind("refreshPreviewButton", "click", () => loadPreview().catch((error) => {
      $("previewStatus").textContent = error.message || "Preview failed";
    }));
    bind("previewScheduleSelect", "change", () => loadPreview().catch((error) => {
      $("previewStatus").textContent = error.message || "Preview failed";
    }));
    document.addEventListener("input", (event) => {
      const providerSetting = event.target.dataset && event.target.dataset.providerSetting;
      if (providerSetting) {
        state.providerSettings = state.providerSettings || {};
        if (event.target.dataset.masked === "1") {
          return;
        }
        state.providerSettings[providerSetting] = event.target.value.trim();
        return;
      }
      const fieldName = event.target.dataset && event.target.dataset.field;
      const index = event.target.dataset && event.target.dataset.index;
      if (!fieldName || index === undefined) return;
      const schedule = state.schedules[Number(index)];
      if (!schedule) return;
      if (fieldName === "enabled") schedule.enabled = event.target.checked;
      else if (fieldName === "skipNonTradingInCron") schedule.skipNonTradingInCron = event.target.checked;
      else if (fieldName === "days") schedule.days = Array.from(document.querySelectorAll('input[data-index="' + index + '"][data-field="days"]:checked')).map((node) => Number(node.value));
      else if (fieldName === "targets") schedule.targets = Array.from(document.querySelectorAll('input[data-index="' + index + '"][data-field="targets"]:checked')).map((node) => node.value);
      else if (fieldName === "emailRecipientIds") schedule.emailRecipientIds = Array.from(document.querySelectorAll('input[data-index="' + index + '"][data-field="emailRecipientIds"]:checked')).map((node) => node.value);
      else if (fieldName === "focusSymbolsText") schedule.focusSymbols = parseSymbols(event.target.value);
      else if (fieldName === "positionSymbolsText") schedule.positionSymbols = parseSymbols(event.target.value);
      else if (fieldName.startsWith("moduleSwitches_")) schedule[fieldName] = event.target.checked;
      else {
        schedule[fieldName] = event.target.type === "checkbox" ? event.target.checked : event.target.value;
        if (fieldName === "marketCalendar") {
          schedule.tradingDaySource = (schedule.marketCalendar === "a_share" || schedule.marketCalendar === "us_stock") ? "external" : "weekday";
          if (schedule.tradingDaySource === "external") {
            schedule.marketHolidayDates = [];
          }
        }
        if (fieldName === "triggerMode" || fieldName === "reportType" || fieldName === "marketCalendar" || fieldName === "reportMode") {
          renderSchedules();
        }
      }
    });
    document.addEventListener("focusin", (event) => {
      const providerSetting = event.target.dataset && event.target.dataset.providerSetting;
      if (!providerSetting) return;
      if (event.target.dataset.masked === "1") {
        event.target.value = "";
        event.target.dataset.masked = "0";
      }
    });
    document.addEventListener("click", async (event) => {
      const providerCard = event.target.closest("[data-provider-card]");
      if (providerCard) {
        try {
          await toggleProviderEditor(providerCard.dataset.providerCard);
        } catch (error) {
          $("saveStatus").textContent = error.message || "Failed";
        }
        return;
      }
      const action = event.target.dataset && event.target.dataset.action;
      const index = Number(event.target.dataset && event.target.dataset.index);
      if (action === "remove") {
        state.schedules.splice(index, 1);
        render();
      }
      if (action === "removeEmailRecipient") {
        const id = event.target.dataset && event.target.dataset.id;
        if (id) {
          removeEmailRecipient(id);
        }
      }
      if (action === "run") {
        try {
          await runSchedule(index);
        } catch (error) {
          const node = $("scheduleStatus-" + index);
          if (node) node.textContent = error.message || "Failed";
        }
      }
    });

    // ── Global error handlers ──────────────────────────────────
    window.addEventListener("error", (event) => {
      console.error("[GlobalPulse]", event.error);
    });
    window.addEventListener("unhandledrejection", (event) => {
      console.error("[GlobalPulse] Unhandled rejection:", event.reason);
    });

    // ── Bootstrap ─────────────────────────────────────────────
    try {
      applyTheme();
      applyI18n();
      if (password) {
        const pwdInput = $("passwordInput");
        if (pwdInput) pwdInput.value = password;
        loadSettings().catch(() => localStorage.removeItem("globalpulse_admin_password"));
      }
    } catch (err) {
      console.error("[GlobalPulse] Init error:", err);
    }
  </script>
</body>
</html>`;
