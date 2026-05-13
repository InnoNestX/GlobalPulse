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
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7f9;
      --panel: #ffffff;
      --text: #18202c;
      --muted: #657184;
      --line: #d9dee7;
      --accent: #0f766e;
      --accent-strong: #115e59;
      --danger: #b42318;
      --shadow: 0 12px 30px rgba(22, 34, 51, .08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font: 14px/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    header {
      position: sticky;
      top: 0;
      z-index: 3;
      background: rgba(255,255,255,.92);
      border-bottom: 1px solid var(--line);
      backdrop-filter: blur(14px);
    }
    .bar, main {
      max-width: 1160px;
      margin: 0 auto;
      padding: 18px 20px;
    }
    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    h1, h2, h3 { margin: 0; line-height: 1.2; }
    h1 { font-size: 22px; }
    h2 { font-size: 18px; }
    h3 { font-size: 15px; }
    .muted { color: var(--muted); }
    .grid {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 18px;
      align-items: start;
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: var(--shadow);
      padding: 18px;
    }
    .stack { display: grid; gap: 14px; }
    .row {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    label {
      display: grid;
      gap: 6px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 650;
      letter-spacing: 0;
    }
    input, select, textarea, button {
      font: inherit;
      border-radius: 6px;
    }
    input, select, textarea {
      width: 100%;
      border: 1px solid var(--line);
      background: #fff;
      color: var(--text);
      padding: 10px 11px;
      outline: none;
    }
    textarea {
      min-height: 180px;
      resize: vertical;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13px;
    }
    input:focus, select:focus, textarea:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(15, 118, 110, .12);
    }
    button {
      border: 0;
      background: var(--accent);
      color: #fff;
      padding: 10px 13px;
      font-weight: 700;
      cursor: pointer;
      min-height: 40px;
    }
    button:hover { background: var(--accent-strong); }
    button.secondary {
      color: var(--text);
      background: #eef2f6;
      border: 1px solid var(--line);
    }
    button.secondary:hover { background: #e5ebf2; }
    button.danger { background: var(--danger); }
    .hidden { display: none !important; }
    .status {
      min-height: 24px;
      color: var(--muted);
    }
    .schedule {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px;
      display: grid;
      gap: 12px;
    }
    .cols {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .days {
      display: grid;
      grid-template-columns: repeat(7, minmax(36px, 1fr));
      gap: 6px;
    }
    .days label {
      place-items: center;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 8px 4px;
      color: var(--text);
      font-size: 12px;
      cursor: pointer;
    }
    .days input { width: auto; }
    .target-list {
      display: grid;
      gap: 8px;
    }
    .target-list label {
      grid-template-columns: 18px 1fr;
      align-items: center;
      color: var(--text);
      font-size: 13px;
      font-weight: 500;
    }
    .target-list input { width: auto; }
    .logs {
      display: grid;
      gap: 8px;
      max-height: 360px;
      overflow: auto;
    }
    .log {
      border-left: 4px solid var(--line);
      padding: 8px 10px;
      background: #f8fafc;
      border-radius: 6px;
    }
    .log.ok { border-left-color: var(--accent); }
    .log.fail { border-left-color: var(--danger); }
    @media (max-width: 860px) {
      .grid, .cols { grid-template-columns: 1fr; }
      .bar { align-items: flex-start; flex-direction: column; }
    }
  </style>
</head>
<body>
  <header>
    <div class="bar">
      <div>
        <h1>GlobalPulse</h1>
        <div class="muted" data-i18n="subtitle">金融与国际热点定时推送</div>
      </div>
      <div class="row">
        <select id="uiLanguage" aria-label="Language">
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
        <button class="secondary hidden" id="logoutButton" data-i18n="logout">退出</button>
      </div>
    </div>
  </header>
  <main>
    <section class="panel stack" id="loginView">
      <h2 data-i18n="loginTitle">Admin 登录</h2>
      <label>
        <span data-i18n="password">密码</span>
        <input id="passwordInput" type="password" autocomplete="current-password">
      </label>
      <div class="row">
        <button id="loginButton" data-i18n="login">登录</button>
        <span class="status" id="loginStatus"></span>
      </div>
    </section>

    <section class="grid hidden" id="adminView">
      <aside class="panel stack">
        <h2 data-i18n="globalSettings">全局设置</h2>
        <label>
          <span data-i18n="appName">应用名称</span>
          <input id="appName">
        </label>
        <label>
          <span data-i18n="contentLanguage">内容语言</span>
          <select id="language">
            <option value="zh">中文</option>
            <option value="en">English</option>
          </select>
        </label>
        <label>
          <span data-i18n="timezone">时区</span>
          <select id="timezone"></select>
        </label>
        <label>
          <span data-i18n="format">默认格式</span>
          <select id="outputFormat">
            <option value="markdown">Markdown</option>
            <option value="text">Text</option>
            <option value="json">JSON</option>
          </select>
        </label>
        <label>
          <span data-i18n="topicFocus">关注主题</span>
          <textarea id="topicFocus"></textarea>
        </label>
        <div>
          <h3 data-i18n="defaultTargets">默认推送目标</h3>
          <div class="target-list" id="defaultTargets"></div>
        </div>
        <div class="row">
          <button id="saveButton" data-i18n="save">保存</button>
          <button class="secondary" id="refreshButton" data-i18n="refresh">刷新</button>
        </div>
        <div class="status" id="saveStatus"></div>
      </aside>

      <div class="stack">
        <section class="panel stack">
          <div class="row" style="justify-content: space-between;">
            <h2 data-i18n="schedules">推送时间表</h2>
            <button class="secondary" id="addScheduleButton" data-i18n="addSchedule">新增时间点</button>
          </div>
          <div id="schedules"></div>
        </section>

        <section class="panel stack">
          <h2 data-i18n="template">全局模板</h2>
          <textarea id="template"></textarea>
          <div class="muted" data-i18n="variables">变量：{{generatedAt}}, {{timezone}}, {{topicQuery}}, {{sourceUrl}}, {{itemsMarkdown}}, {{itemsText}}, {{itemsJson}}</div>
        </section>

        <section class="panel stack">
          <div class="row" style="justify-content: space-between;">
            <h2 data-i18n="logs">最近记录</h2>
            <button class="secondary" id="loadLogsButton" data-i18n="refreshLogs">刷新记录</button>
          </div>
          <div class="logs" id="logs"></div>
        </section>
      </div>
    </section>
  </main>

  <script>
    const providers = ["feishu", "wechat_official_account", "wechat_ai_agent"];
    const timezones = ["Asia/Hong_Kong", "Asia/Shanghai", "UTC", "America/New_York", "Europe/London", "Europe/Paris", "Asia/Tokyo", "Asia/Singapore"];
    const dict = {
      zh: {
        subtitle: "金融与国际热点定时推送",
        logout: "退出",
        loginTitle: "Admin 登录",
        password: "密码",
        login: "登录",
        globalSettings: "全局设置",
        appName: "应用名称",
        contentLanguage: "内容语言",
        timezone: "时区",
        format: "默认格式",
        topicFocus: "关注主题",
        defaultTargets: "默认推送目标",
        save: "保存",
        refresh: "刷新",
        schedules: "推送时间表",
        addSchedule: "新增时间点",
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
        runNow: "立即运行",
        remove: "删除",
        saved: "已保存",
        loaded: "已加载",
        loginFailed: "登录失败",
        loginOk: "登录成功",
        noLogs: "暂无记录"
      },
      en: {
        subtitle: "Scheduled finance and global hotspot briefings",
        logout: "Log out",
        loginTitle: "Admin Login",
        password: "Password",
        login: "Login",
        globalSettings: "Global Settings",
        appName: "App name",
        contentLanguage: "Content language",
        timezone: "Timezone",
        format: "Default format",
        topicFocus: "Topic focus",
        defaultTargets: "Default targets",
        save: "Save",
        refresh: "Refresh",
        schedules: "Schedules",
        addSchedule: "Add time",
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
        runNow: "Run now",
        remove: "Remove",
        saved: "Saved",
        loaded: "Loaded",
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
    let password = localStorage.getItem("globalpulse_admin_password") || "";
    let uiLanguage = localStorage.getItem("globalpulse_ui_language") || "zh";

    const $ = (id) => document.getElementById(id);

    function t(key) {
      return (dict[uiLanguage] && dict[uiLanguage][key]) || dict.zh[key] || key;
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
      $("loginView").classList.add("hidden");
      $("adminView").classList.remove("hidden");
      $("logoutButton").classList.remove("hidden");
      render();
      await loadLogs();
    }

    function render() {
      $("appName").value = state.appName;
      $("language").value = state.language;
      $("outputFormat").value = state.outputFormat;
      $("topicFocus").value = state.topicFocus;
      $("template").value = state.template;
      renderTimezoneSelect($("timezone"), state.timezone);
      renderTargetList($("defaultTargets"), state.defaultTargets, "default");
      renderSchedules();
    }

    function renderTimezoneSelect(select, value) {
      select.innerHTML = timezones.map((zone) => '<option value="' + zone + '">' + zone + '</option>').join("");
      select.value = value || "Asia/Hong_Kong";
    }

    function renderTargetList(container, selected, name) {
      container.innerHTML = providers.map((provider) => {
        const checked = selected.includes(provider) ? "checked" : "";
        return '<label><input type="checkbox" name="' + name + '" value="' + provider + '" ' + checked + '><span>' + provider + '</span></label>';
      }).join("");
    }

    function renderSchedules() {
      $("schedules").innerHTML = state.schedules.map((schedule, index) => {
        const days = dayLabels[uiLanguage].map((label, day) => {
          const checked = schedule.days.includes(day) ? "checked" : "";
          return '<label><input type="checkbox" data-index="' + index + '" data-field="days" value="' + day + '" ' + checked + '><span>' + label + '</span></label>';
        }).join("");
        const targets = providers.map((provider) => {
          const checked = schedule.targets.includes(provider) ? "checked" : "";
          return '<label><input type="checkbox" data-index="' + index + '" data-field="targets" value="' + provider + '" ' + checked + '><span>' + provider + '</span></label>';
        }).join("");
        return '<div class="schedule" data-index="' + index + '">' +
          '<div class="row" style="justify-content: space-between;"><h3>' + escapeHtml(schedule.name) + '</h3><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" data-index="' + index + '" data-field="enabled" ' + (schedule.enabled ? "checked" : "") + '>' + t("enabled") + '</label></div>' +
          '<div class="cols">' +
          field(t("name"), "name", schedule.name, index) +
          field(t("time"), "time", schedule.time, index, "time") +
          selectField(t("contentLanguage"), "language", schedule.language, index, [["zh", "中文"], ["en", "English"]]) +
          selectField(t("format"), "outputFormat", schedule.outputFormat, index, [["markdown", "Markdown"], ["text", "Text"], ["json", "JSON"]]) +
          '</div>' +
          '<label>' + t("timezone") + '<select data-index="' + index + '" data-field="timezone">' + timezones.map((zone) => '<option value="' + zone + '"' + (zone === schedule.timezone ? " selected" : "") + '>' + zone + '</option>').join("") + '</select></label>' +
          '<label>' + t("topicQuery") + '<input data-index="' + index + '" data-field="topicQuery" value="' + escapeAttr(schedule.topicQuery) + '"></label>' +
          '<label>' + t("sourceUrl") + '<input data-index="' + index + '" data-field="sourceUrl" value="' + escapeAttr(schedule.sourceUrl || "") + '"></label>' +
          '<div><h3>' + t("days") + '</h3><div class="days">' + days + '</div></div>' +
          '<div><h3>' + t("targets") + '</h3><div class="target-list">' + targets + '</div></div>' +
          '<label>' + t("scheduleTemplate") + '<textarea data-index="' + index + '" data-field="template">' + escapeHtml(schedule.template) + '</textarea></label>' +
          '<div class="row"><button class="secondary" data-action="run" data-index="' + index + '">' + t("runNow") + '</button><button class="danger" data-action="remove" data-index="' + index + '">' + t("remove") + '</button></div>' +
          '</div>';
      }).join("");
    }

    function field(label, fieldName, value, index, type = "text") {
      return '<label>' + label + '<input type="' + type + '" data-index="' + index + '" data-field="' + fieldName + '" value="' + escapeAttr(value) + '"></label>';
    }

    function selectField(label, fieldName, value, index, options) {
      return '<label>' + label + '<select data-index="' + index + '" data-field="' + fieldName + '">' + options.map(([key, text]) => '<option value="' + key + '"' + (key === value ? " selected" : "") + '>' + text + '</option>').join("") + '</select></label>';
    }

    function collectSettings() {
      state.appName = $("appName").value;
      state.language = $("language").value;
      state.timezone = $("timezone").value;
      state.outputFormat = $("outputFormat").value;
      state.topicFocus = $("topicFocus").value;
      state.template = $("template").value;
      state.defaultTargets = checkedValues("default");
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
      $("saveStatus").textContent = t("saved");
      render();
    }

    async function runSchedule(index) {
      collectSettings();
      await saveSettings();
      await api("/api/admin/run", { method: "POST", body: JSON.stringify({ scheduleId: state.schedules[index].id }) });
      await loadLogs();
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
        topicQuery: state.topicFocus,
        template: state.template
      });
      renderSchedules();
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
    $("uiLanguage").addEventListener("change", (event) => {
      uiLanguage = event.target.value;
      localStorage.setItem("globalpulse_ui_language", uiLanguage);
      applyI18n();
    });
    $("saveButton").addEventListener("click", saveSettings);
    $("refreshButton").addEventListener("click", loadSettings);
    $("loadLogsButton").addEventListener("click", loadLogs);
    $("addScheduleButton").addEventListener("click", addSchedule);
    document.addEventListener("input", (event) => {
      const fieldName = event.target.dataset && event.target.dataset.field;
      const index = event.target.dataset && event.target.dataset.index;
      if (!fieldName || index === undefined) return;
      const schedule = state.schedules[Number(index)];
      if (!schedule) return;
      if (fieldName === "enabled") schedule.enabled = event.target.checked;
      else if (fieldName === "days") schedule.days = Array.from(document.querySelectorAll('input[data-index="' + index + '"][data-field="days"]:checked')).map((node) => Number(node.value));
      else if (fieldName === "targets") schedule.targets = Array.from(document.querySelectorAll('input[data-index="' + index + '"][data-field="targets"]:checked')).map((node) => node.value);
      else schedule[fieldName] = event.target.value;
    });
    document.addEventListener("click", async (event) => {
      const action = event.target.dataset && event.target.dataset.action;
      const index = Number(event.target.dataset && event.target.dataset.index);
      if (action === "remove") {
        state.schedules.splice(index, 1);
        renderSchedules();
      }
      if (action === "run") {
        await runSchedule(index);
      }
    });

    applyI18n();
    if (password) {
      $("passwordInput").value = password;
      loadSettings().catch(() => localStorage.removeItem("globalpulse_admin_password"));
    }
  </script>
</body>
</html>`;
