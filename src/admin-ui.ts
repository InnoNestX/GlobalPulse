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
      gap: 20px;
      min-height: calc(100vh - 150px);
      align-items: start;
      padding: 8px 0 18px;
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
      min-height: 460px;
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
    .login-brand-stack {
      display: grid;
      justify-items: center;
      gap: 12px;
      padding: 4px 0 8px;
    }
    .login-logo-wordmark {
      width: min(280px, 100%);
      height: auto;
      object-fit: contain;
      border-radius: 12px;
      background: #fff;
      padding: 4px;
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
      gap: 10px;
      padding: 14px 16px;
      border-radius: 10px;
      background: var(--surface);
      border: 1px solid var(--line);
    }
    .login-reference h3 {
      font-size: 14px;
      margin: 0;
    }
    .login-reference-list {
      margin: 0;
      padding-left: 18px;
      display: grid;
      gap: 4px;
      color: var(--muted);
      font-size: 12px;
    }
    .login-reference-list li {
      line-height: 1.35;
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
    /* Footer */
    footer {
      border-top: 1px solid var(--line);
      background: var(--surface);
      padding: 24px 0;
      margin-top: 20px;
    }
    .footer-inner {
      width: min(1400px, calc(100vw - 32px));
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 32px;
      align-items: start;
      flex-wrap: wrap;
    }
    .footer-brand { display: flex; align-items: center; gap: 10px; }
    .footer-brand-logo {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 1px solid var(--line);
      object-fit: cover;
    }
    .footer-section { display: grid; gap: 8px; }
    .footer-section h4 {
      margin: 0;
      font-size: 12px;
      font-weight: 760;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: .5px;
    }
    .footer-section a {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--text);
      padding: 3px 0;
    }
    .footer-section a:hover { color: var(--accent); }
    .footer-copy {
      text-align: center;
      font-size: 12px;
      color: var(--muted);
      padding-top: 16px;
      border-top: 1px solid var(--line);
      grid-column: 1 / -1;
    }
    .sidebar-toggle { display: none; }
    @media (max-width: 1024px) {
      .sidebar-toggle { display: flex; }
    }
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
                class="login-logo-wordmark"
                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAVQAAABgCAIAAADNbB3tAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAARGVYSWZNTQAqAAAACAABh2kABAAAAAEAAAAaAAAAAAADoAEAAwAAAAEAAQAAoAIABAAAAAEAAAFUoAMABAAAAAEAAABgAAAAAAybZecAAAHLaVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJYTVAgQ29yZSA2LjAuMCI+CiAgIDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CiAgICAgIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiCiAgICAgICAgICAgIHhtbG5zOmV4aWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vZXhpZi8xLjAvIj4KICAgICAgICAgPGV4aWY6Q29sb3JTcGFjZT4xPC9leGlmOkNvbG9yU3BhY2U+CiAgICAgICAgIDxleGlmOlBpeGVsWERpbWVuc2lvbj43NDA8L2V4aWY6UGl4ZWxYRGltZW5zaW9uPgogICAgICAgICA8ZXhpZjpQaXhlbFlEaW1lbnNpb24+MjEwPC9leGlmOlBpeGVsWURpbWVuc2lvbj4KICAgICAgPC9yZGY6RGVzY3JpcHRpb24+CiAgIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+CjtybtEAAQAA//8DAP8zAAB4nGNgYDJwdwACBgYGRoY/BgZGFAvMDIyMLGDeAuYtDAwML0CNuQK0Y6BgYGBkZGRgZGRkZAC1GBhQ0zMyMoL5MgMoPgMDwwdQM6hgYGBkgLKMjIwMYDUjIyMDVC0jVBgDA8MHEKtR0YDiGRgYwLwZ1DGyAzUjAwMDiBkpGFAyA8U8jIwMULWMDAyMjIxQ5QwkDQwM/xkYwHyJAcWqDAwMLFC1YDUDAwOYeRkYwPwEagAjIyMbw7kZGP4zMIB4CQMDKhsxMDCAuQEVHSMDAwMDKyYjAwMDAwAAAwCi6wH7eJxdTZMbycHg///fYWBgYPgPZvkZaEJlYGBgYAXiHSDGYkTxfYwkXg0gZmBg+A9mhj+QGouBkYGBgRVlZqC0Mqj5wMAI5p9gugXU2GBgYPhPNYthYGBgRLFqYGBgYGVgYPgPZkawOqxmYGAA8w0oZ2BkYGAB8xIGBgZGMP+H0o9g/g2lm0CdjYERzFsg4zOAeTMjAwMDKxvDuf8zMID5J5T+AGYtDAwMLFAtxMDAANb/UI0BAHqQFvL0q8w+AAAAAElFTkSuQmCC"
                alt="GlobalPulse"
              >
            </div>
                alt="GlobalPulse"
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
            <span>📜</span> <span data-i18n="logs">最近记录</span>
          </button>
        </nav>

        <div class="admin-main">
          <aside class="stack" id="sidebar-globalSettings">
            <section class="panel stack">
              <div class="section-head">
                <h2 data-i18n="globalSettings">全局设置</h2>
                <span class="badge" data-i18n="localOnly">配置保存在 KV</span>
              </div>
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
            </section>

            <section class="panel stack" id="section-providers">
              <h2 data-i18n="providers">通知渠道</h2>
              <p class="muted" data-i18n="providerHelp">这里配置的 token / webhook 会存入 KV；Cloudflare secrets 也会继续生效。</p>
              <div class="provider-grid" id="providerStatus"></div>
              <div class="provider-form" id="providerSettingsForm"></div>
            </section>
          </aside>

          <div class="stack">
            <section class="panel stack" id="section-schedules">
              <div class="section-head">
                <h2 data-i18n="schedules">推送时间表</h2>
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
            </section>

            <section class="panel stack" id="section-preview">
              <div class="section-head">
                <div>
                  <h2 data-i18n="previewTitle">推送预览</h2>
                  <div class="muted" data-i18n="previewHelp">查看当前配置会发送到各渠道的实际内容。</div>
                </div>
                <div class="row">
                  <select id="previewScheduleSelect" aria-label="Preview schedule"></select>
                  <button class="secondary" id="refreshPreviewButton" data-i18n="refreshPreview">刷新预览</button>
                </div>
              </div>
              <div class="status" id="previewStatus"></div>
              <div class="preview-list" id="previewList"></div>
            </section>

            <section class="panel stack" id="section-template">
              <h2 data-i18n="template">全局模板</h2>
              <textarea id="template"></textarea>
              <div class="muted" data-i18n="variables">变量：{{generatedAt}}, {{timezone}}, {{topicQuery}}, {{sourceUrl}}, {{itemsMarkdown}}, {{itemsText}}, {{itemsJson}}</div>
            </section>

            <section class="panel stack" id="section-logs">
              <div class="section-head">
                <h2 data-i18n="logs">最近记录</h2>
                <button class="secondary" id="loadLogsButton" data-i18n="refreshLogs">刷新记录</button>
              </div>
              <div class="logs" id="logs"></div>
            </section>
          </div>
        </div>
      </section>
    </section>
  </main>

  <footer>
    <div class="footer-inner">
      <div class="footer-brand">
        <img class="footer-brand-logo" src="https://avatars.githubusercontent.com/u/273979879?v=4" alt="InnoNestX">
        <div>
          <div style="font-weight:800;font-size:14px;">GlobalPulse</div>
          <div class="muted" style="font-size:12px;">by InnoNestX</div>
        </div>
      </div>
      <div class="footer-section">
        <h4 data-i18n="footerContribute">Contribute</h4>
        <a href="https://github.com/InnoNestX/GlobalPulse/issues" target="_blank" rel="noreferrer" data-i18n="footerBug">🐛 Report Bug</a>
        <a href="https://github.com/InnoNestX/GlobalPulse/pulls" target="_blank" rel="noreferrer" data-i18n="footerPR">🔧 Submit PR</a>
        <a href="https://github.com/InnoNestX/GlobalPulse" target="_blank" rel="noreferrer" data-i18n="footerStar">⭐ Star Repo</a>
      </div>
      <div class="footer-section">
        <h4 data-i18n="footerSupport">Support</h4>
        <a href="https://github.com/sponsors/InnoNestX" target="_blank" rel="noreferrer" data-i18n="footerSponsor">💖 Sponsor</a>
        <a href="https://buymeacoffee.com/xuxuclassmate" target="_blank" rel="noreferrer" data-i18n="footerCoffee">☕ Buy Me a Coffee</a>
        <a href="https://github.com/InnoNestX/GlobalPulse/discussions" target="_blank" rel="noreferrer" data-i18n="footerDiscuss">💬 Discussions</a>
      </div>
      <div class="footer-copy">© 2026 InnoNestX · Built with ❤️ on Cloudflare Workers</div>
    </div>
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
        schedules: "推送时间表",
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
        footerDiscuss: "💬 Discussions"
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
        schedules: "Schedules",
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
        footerDiscuss: "💬 Discussions"
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

    const $ = (id) => document.getElementById(id);

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
      $("themeButton").textContent = icon;
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
      renderProviderSettings();
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
        }
      ];
      $("providerSettingsForm").innerHTML = groups.map((group) =>
        '<div class="provider-config"><h3><span>' + group.name + '</span><span class="badge">' + t("providerConfig") + '</span></h3>' +
        group.fields.map(([key, label, type]) =>
          '<label>' + label + '<input type="' + type + '" autocomplete="off" spellcheck="false" data-provider-setting="' + key + '" value="' + escapeAttr(values[key] || "") + '"></label>'
        ).join("") + '</div>'
      ).join("");
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
        targets: state.defaultTargets,
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
          targets: state.defaultTargets,
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
    $("themeButton").addEventListener("click", cycleTheme);
    $("themeButton").title = t("themeToggle");
    $("sidebar").addEventListener("click", (event) => {
      const item = event.target.closest(".sidebar-item");
      if (!item || !item.dataset.section) return;
      const sectionId = "section-" + item.dataset.section;
      const section = document.getElementById(sectionId);
      if (!section) return;
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
      if (action === "run") {
        try {
          await runSchedule(index);
        } catch (error) {
          const node = $("scheduleStatus-" + index);
          if (node) node.textContent = error.message || "Failed";
        }
      }
    });

    applyTheme();
    applyI18n();
    if (password) {
      $("passwordInput").value = password;
      loadSettings().catch(() => localStorage.removeItem("globalpulse_admin_password"));
    }
  </script>
</body>
</html>`;
