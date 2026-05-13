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
    :root {
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
      grid-template-columns: 1fr auto;
      gap: 18px;
      align-items: end;
      padding: 22px 0 4px;
    }
    .hero h2 { font-size: clamp(28px, 3vw, 44px); max-width: 820px; }
    .hero-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
    .layout {
      display: grid;
      grid-template-columns: 380px minmax(0, 1fr);
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
      padding: 15px;
      display: grid;
      gap: 13px;
    }
    .schedule-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
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
    @media (max-width: 920px) {
      .layout, .hero, .cols, .provider-grid { grid-template-columns: 1fr; }
      .hero-actions, .toolbar { justify-content: flex-start; }
      .bar { align-items: flex-start; flex-direction: column; padding: 14px 0; }
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
        <a class="button-link secondary" href="https://github.com/InnoNestX/globalpulse/issues/new/choose" target="_blank" rel="noreferrer" data-i18n="feedback">提 Bug / 需求</a>
        <select id="uiLanguage" aria-label="Language">
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
        <button class="secondary icon-button" id="themeButton" title="Theme">◐</button>
        <button class="secondary hidden" id="logoutButton" data-i18n="logout">退出</button>
      </div>
    </div>
  </header>
  <main>
    <section class="panel stack login" id="loginView">
      <div class="mark">IN</div>
      <h2 data-i18n="loginTitle">Admin 登录</h2>
      <label>
        <span data-i18n="password">密码</span>
        <input id="passwordInput" type="password" autocomplete="current-password">
      </label>
      <div class="row">
        <button class="primary" id="loginButton" data-i18n="login">登录</button>
        <span class="status" id="loginStatus"></span>
      </div>
    </section>

    <section class="hidden" id="adminView">
      <div class="hero">
        <div>
          <div class="badge">InnoNestX Ops</div>
          <h2 data-i18n="heroTitle">金融与国际热点推送控制台</h2>
          <p class="muted" data-i18n="heroText">管理多市场交易日、内容模板、推送渠道和测试发送。</p>
        </div>
        <div class="hero-actions">
          <a class="button-link secondary" href="https://github.com/InnoNestX/globalpulse" target="_blank" rel="noreferrer">GitHub</a>
          <a class="button-link primary" href="https://github.com/InnoNestX/globalpulse/issues/new/choose" target="_blank" rel="noreferrer" data-i18n="feedback">提 Bug / 需求</a>
        </div>
      </div>

      <section class="layout">
        <aside class="stack">
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

          <section class="panel stack">
            <h2 data-i18n="providers">通知渠道</h2>
            <p class="muted" data-i18n="providerHelp">这里配置的 token / webhook 会存入 KV；Cloudflare secrets 也会继续生效。</p>
            <div class="provider-grid" id="providerStatus"></div>
            <div class="provider-form" id="providerSettingsForm"></div>
          </section>
        </aside>

        <div class="stack">
          <section class="panel stack">
            <div class="section-head">
              <h2 data-i18n="schedules">推送时间表</h2>
              <button class="secondary" id="addScheduleButton" data-i18n="addSchedule">新增时间点</button>
            </div>
            <div class="stack" id="schedules"></div>
          </section>

          <section class="panel stack">
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

          <section class="panel stack">
            <h2 data-i18n="template">全局模板</h2>
            <textarea id="template"></textarea>
            <div class="muted" data-i18n="variables">变量：{{generatedAt}}, {{timezone}}, {{topicQuery}}, {{sourceUrl}}, {{itemsMarkdown}}, {{itemsText}}, {{itemsJson}}</div>
          </section>

          <section class="panel stack">
            <div class="section-head">
              <h2 data-i18n="logs">最近记录</h2>
              <button class="secondary" id="loadLogsButton" data-i18n="refreshLogs">刷新记录</button>
            </div>
            <div class="logs" id="logs"></div>
          </section>
        </div>
      </section>
    </section>
  </main>

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
        noLogs: "暂无记录"
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
        noLogs: "No logs yet"
      }
    };
    const dayLabels = {
      zh: ["日", "一", "二", "三", "四", "五", "六"],
      en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    };
    let state = null;
    let providerStatus = [];
    let password = localStorage.getItem("globalpulse_admin_password") || "";
    let uiLanguage = localStorage.getItem("globalpulse_ui_language") || "zh";
    let theme = localStorage.getItem("globalpulse_theme") || "dark";

    const $ = (id) => document.getElementById(id);

    function t(key) {
      return (dict[uiLanguage] && dict[uiLanguage][key]) || dict.zh[key] || key;
    }

    function applyTheme() {
      document.documentElement.dataset.theme = theme;
      $("themeButton").textContent = theme === "dark" ? "☼" : "◐";
    }

    function applyI18n() {
      document.documentElement.lang = uiLanguage;
      $("uiLanguage").value = uiLanguage;
      document.querySelectorAll("[data-i18n]").forEach((node) => {
        node.textContent = t(node.dataset.i18n);
      });
      if (state) render();
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
      renderSchedules();
      renderPreviewSelect();
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

    function renderSchedules() {
      $("schedules").innerHTML = state.schedules.map((schedule, index) => {
        schedule.marketCalendar = schedule.marketCalendar || "everyday";
        schedule.tradingDaySource = schedule.tradingDaySource || (schedule.marketCalendar === "a_share" || schedule.marketCalendar === "us_stock" ? "external" : "weekday");
        schedule.marketHolidayDates = schedule.marketHolidayDates || [];
        const days = dayLabels[uiLanguage].map((label, day) => {
          const checked = schedule.days.includes(day) ? "checked" : "";
          return '<label><input type="checkbox" data-index="' + index + '" data-field="days" value="' + day + '" ' + checked + '><span>' + label + '</span></label>';
        }).join("");
        const targets = providers.map((provider) => {
          const checked = schedule.targets.includes(provider) ? "checked" : "";
          return '<label><input type="checkbox" data-index="' + index + '" data-field="targets" value="' + provider + '" ' + checked + '><span>' + providerLabels[provider] + '</span></label>';
        }).join("");
        return '<div class="schedule" data-index="' + index + '">' +
          '<div class="schedule-title"><div><h3>' + escapeHtml(schedule.name) + '</h3><div class="muted">' + escapeHtml(schedule.timezone) + ' · ' + escapeHtml(schedule.marketCalendar) + '</div></div><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" data-index="' + index + '" data-field="enabled" ' + (schedule.enabled ? "checked" : "") + '>' + t("enabled") + '</label></div>' +
          '<div class="cols">' +
          field(t("name"), "name", schedule.name, index) +
          field(t("time"), "time", schedule.time, index, "time") +
          selectField(t("contentLanguage"), "language", schedule.language, index, [["zh", "中文"], ["en", "English"]]) +
          selectField(t("format"), "outputFormat", schedule.outputFormat, index, [["markdown", "Markdown"], ["text", "Text"], ["json", "JSON"]]) +
          '</div>' +
          '<div class="cols">' +
          '<label>' + t("timezone") + '<select data-index="' + index + '" data-field="timezone">' + timezones.map((zone) => '<option value="' + zone + '"' + (zone === schedule.timezone ? " selected" : "") + '>' + zone + '</option>').join("") + '</select></label>' +
          selectField(t("marketCalendar"), "marketCalendar", schedule.marketCalendar, index, marketOptions) +
          selectField(t("tradingDaySource"), "tradingDaySource", schedule.tradingDaySource, index, localizedTradingDayOptions()) +
          '</div>' +
          '<label>' + t("topicQuery") + '<input data-index="' + index + '" data-field="topicQuery" value="' + escapeAttr(schedule.topicQuery) + '"></label>' +
          '<label>' + t("sourceUrl") + '<input data-index="' + index + '" data-field="sourceUrl" value="' + escapeAttr(schedule.sourceUrl || "") + '"></label>' +
          '<label>' + t("marketHolidayDates") + '<textarea data-index="' + index + '" data-field="marketHolidayDates">' + escapeHtml(schedule.marketHolidayDates.join("\\n")) + '</textarea><span class="muted">' + t("marketHolidayHelp") + '</span></label>' +
          '<div><h3>' + t("days") + '</h3><div class="days">' + days + '</div></div>' +
          '<div><h3>' + t("targets") + '</h3><div class="target-list">' + targets + '</div></div>' +
          '<label>' + t("scheduleTemplate") + '<textarea data-index="' + index + '" data-field="template">' + escapeHtml(schedule.template) + '</textarea></label>' +
          '<div class="row"><button class="primary" data-action="run" data-index="' + index + '">' + t("testSend") + '</button><button class="danger" data-action="remove" data-index="' + index + '">' + t("remove") + '</button><span class="status" id="scheduleStatus-' + index + '"></span></div>' +
          '</div>';
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
      await api("/api/admin/run", { method: "POST", body: JSON.stringify({ scheduleId: state.schedules[index].id }) });
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
      $("previewStatus").textContent = preview.generatedAt + " · " + preview.sourceUrl;
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
        time: "09:00",
        days: [1, 2, 3, 4, 5],
        timezone: state.timezone,
        language: state.language,
        outputFormat: state.outputFormat,
        targets: state.defaultTargets,
        marketCalendar: "a_share",
        tradingDaySource: "external",
        marketHolidayDates: [],
        topicQuery: state.topicFocus,
        template: state.template
      });
      render();
    }

    function parseDates(value) {
      if (Array.isArray(value)) return value;
      return String(value || "").split(/[,\\s]+/).map((date) => date.trim()).filter((date) => /^\\d{4}-\\d{2}-\\d{2}$/.test(date));
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
    $("themeButton").addEventListener("click", () => {
      theme = theme === "dark" ? "light" : "dark";
      localStorage.setItem("globalpulse_theme", theme);
      applyTheme();
    });
    $("uiLanguage").addEventListener("change", (event) => {
      uiLanguage = event.target.value;
      localStorage.setItem("globalpulse_ui_language", uiLanguage);
      applyI18n();
    });
    $("saveButton").addEventListener("click", saveSettings);
    $("refreshButton").addEventListener("click", loadSettings);
    $("loadLogsButton").addEventListener("click", loadLogs);
    $("addScheduleButton").addEventListener("click", addSchedule);
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
      else if (fieldName === "days") schedule.days = Array.from(document.querySelectorAll('input[data-index="' + index + '"][data-field="days"]:checked')).map((node) => Number(node.value));
      else if (fieldName === "targets") schedule.targets = Array.from(document.querySelectorAll('input[data-index="' + index + '"][data-field="targets"]:checked')).map((node) => node.value);
      else if (fieldName === "marketHolidayDates") schedule.marketHolidayDates = parseDates(event.target.value);
      else schedule[fieldName] = event.target.value;
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
