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
    .tabs {
      display: grid;
      gap: 10px;
    }
    .tab {
      width: 100%;
      justify-content: flex-start;
      text-align: left;
    }
    .tab.active {
      border-color: var(--accent);
      color: var(--accent);
      background: color-mix(in srgb, var(--accent) 10%, transparent);
    }
    input, select, textarea, button {
      font: inherit;
    }
    input, select, textarea {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface-2);
      color: var(--text);
      padding: 9px 10px;
      outline: none;
    }
    input:focus, select:focus, textarea:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
    }
    textarea { min-height: 120px; resize: vertical; }
    label { display: grid; gap: 6px; font-weight: 650; color: var(--muted); }
    button, .button {
      border: 1px solid var(--line);
      background: var(--surface-2);
      color: var(--text);
      border-radius: 8px;
      padding: 9px 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-weight: 750;
    }
    button:hover, .button:hover { border-color: var(--accent); color: var(--accent); }
    button.primary { background: var(--accent); border-color: var(--accent); color: white; }
    button.danger { color: var(--danger); }
    button:disabled { opacity: .55; cursor: not-allowed; }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--chip);
      padding: 4px 9px;
      font-size: 12px;
      color: var(--muted);
    }
    .badge { color: var(--muted); font-size: 12px; }
    .card-list { display: grid; gap: 10px; }
    .schedule {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--surface-2);
      overflow: hidden;
    }
    .schedule > summary {
      padding: 12px 14px;
      cursor: pointer;
      list-style: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .schedule > summary::-webkit-details-marker { display: none; }
    .schedule-body { padding: 0 14px 14px; display: grid; gap: 10px; }
    .schedule-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .mini { font-size: 12px; color: var(--muted); }
    .preview {
      white-space: pre-wrap;
      word-break: break-word;
      background: #020617;
      border-radius: 8px;
      padding: 14px;
      border: 1px solid var(--line);
      min-height: 220px;
      max-height: 620px;
      overflow: auto;
    }
    html[data-theme="light"] .preview, @media (prefers-color-scheme: light) { html[data-theme="system"] .preview { background: #ffffff; } }
    .status { display: flex; gap: 8px; flex-wrap: wrap; }
    .status-dot { width: 9px; height: 9px; border-radius: 999px; background: var(--muted); display: inline-block; }
    .status-dot.ok { background: var(--ok); }
    .status-dot.bad { background: var(--danger); }
    .toast {
      position: fixed;
      left: 50%;
      bottom: 24px;
      transform: translateX(-50%);
      background: var(--text);
      color: var(--surface);
      padding: 10px 14px;
      border-radius: 999px;
      box-shadow: var(--shadow);
      opacity: 0;
      pointer-events: none;
      transition: opacity .2s ease;
      z-index: 20;
    }
    .toast.show { opacity: 1; }
    .hide { display: none !important; }
    .lang-switch { width: auto; min-width: 76px; }
    .theme-toggle { min-width: 44px; }
    @media (max-width: 860px) {
      .bar { align-items: flex-start; padding: 12px 0; }
      .toolbar { justify-content: flex-start; }
      .layout, .admin-main { grid-template-columns: 1fr; }
      .cols { grid-template-columns: 1fr; }
      .hero-actions { justify-content: flex-start; }
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
        <button class="lang-switch" id="langToggle" type="button">EN</button>
        <button class="theme-toggle" id="themeToggle" type="button" aria-label="Toggle theme">🌙</button>
      </div>
    </div>
  </header>
  <main>
    <section class="hero">
      <div>
        <div class="muted" style="font-weight:750;letter-spacing:.04em;">InnoNestX Ops</div>
        <h2 data-i18n="heroTitle">金融与国际热点推送控制台</h2>
        <p class="muted" data-i18n="heroDesc">管理多市场交易日、内容模板、推送渠道和测试发送。</p>
      </div>
    </section>
    <section id="loginPanel" class="panel stack">
      <h2 data-i18n="loginTitle">管理员登录</h2>
      <label><span data-i18n="adminPassword">管理员密码</span><input id="adminPassword" type="password" autocomplete="current-password"></label>
      <div><button class="primary" id="loginBtn" type="button" data-i18n="login">登录</button></div>
    </section>
    <section id="appPanel" class="layout hide">
      <aside class="panel tight tabs" id="tabs"></aside>
      <div class="stack">
        <section class="panel stack tab-panel" data-panel="settings">
          <div class="section-head"><h2>⚙️ <span data-i18n="globalSettings">全局设置</span></h2></div>
          <div class="cols">
            <label><span data-i18n="language">语言</span><select id="language"><option value="zh">中文</option><option value="en">English</option></select></label>
            <label><span data-i18n="timezone">时区</span><input id="timezone" list="timezoneOptions"></label>
          </div>
          <datalist id="timezoneOptions"><option value="Asia/Hong_Kong"><option value="Asia/Shanghai"><option value="UTC"><option value="America/New_York"></datalist>
          <div class="cols">
            <label><span data-i18n="format">格式</span><select id="format"><option value="markdown">Markdown</option><option value="text">Text</option><option value="json">JSON</option></select></label>
            <label><span data-i18n="maxItems">条目上限</span><input id="maxItems" type="number" min="1" max="20"></label>