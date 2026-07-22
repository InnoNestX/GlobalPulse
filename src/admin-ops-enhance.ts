import { renderAdminUiWithLogEnhancements } from "./admin-logs-enhance";

export async function renderAdminUiWithOpsEnhancements(): Promise<Response> {
  const response = await renderAdminUiWithLogEnhancements();
  const html = await response.text();
  return new Response(enhanceOps(html), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function enhanceOps(html: string): string {
  if (html.includes("globalpulse-ops-enhance")) return html;

  return html
    .replace("</style>", `${style}\n  </style>`)
    .replace(
      '<button class="sidebar-item" data-section="logs">\n            <span>📜</span> <span data-i18n="logs">发送记录</span>\n          </button>',
      '<button class="sidebar-item" data-section="logs">\n            <span>📜</span> <span data-i18n="logs">发送记录</span>\n          </button>\n          <button class="sidebar-item" data-section="diagnostics">\n            <span>🩺</span> <span data-i18n="diagnostics">系统自检</span>\n          </button>',
    )
    .replace(
      '<p class="muted" data-i18n="heroText">管理多市场交易日、内容模板、推送渠道和测试发送。</p>\n        </div>\n      </div>',
      '<p class="muted" data-i18n="heroText">管理多市场交易日、内容模板、推送渠道和测试发送。</p>\n        </div>\n      </div>\n\n      <div id="setupChecklist" class="ops-banner hidden"></div>\n      <div id="opsStatus" class="status"></div>',
    )
    .replace(
      '<div class="provider-grid" id="providerStatus"></div>\n                <div class="provider-form" id="providerSettingsForm"></div>',
      '<div class="provider-grid" id="providerStatus"></div>\n                <div class="row"><button class="secondary" id="testPushButton" type="button">一键测试推送</button><span class="status" id="testPushStatus"></span></div>\n                <div class="provider-form" id="providerSettingsForm"></div>',
    )
    .replace(
      '<textarea id="template"></textarea>\n                <div class="muted" data-i18n="variables">变量：{{generatedAt}}, {{timezone}}, {{topicQuery}}, {{sourceUrl}}, {{itemsMarkdown}}, {{itemsText}}, {{itemsJson}}</div>',
      '<div class="section-head"><div class="row" id="templatePresets"></div></div>\n                <textarea id="template"></textarea>\n                <div class="muted" data-i18n="variables">变量：{{generatedAt}}, {{timezone}}, {{topicQuery}}, {{sourceUrl}}, {{itemsMarkdown}}, {{itemsText}}, {{itemsJson}}</div>',
    )
    .replace(
      '<div class="logs" id="logs"></div>\n              </div>\n            </details>\n          </div>',
      '<div class="logs" id="logs"></div>\n              </div>\n            </details>\n\n            <details class="collapsible-section" id="section-diagnostics">\n              <summary>\n                <span class="section-title"><span class="emoji">🩺</span> <span data-i18n="diagnostics">系统自检</span></span>\n                <span class="chevron">▾</span>\n              </summary>\n              <div class="section-body stack">\n                <div class="section-head">\n                  <button class="secondary" id="refreshDiagnosticsButton" type="button">刷新自检</button>\n                  <span class="status" id="diagnosticsStatus"></span>\n                </div>\n                <div id="diagnosticsPanel" class="ops-panel"></div>\n              </div>\n            </details>\n          </div>',
    )
    .replace(oldLoadLogs, newLoadLogs)
    .replace(
      "await loadLogs();\n      await loadPreview().catch((error) => {\n        $(\"previewStatus\").textContent = error.message || \"Preview failed\";\n      });\n    }",
      "await loadLogs();\n      await loadDiagnostics().catch(() => {});\n      await loadTemplatePresets().catch(() => {});\n      await loadPreview().catch((error) => {\n        $(\"previewStatus\").textContent = error.message || \"Preview failed\";\n      });\n    }",
    )
    .replace(
      'bind("loadLogsButton", "click", loadLogs);\n    bind("addScheduleButton", "click", addSchedule);',
      'bind("loadLogsButton", "click", loadLogs);\n    bind("refreshDiagnosticsButton", "click", () => loadDiagnostics().catch((error) => {\n      const node = $("diagnosticsStatus");\n      if (node) node.textContent = error.message || "Failed";\n    }));\n    bind("testPushButton", "click", () => testPushActiveProvider().catch((error) => {\n      const node = $("testPushStatus");\n      if (node) node.textContent = error.message || "Failed";\n    }));\n    bind("addScheduleButton", "click", addSchedule);',
    )
    .replace(
      'if (action === "run") {\n        try {\n          await runSchedule(index);\n        } catch (error) {\n          const node = $("scheduleStatus-" + index);\n          if (node) node.textContent = error.message || "Failed";\n        }\n      }\n    });',
      'if (action === "run") {\n        try {\n          await runSchedule(index);\n        } catch (error) {\n          const node = $("scheduleStatus-" + index);\n          if (node) node.textContent = error.message || "Failed";\n        }\n      }\n      if (action === "retryLog") {\n        const logId = event.target.dataset && event.target.dataset.logId;\n        if (logId) {\n          try {\n            await retryLog(logId);\n          } catch (error) {\n            const node = $("opsStatus");\n            if (node) node.textContent = error.message || "Retry failed";\n          }\n        }\n      }\n      if (action === "applyPreset") {\n        const presetId = event.target.dataset && event.target.dataset.presetId;\n        if (presetId) applyTemplatePreset(presetId);\n      }\n      if (action === "gotoSection") {\n        const section = event.target.dataset && event.target.dataset.section;\n        if (section) {\n          const button = document.querySelector(\'.sidebar-item[data-section="\' + section + \'"]\');\n          if (button) button.click();\n        }\n      }\n    });',
    )
    .replace("</body>", `${script}\n</body>`);
}

const oldLoadLogs = `    async function loadLogs() {
      const body = await api("/api/admin/logs");
      const logs = body.logs || [];
      $("logs").innerHTML = logs.length ? logs.map((log) =>
        '<div class="log ' + (log.ok ? "ok" : "fail") + '"><strong>' + escapeHtml(log.scheduleName || "") + '</strong><div>' + escapeHtml(log.message) + '</div><div class="muted">' + escapeHtml(log.createdAt) + ' · delivered ' + log.delivered + ' · failed ' + log.failed + '</div></div>'
      ).join("") : '<div class="muted">' + t("noLogs") + '</div>';
    }`;

const newLoadLogs = `    async function loadLogs() {
      const body = await api("/api/admin/logs");
      const logs = body.logs || [];
      $("logs").innerHTML = logs.length ? logs.map((log) => {
        const results = Array.isArray(log.results) ? log.results : [];
        const resultHtml = results.length
          ? '<div class="log-results">' + results.map((result) =>
              '<span class="badge ' + (result.ok ? "ok" : "warn") + '">' + escapeHtml(result.provider || "") + ': ' + escapeHtml(result.message || (result.ok ? "ok" : "fail")) + '</span>'
            ).join(" ") + '</div>'
          : "";
        const retryHtml = (!log.ok && log.scheduleId)
          ? '<button class="secondary small" data-action="retryLog" data-log-id="' + escapeAttr(log.id) + '">' + (uiLanguage === "zh" ? "按任务重试" : "Retry schedule") + '</button>'
          : "";
        return '<div class="log ' + (log.ok ? "ok" : "fail") + '"><strong>' + escapeHtml(log.scheduleName || "") + '</strong><div>' + escapeHtml(log.message) + '</div><div class="muted">' + escapeHtml(log.createdAt) + ' · delivered ' + log.delivered + ' · failed ' + log.failed + '</div>' + resultHtml + (retryHtml ? '<div class="row">' + retryHtml + '</div>' : '') + '</div>';
      }).join("") : '<div class="muted">' + t("noLogs") + '</div>';
    }

    let templatePresetsCache = [];

    async function loadTemplatePresets() {
      const body = await api("/api/admin/template-presets");
      templatePresetsCache = body.presets || [];
      const host = $("templatePresets");
      if (!host) return;
      host.innerHTML = templatePresetsCache.map((preset) =>
        '<button class="secondary small" type="button" data-action="applyPreset" data-preset-id="' + escapeAttr(preset.id) + '">' +
          escapeHtml(uiLanguage === "zh" ? preset.nameZh : preset.nameEn) +
        '</button>'
      ).join("");
    }

    function applyTemplatePreset(presetId) {
      const preset = templatePresetsCache.find((entry) => entry.id === presetId);
      if (!preset) return;
      const next = uiLanguage === "zh" ? preset.templateZh : preset.templateEn;
      state.template = next;
      const input = $("template");
      if (input) input.value = next;
      const status = $("opsStatus");
      if (status) status.textContent = uiLanguage === "zh" ? ("已套用预设：" + preset.nameZh) : ("Applied preset: " + preset.nameEn);
    }

    async function testPushActiveProvider() {
      const target = activeProvider || (providerStatus.find((entry) => entry.configured) || {}).name;
      const status = $("testPushStatus");
      if (!target) {
        if (status) status.textContent = uiLanguage === "zh" ? "请先配置并选择一个渠道" : "Configure and select a provider first";
        return;
      }
      if (status) status.textContent = uiLanguage === "zh" ? ("测试推送中：" + target + "...") : ("Testing " + target + "...");
      const body = await api("/api/admin/test-push", {
        method: "POST",
        body: JSON.stringify({ target })
      });
      if (status) status.textContent = body.ok
        ? (uiLanguage === "zh" ? ("测试推送成功：" + target) : ("Test push delivered: " + target))
        : (uiLanguage === "zh" ? ("测试推送失败：" + target) : ("Test push failed: " + target));
      await loadLogs();
      await loadDiagnostics().catch(() => {});
    }

    async function retryLog(logId) {
      const status = $("opsStatus");
      if (status) status.textContent = uiLanguage === "zh" ? "重试中..." : "Retrying...";
      const body = await api("/api/admin/retry", {
        method: "POST",
        body: JSON.stringify({ logId })
      });
      if (status) status.textContent = body.ok
        ? (uiLanguage === "zh" ? "重试已完成" : "Retry completed")
        : (uiLanguage === "zh" ? "重试失败" : "Retry failed");
      await loadLogs();
      await loadDiagnostics().catch(() => {});
    }

    async function loadDiagnostics() {
      const body = await api("/api/admin/diagnostics");
      const diagnostics = body.diagnostics || {};
      renderChecklist(diagnostics);
      renderDiagnosticsPanel(diagnostics);
    }

    function checklistLabel(item) {
      const zh = {
        bindings_kv: "绑定 APP_KV",
        secrets: "设置 ADMIN_PASSWORD + API_TOKEN",
        provider: "配置至少一个推送渠道",
        schedule: "启用至少一个定时任务",
        preview: "可预览 / 试发"
      };
      const en = {
        bindings_kv: "Bind APP_KV",
        secrets: "Set ADMIN_PASSWORD + API_TOKEN",
        provider: "Configure at least one provider",
        schedule: "Enable at least one schedule",
        preview: "Ready to preview / send"
      };
      return (uiLanguage === "zh" ? zh : en)[item.id] || item.label;
    }

    function renderChecklist(diagnostics) {
      const host = $("setupChecklist");
      if (!host) return;
      const checklist = diagnostics.checklist || [];
      const incomplete = checklist.filter((item) => !item.ok);
      if (!incomplete.length) {
        host.classList.add("hidden");
        host.innerHTML = "";
        return;
      }
      host.classList.remove("hidden");
      const steps = [
        { id: "provider", section: "providers" },
        { id: "schedule", section: "schedules" },
        { id: "preview", section: "preview" }
      ];
      host.innerHTML = '<div class="ops-banner-title">' + (uiLanguage === "zh" ? "首次启动清单" : "First-run checklist") + '</div>' +
        '<div class="ops-checklist">' + checklist.map((item) =>
          '<div class="ops-check ' + (item.ok ? "ok" : "todo") + '"><span class="badge ' + (item.ok ? "ok" : "warn") + '">' + (item.ok ? "OK" : "TODO") + '</span><span>' + escapeHtml(checklistLabel(item)) + '</span></div>'
        ).join("") + '</div>' +
        '<div class="row">' + steps.filter((step) => incomplete.some((item) => item.id === step.id)).map((step) =>
          '<button class="secondary small" type="button" data-action="gotoSection" data-section="' + step.section + '">' +
            (uiLanguage === "zh"
              ? ({ providers: "去配置渠道", schedules: "去创建任务", preview: "去预览" }[step.section] || step.section)
              : ({ providers: "Configure providers", schedules: "Create schedule", preview: "Open preview" }[step.section] || step.section)) +
          '</button>'
        ).join("") + '</div>';
    }

    function renderDiagnosticsPanel(diagnostics) {
      const panel = $("diagnosticsPanel");
      if (!panel) return;
      const bindings = diagnostics.bindings || [];
      const secrets = diagnostics.secrets || [];
      const lastCron = diagnostics.lastCron;
      const failures = diagnostics.recentFailures || [];
      const cronHtml = lastCron
        ? '<div class="ops-card"><strong>' + (uiLanguage === "zh" ? "最近 Cron" : "Last cron") + '</strong><div class="muted">' + escapeHtml(lastCron.at) + '</div><div>' + escapeHtml(lastCron.message) + '</div><span class="badge ' + (lastCron.ok ? "ok" : "warn") + '">' + (lastCron.ok ? "ok" : "fail") + '</span></div>'
        : '<div class="ops-card muted">' + (uiLanguage === "zh" ? "尚无 Cron 记录（部署后等待 */5 触发）" : "No cron runs yet (wait for */5 after deploy)") + '</div>';
      panel.innerHTML =
        '<div class="ops-grid">' +
          '<div class="ops-card"><strong>' + (uiLanguage === "zh" ? "绑定" : "Bindings") + '</strong>' + bindings.map((item) =>
            '<div class="row"><span class="badge ' + (item.ok ? "ok" : "warn") + '">' + escapeHtml(item.label) + '</span><span class="muted">' + escapeHtml(item.detail) + '</span></div>'
          ).join("") + '</div>' +
          '<div class="ops-card"><strong>' + (uiLanguage === "zh" ? "Secrets" : "Secrets") + '</strong>' + secrets.map((item) =>
            '<div class="row"><span class="badge ' + (item.ok ? "ok" : "warn") + '">' + escapeHtml(item.label) + '</span><span class="muted">' + escapeHtml(item.detail) + '</span></div>'
          ).join("") + '</div>' +
          cronHtml +
          '<div class="ops-card"><strong>' + (uiLanguage === "zh" ? "任务" : "Schedules") + '</strong><div>' +
            (diagnostics.schedules ? (diagnostics.schedules.enabled + " / " + diagnostics.schedules.total + (uiLanguage === "zh" ? " 已启用" : " enabled")) : "—") +
          '</div></div>' +
        '</div>' +
        '<div class="ops-card"><strong>' + (uiLanguage === "zh" ? "最近失败" : "Recent failures") + '</strong>' +
          (failures.length
            ? failures.map((log) => '<div class="log fail"><strong>' + escapeHtml(log.scheduleName || "") + '</strong><div>' + escapeHtml(log.message || "") + '</div><div class="muted">' + escapeHtml(log.createdAt || "") + '</div></div>').join("")
            : '<div class="muted">' + (uiLanguage === "zh" ? "暂无失败记录" : "No recent failures") + '</div>') +
        '</div>';
      const status = $("diagnosticsStatus");
      if (status) {
        status.textContent = diagnostics.readyForFirstBriefing
          ? (uiLanguage === "zh" ? "系统就绪" : "Ready")
          : (uiLanguage === "zh" ? "尚有未完成项" : "Setup incomplete");
      }
    }`;

const style = `
    .ops-banner {
      margin: 0 0 16px;
      padding: 14px 16px;
      border: 1px solid color-mix(in oklab, var(--accent, #3b82f6) 35%, transparent);
      background: color-mix(in oklab, var(--accent, #3b82f6) 10%, transparent);
      border-radius: 12px;
    }
    .ops-banner.hidden { display: none; }
    .ops-banner-title {
      font-weight: 650;
      margin-bottom: 8px;
    }
    .ops-checklist {
      display: grid;
      gap: 6px;
      margin-bottom: 10px;
    }
    .ops-check {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .ops-panel { display: grid; gap: 12px; }
    .ops-grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .ops-card {
      padding: 12px;
      border: 1px solid color-mix(in oklab, var(--border, #334155) 80%, transparent);
      border-radius: 12px;
      display: grid;
      gap: 8px;
    }
    .log-results {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    #templatePresets { flex-wrap: wrap; gap: 8px; }
    button.small {
      padding: 6px 10px;
      font-size: 12px;
    }
    @media (max-width: 900px) {
      .ops-grid { grid-template-columns: 1fr; }
    }`;

const script = `<script id="globalpulse-ops-enhance">
(function(){
  function textZh(){ return document.documentElement.lang !== 'en'; }
  function syncLabels(){
    var testBtn=document.getElementById('testPushButton');
    if(testBtn) testBtn.textContent=textZh()?'一键测试推送':'Test push';
    var refreshBtn=document.getElementById('refreshDiagnosticsButton');
    if(refreshBtn) refreshBtn.textContent=textZh()?'刷新自检':'Refresh diagnostics';
  }
  document.addEventListener('DOMContentLoaded', syncLabels);
  setInterval(syncLabels, 1500);
})();
</script>`;
