import { renderAdminUiWithOpsEnhancements } from "./admin-ops-enhance";

export async function renderAdminUiWithIntelEnhancements(): Promise<Response> {
  const response = await renderAdminUiWithOpsEnhancements();
  const html = await response.text();
  return new Response(enhanceIntel(html), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function enhanceIntel(html: string): string {
  if (html.includes("globalpulse-intel-enhance")) return html;

  return html
    .replace("</style>", `${style}\n  </style>`)
    .replace(
      '<button class="sidebar-item" data-section="diagnostics">\n            <span>🩺</span> <span data-i18n="diagnostics">系统自检</span>\n          </button>',
      '<button class="sidebar-item" data-section="diagnostics">\n            <span>🩺</span> <span data-i18n="diagnostics">系统自检</span>\n          </button>\n          <button class="sidebar-item" data-section="intelligence">\n            <span>🛰️</span> <span>Intelligence</span>\n          </button>',
    )
    .replace(
      '<div id="diagnosticsPanel" class="ops-panel"></div>\n              </div>\n            </details>\n          </div>',
      '<div id="diagnosticsPanel" class="ops-panel"></div>\n              </div>\n            </details>\n\n            <details class="collapsible-section" id="section-intelligence">\n              <summary>\n                <span class="section-title"><span class="emoji">🛰️</span> <span>Intelligence</span></span>\n                <span class="chevron">▾</span>\n              </summary>\n              <div class="section-body stack">\n                <div class="intel-grid">\n                  <div class="ops-card">\n                    <strong>Pulse Continuity</strong>\n                    <div class="muted" id="continuitySummary">—</div>\n                    <select id="continuityScheduleSelect"></select>\n                    <button class="secondary small" id="refreshContinuityButton" type="button">刷新对比</button>\n                  </div>\n                  <div class="ops-card">\n                    <strong>Autopilot Radar</strong>\n                    <label class="row"><input type="checkbox" id="autopilotEnabled"> 启用 Autopilot</label>\n                    <div id="autopilotRules" class="stack"></div>\n                    <div class="row">\n                      <button class="secondary small" id="saveAutopilotButton" type="button">保存雷达</button>\n                      <button class="primary small" id="scanAutopilotButton" type="button">立即扫描</button>\n                      <span class="status" id="autopilotStatus"></span>\n                    </div>\n                  </div>\n                </div>\n                <div class="ops-card">\n                  <strong>Research History</strong>\n                  <button class="secondary small" id="refreshResearchRunsButton" type="button">刷新历史</button>\n                  <div id="researchRuns" class="stack"></div>\n                </div>\n              </div>\n            </details>\n          </div>',
    )
    .replace(
      "await loadModelPresets().catch(() => {});\n      await loadPreview().catch((error) => {\n        $(\"previewStatus\").textContent = error.message || \"Preview failed\";\n      });\n    }",
      "await loadModelPresets().catch(() => {});\n      await loadIntelligenceConsole().catch(() => {});\n      await loadPreview().catch((error) => {\n        $(\"previewStatus\").textContent = error.message || \"Preview failed\";\n      });\n    }",
    )
    .replace(
      'bind("importSettingsFile", "change", importSettingsJson);\n    bind("addScheduleButton", "click", addSchedule);',
      'bind("importSettingsFile", "change", importSettingsJson);\n    bind("refreshContinuityButton", "click", () => loadContinuityPanel().catch(() => {}));\n    bind("continuityScheduleSelect", "change", () => loadContinuityPanel().catch(() => {}));\n    bind("saveAutopilotButton", "click", () => saveAutopilotPanel().catch((error) => {\n      const node = $("autopilotStatus");\n      if (node) node.textContent = error.message || "Failed";\n    }));\n    bind("scanAutopilotButton", "click", () => scanAutopilotNow().catch((error) => {\n      const node = $("autopilotStatus");\n      if (node) node.textContent = error.message || "Failed";\n    }));\n    bind("refreshResearchRunsButton", "click", () => loadResearchRuns().catch(() => {}));\n    bind("addScheduleButton", "click", addSchedule);',
    )
    .replace(oldLoadLogsEnd, newIntelFunctions)
    .replace("</body>", `${script}\n</body>`);
}

const oldLoadLogsEnd = `    async function loadDiagnostics() {
      const body = await api("/api/admin/diagnostics");
      const diagnostics = body.diagnostics || {};
      renderChecklist(diagnostics);
      renderDiagnosticsPanel(diagnostics);
    }`;

const newIntelFunctions = `    async function loadDiagnostics() {
      const body = await api("/api/admin/diagnostics");
      const diagnostics = body.diagnostics || {};
      renderChecklist(diagnostics);
      renderDiagnosticsPanel(diagnostics);
    }

    async function loadIntelligenceConsole() {
      renderContinuityScheduleSelect();
      await Promise.all([
        loadContinuityPanel().catch(() => {}),
        loadAutopilotPanel().catch(() => {}),
        loadResearchRuns().catch(() => {})
      ]);
    }

    function renderContinuityScheduleSelect() {
      const select = $("continuityScheduleSelect");
      if (!select || !state || !state.schedules) return;
      const previous = select.value;
      select.innerHTML = state.schedules.map((schedule) =>
        '<option value="' + escapeAttr(schedule.id) + '">' + escapeHtml(schedule.name || schedule.id) + '</option>'
      ).join("");
      if (previous) select.value = previous;
    }

    async function loadContinuityPanel() {
      const select = $("continuityScheduleSelect");
      const summary = $("continuitySummary");
      if (!select || !summary) return;
      const scheduleId = select.value || (state.schedules[0] && state.schedules[0].id);
      if (!scheduleId) {
        summary.textContent = uiLanguage === "zh" ? "暂无任务" : "No schedules";
        return;
      }
      const body = await api("/api/admin/continuity/" + encodeURIComponent(scheduleId));
      const delta = body.delta;
      const snapshot = body.snapshot;
      if (!snapshot) {
        summary.textContent = uiLanguage === "zh" ? "尚无 Continuity 快照（成功推送后生成）" : "No continuity snapshot yet";
        return;
      }
      const lines = (delta && delta.summaryLines) ? delta.summaryLines : [];
      summary.innerHTML = '<div>' + escapeHtml(snapshot.asOf) + ' · bias ' + escapeHtml(snapshot.bias || "—") + '</div>' +
        (lines.length ? '<ul>' + lines.map((line) => '<li>' + escapeHtml(line) + '</li>').join("") + '</ul>' : '<div class="muted">—</div>');
    }

    let autopilotState = { enabled: true, rules: [] };

    async function loadAutopilotPanel() {
      const body = await api("/api/admin/autopilot");
      autopilotState = body.autopilot || { enabled: true, rules: [] };
      const enabled = $("autopilotEnabled");
      if (enabled) enabled.checked = Boolean(autopilotState.enabled);
      const host = $("autopilotRules");
      if (!host) return;
      host.innerHTML = (autopilotState.rules || []).map((rule, index) =>
        '<label class="row"><input type="checkbox" data-autopilot-rule="' + index + '"' + (rule.enabled ? " checked" : "") + '> ' +
          escapeHtml(rule.name) + ' <span class="muted">(' + escapeHtml(rule.kind) + ' · ' + rule.cooldownMinutes + 'm)</span></label>'
      ).join("") || '<div class="muted">No rules</div>';
    }

    async function saveAutopilotPanel() {
      const enabled = $("autopilotEnabled");
      autopilotState.enabled = Boolean(enabled && enabled.checked);
      document.querySelectorAll("[data-autopilot-rule]").forEach((node) => {
        const index = Number(node.getAttribute("data-autopilot-rule"));
        if (autopilotState.rules[index]) autopilotState.rules[index].enabled = node.checked;
      });
      state.autopilot = autopilotState;
      await api("/api/admin/autopilot", { method: "PUT", body: JSON.stringify({ autopilot: autopilotState }) });
      const status = $("autopilotStatus");
      if (status) status.textContent = uiLanguage === "zh" ? "雷达已保存" : "Autopilot saved";
    }

    async function scanAutopilotNow() {
      const status = $("autopilotStatus");
      if (status) status.textContent = uiLanguage === "zh" ? "扫描中..." : "Scanning...";
      const body = await api("/api/admin/autopilot/scan", { method: "POST", body: "{}" });
      const result = body.result || {};
      if (status) {
        status.textContent = uiLanguage === "zh"
          ? ("触发 " + (result.triggered || 0) + " / 检查 " + (result.checked || 0))
          : ("triggered " + (result.triggered || 0) + " / checked " + (result.checked || 0));
      }
      await loadLogs();
    }

    async function loadResearchRuns() {
      const host = $("researchRuns");
      if (!host) return;
      const body = await api("/api/admin/research-runs?limit=12");
      const runs = body.runs || [];
      host.innerHTML = runs.length
        ? runs.map((run) =>
            '<div class="log"><strong>' + escapeHtml(run.market) + '</strong> · ' + escapeHtml(run.model || "") +
            '<div class="muted">' + escapeHtml(run.createdAt || "") + ' · ' + escapeHtml(run.degradeLevel || "") + '</div></div>'
          ).join("")
        : '<div class="muted">' + (uiLanguage === "zh" ? "暂无研报历史（需 D1）" : "No research runs yet (needs D1)") + '</div>';
    }`;

const style = `
    .intel-grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    #continuitySummary ul {
      margin: 8px 0 0;
      padding-left: 18px;
    }
    @media (max-width: 900px) {
      .intel-grid { grid-template-columns: 1fr; }
    }`;

const script = `<script id="globalpulse-intel-enhance">
(function(){
  function textZh(){ return document.documentElement.lang !== 'en'; }
  function sync(){
    var a=document.getElementById('refreshContinuityButton');
    if(a) a.textContent=textZh()?'刷新对比':'Refresh continuity';
    var b=document.getElementById('saveAutopilotButton');
    if(b) b.textContent=textZh()?'保存雷达':'Save radar';
    var c=document.getElementById('scanAutopilotButton');
    if(c) c.textContent=textZh()?'立即扫描':'Scan now';
    var d=document.getElementById('refreshResearchRunsButton');
    if(d) d.textContent=textZh()?'刷新历史':'Refresh history';
  }
  document.addEventListener('DOMContentLoaded', sync);
  setInterval(sync, 1600);
})();
</script>`;
