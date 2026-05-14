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
      border-radius: 10px;
      border: 1px solid var(--line);
      background: var(--surface-2);
      object-fit: cover;
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
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: center;
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
    .badge.warn { color: var(--accent-2); }
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
      color: var(--muted);
      font-size: 12px;
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
      color: var(--muted);
      font-size: 12px;
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
      align-items: start;
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
      display: grid;
      gap: 12px;
      position: sticky;
      top: 92px;
    }
    .login-panel h2 {
      font-size: 18px;
      line-height: 1.2;
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
      padding: 16px 0 12px;
      margin-top: auto;
    }
    .page-footer-copy {
      width: min(1400px, calc(100vw - 32px));
      margin: 0 auto;
      text-align: center;
      font-size: 12px;
      color: var(--muted);
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
                src="data:image/png;base64,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"
                alt="GlobalPulse icon"
              >
            </div>
            <h2 data-i18n="loginTitle">Admin 登录</h2>
            <label>
              <span data-i18n="password">密码</span>
              <input id="passwordInput" type="password" autocomplete="current-password">
            </label>
            <div class="login-actions">
              <button class="primary" id="loginButton" data-i18n="login">登录</button>
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
          <button class="sidebar-item active" data-section="system">
            <span>⚙️</span> <span>系统设置</span>
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
          <button class="sidebar-item" data-section="email">
            <span>📧</span> <span>邮件配置</span>
          </button>
          <button class="sidebar-item" data-section="logs">
            <span>📜</span> <span data-i18n="logs">发送记录</span>
          </button>
        </nav>

        <div class="admin-main">
          <aside class="stack" id="sidebar-system">
            <details class="collapsible-section" id="section-globalSettings" open>
              <summary>
                <span class="section-title"><span class="emoji">⚙️</span> <span data-i18n="globalSettings">系统设置</span></span>
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
                <div class="row">
                  <button class="primary" id="saveButton" data-i18n="save">保存</button>
                  <button class="secondary" id="refreshButton" data-i18n="refresh">刷新</button>
                </div>
                <div class="status" id="saveStatus"></div>
              </div>
            </details>

            <details class="collapsible-section" id="section-email">
              <summary>
                <span class="section-title"><span class="emoji">📧</span> 邮件配置</span>
                <span class="chevron">▾</span>
              </summary>
              <div class="section-body stack">
                <div class="provider-config">
                  <h3><span>邮件发送配置</span><span class="badge">Resend API</span></h3>
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
    <div class="page-footer-copy">© 2026 InnoNestX · Made with ❤️ for the community</div>
  </footer>

  <script>
    const providers = ["feishu", "wechat_official_account", "wechat_clawbot", "telegram"];
    const providerLabels = {
      feishu: "Feishu",
      wechat_official_account: "微信公众号",
      wechat_clawbot: "wechat clawbot",
      telegram: "Telegram"
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
        emailFromOverride: "发件人地址（可选，覆盖全局）",
        emailAddressBook: "邮件地址簿",
        addEmailRecipient: "添加",
        removeEmailRecipient: "移除",
        noEmailRecipients: "暂无邮件地址，点击添加",
        emailRecipientsSection: "邮件发送对象",        schedules: "推送时间表",
        addSchedule: "新增时间点",
        scheduleConfigurator: "日报配置器",
        batchBuilder: "批量生成",
        reportType: "日报类型",
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
        variables: "变量：{{generatedAt}}, {{timezone}}, {{topicQuery}}, {{sourceUrl}}, {{itemsMarkdown}}, {{itemsText}}, {{itemsJson}}",
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
        footerSupport: "Support",
        footerBug: "🐛 Report Bug",
        footerPR: "🔧 Submit PR",
        footerStar: "⭐ Star Repo",
        footerSponsor: "💖 Sponsor",
        footerCoffee: "☕ Buy Me a Coffee",
        footerDiscuss: "💬 Discussions",
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
        moduleMacro: "宏观"
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
        emailRecipients: "Email recipients (comma-separated)",
        emailFromOverride: "Sender address (optional, overrides global)",
        emailAddressBook: "Email Address Book",
        addEmailRecipient: "Add",
        removeEmailRecipient: "Remove",
        noEmailRecipients: "No email addresses yet, click Add",
        emailRecipientsSection: "Email Recipients",        schedules: "Schedules",
        addSchedule: "Add time",
        scheduleConfigurator: "Report configurator",
        batchBuilder: "Batch builder",
        reportType: "Report type",
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
        variables: "Variables: {{generatedAt}}, {{timezone}}, {{topicQuery}}, {{sourceUrl}}, {{itemsMarkdown}}, {{itemsText}}, {{itemsJson}}",
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
        footerSupport: "Support",
        footerBug: "🐛 Report Bug",
        footerPR: "🔧 Submit PR",
        footerStar: "⭐ Star Repo",
        footerSponsor: "💖 Sponsor",
        footerCoffee: "☕ Buy Me a Coffee",
        footerDiscuss: "💬 Discussions",
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
        moduleMacro: "Macro"
      }
    };
    const dayLabels = {
      zh: ["日", "一", "二", "三", "四", "五", "六"],
      en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    };
    let state = null;
    let providerStatus = [];
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
      password = $("passwordInput").value;
      $("loginStatus").textContent = "";
      try {
        await api("/api/admin/login", { method: "POST", body: JSON.stringify({ password }) });
        localStorage.setItem("globalpulse_admin_password", password);
        $("loginStatus").textContent = t("loginOk");
        await loadSettings();
      } catch (error) {
        $("loginStatus").textContent = t("loginFailed");
      }
    }

    async function loadSettings() {
      const body = await api("/api/admin/settings");
      state = body.settings;
      providerStatus = body.providers || [];
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
      renderEmailProviderStatus();
      renderProviderSettings();
      renderEmailAddressBook();
      renderSlotBuilder();
      renderSchedules();
      renderPreviewSelect();
      applyI18n();
    }

    function renderProviderStatus() {
      $("providerStatus").innerHTML = providers.map((provider) => {
        const status = providerStatus.find((entry) => entry.name === provider);
        const ok = status && status.configured;
        return '<div class="provider-card"><strong>' + providerLabels[provider] + '</strong><span class="badge ' + (ok ? "ok" : "warn") + '">' + (ok ? t("configured") : t("notConfigured")) + '</span></div>';
      }).join("");
    }

    function renderEmailProviderStatus() {
      const el = $("emailProviderStatus");
      if (!el) return;
      const emailConfigured = providerStatus.find((p) => p.name === "email")?.configured ?? false;
      el.innerHTML = '<div class="provider-config"><h3><span>Resend API</span><span class="badge ' + (emailConfigured ? "ok" : "warn") + '">' + (emailConfigured ? t("configured") : t("notConfigured")) + '</span></h3><p class="muted">' + t("providerHelp") + '</p></div>';
    }

    function renderProviderSettings() {
      const values = state.providerSettings || {};
      const groups = [
        {
          name: "Feishu",
          fields: [
            ["feishuWebhookUrl", t("feishuWebhookUrl"), "url"],
            ["feishuSigningSecret", t("feishuSigningSecret"), "password"]
          ]
        },
        {
          name: "微信公众号",
          fields: [
            ["wechatOfficialAppId", t("wechatOfficialAppId"), "password"],
            ["wechatOfficialAppSecret", t("wechatOfficialAppSecret"), "password"],
            ["wechatOfficialOpenId", t("wechatOfficialOpenId"), "password"]
          ]
        },
        {
          name: "wechat clawbot",
          fields: [
            ["wechatClawbotWebhookUrl", t("wechatClawbotWebhookUrl"), "url"],
            ["wechatClawbotWebhookKey", t("wechatClawbotWebhookKey"), "password"]
          ]
        },
        {
          name: "Telegram",
          fields: [
            ["telegramBotToken", t("telegramBotToken"), "password"],
            ["telegramChatId", t("telegramChatId"), "text"]
          ]
        },
        {
          name: "Email",
          fields: [
            ["emailFromOverride", t("emailFromOverride"), "text"]
          ]
        }
      ];
      $("providerSettingsForm").innerHTML = groups.map((group) =>
        '<div class="provider-config"><h3><span>' + group.name + '</span><span class="badge">' + t("providerConfig") + '</span></h3>' +
        group.fields.map(([key, label, type]) =>
          '<label>' + label + '<input type="' + type + '" autocomplete="off" spellcheck="false" data-provider-setting="' + key + '" value="' + escapeAttr(values[key] || "") + '"></label>'
        ).join("") + '</div>'
      ).join("");

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
        state.providerSettings[node.dataset.providerSetting] = node.value;
      });
      state.schedules.forEach((schedule) => {
        schedule.marketHolidayDates = Array.isArray(schedule.marketHolidayDates) ? schedule.marketHolidayDates : parseDates(schedule.marketHolidayDates);
        schedule.focusSymbols = Array.isArray(schedule.focusSymbols) ? schedule.focusSymbols : parseSymbols(schedule.focusSymbolsText || "");
        schedule.positionSymbols = Array.isArray(schedule.positionSymbols) ? schedule.positionSymbols : parseSymbols(schedule.positionSymbolsText || "");
        delete schedule.focusSymbolsText;
        delete schedule.positionSymbolsText;
        // Rebuild moduleSwitches from flattened form fields
        schedule.moduleSwitches = {
          news: !!schedule.moduleSwitches_news,
          us_market: !!schedule.moduleSwitches_us_market,
          a_share: !!schedule.moduleSwitches_a_share,
          crypto: !!schedule.moduleSwitches_crypto,
          fear_greed: !!schedule.moduleSwitches_fear_greed,
          technicals: !!schedule.moduleSwitches_technicals,
          sentiment: !!schedule.moduleSwitches_sentiment,
          catalysts: !!schedule.moduleSwitches_catalysts,
          x_sentiment: !!schedule.moduleSwitches_x_sentiment,
          positions: !!schedule.moduleSwitches_positions,
          macro: !!schedule.moduleSwitches_macro,
        };
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
        // Collect emailRecipientIds from form checkboxes
        collectEmailRecipientIds(schedule);
      });
      return state;
    }

    function checkedValues(name) {
      return Array.from(document.querySelectorAll('input[name="' + name + '"]:checked')).map((node) => node.value);
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

    $("loginButton").addEventListener("click", login);
    $("passwordInput").addEventListener("keydown", (event) => {
      if (event.key === "Enter") login();
    });
    $("logoutButton").addEventListener("click", () => {
      localStorage.removeItem("globalpulse_admin_password");
      location.reload();
    });
    const themeBtn = $("themeButton");
    if (themeBtn) themeBtn.addEventListener("click", cycleTheme);
    if (themeBtn) themeBtn.title = t("themeToggle");
    const sidebar = $("sidebar");
    if (sidebar) sidebar.addEventListener("click", (event) => {
      const item = event.target.closest(".sidebar-item");
      if (!item || !item.dataset.section) return;
      const sectionId = "section-" + item.dataset.section;
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
    $("langButton").addEventListener("click", () => {
      uiLanguage = uiLanguage === "zh" ? "en" : "zh";
      localStorage.setItem("globalpulse_ui_language", uiLanguage);
      applyI18n();
    });
    $("saveButton").addEventListener("click", saveSettings);
    $("refreshButton").addEventListener("click", loadSettings);
    $("loadLogsButton").addEventListener("click", loadLogs);
    $("addScheduleButton").addEventListener("click", addSchedule);
    $("addEmailRecipient").addEventListener("click", addEmailRecipient);
    $("builderReportType").addEventListener("change", renderSlotBuilder);
    $("applySlotTemplateButton").addEventListener("click", applySlotTemplate);
    $("buildSchedulesButton").addEventListener("click", buildSchedulesFromBuilder);
    $("refreshPreviewButton").addEventListener("click", () => loadPreview().catch((error) => {
      $("previewStatus").textContent = error.message || "Preview failed";
    }));
    $("previewScheduleSelect").addEventListener("change", () => loadPreview().catch((error) => {
      $("previewStatus").textContent = error.message || "Preview failed";
    }));
    document.addEventListener("input", (event) => {
      const providerSetting = event.target.dataset && event.target.dataset.providerSetting;
      if (providerSetting) {
        state.providerSettings = state.providerSettings || {};
        state.providerSettings[providerSetting] = event.target.value;
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
      else if (fieldName === "focusSymbolsText") schedule.focusSymbols = parseSymbols(event.target.value);
      else if (fieldName === "positionSymbolsText") schedule.positionSymbols = parseSymbols(event.target.value);
      else {
        schedule[fieldName] = event.target.value;
        if (fieldName === "marketCalendar") {
          schedule.tradingDaySource = (schedule.marketCalendar === "a_share" || schedule.marketCalendar === "us_stock") ? "external" : "weekday";
          if (schedule.tradingDaySource === "external") {
            schedule.marketHolidayDates = [];
          }
        }
      }
    });
    document.addEventListener("click", async (event) => {
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
