import { renderAdminUi } from "./admin-ui";

export async function renderAdminUiWithMarketDataSettings(): Promise<Response> {
  const response = renderAdminUi();
  const html = await response.text();
  return new Response(injectMarketDataSettings(html), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function injectMarketDataSettings(html: string): string {
  if (html.includes("globalpulse-market-data-settings-inline")) {
    return html;
  }
  return html.replace("</body>", `${inlineScript}</body>`);
}

const inlineScript = `<script id="globalpulse-market-data-settings-inline">
(function () {
  const fields = [
    ["alphaVantageApiKey", "Alpha Vantage API Key"],
    ["finnhubApiKey", "Finnhub API Key"],
    ["twelveDataApiKey", "Twelve Data API Key"],
    ["coingeckoApiKey", "CoinGecko API Key"]
  ];
  let inserted = false;
  let loaded = false;

  function getPassword() {
    return localStorage.getItem("globalpulse_admin_password") || "";
  }

  async function callMarketDataApi(path, options) {
    const response = await fetch(path, {
      ...(options || {}),
      headers: {
        "Authorization": "Bearer " + getPassword(),
        "Content-Type": "application/json",
        ...((options && options.headers) || {})
      }
    });
    const body = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(body.error || response.statusText);
    return body;
  }

  function mask(value) {
    const text = String(value || "");
    return text ? "••••••" + text.slice(-4) : "";
  }

  function ensureSection() {
    if (inserted || document.getElementById("marketDataSettingsInline")) {
      inserted = true;
      return;
    }
    const anchor = document.getElementById("researchSettingsForm");
    if (!anchor || !anchor.parentElement) return;

    const wrapper = document.createElement("details");
    wrapper.className = "collapsible-section";
    wrapper.id = "marketDataSettingsInline";
    wrapper.innerHTML =
      '<summary>' +
        '<span class="section-title"><span class="emoji">📈</span> <span>行情数据源</span></span>' +
        '<span class="chevron">▾</span>' +
      '</summary>' +
      '<div class="section-body stack">' +
        '<p class="muted">配置可靠行情数据源 API Key。环境变量优先，页面配置作为补充；当数据完整度低于 85% 时会继续切换更多数据源补齐。</p>' +
        '<div class="provider-config">' +
          '<h3><span>Market Data Providers</span><span class="badge">Alpha / Finnhub / Twelve / CoinGecko</span></h3>' +
          fields.map(function (item) {
            return '<label>' + item[1] + '<input type="password" autocomplete="off" spellcheck="false" data-market-data-setting="' + item[0] + '"></label>';
          }).join('') +
          '<div class="row"><button type="button" class="secondary" id="loadMarketDataSettingsButton">刷新行情配置</button><button type="button" class="primary" id="saveMarketDataSettingsButton">保存行情配置</button><span class="status" id="marketDataSettingsStatus"></span></div>' +
        '</div>' +
      '</div>';

    anchor.insertAdjacentElement("afterend", wrapper);
    inserted = true;

    document.querySelectorAll("[data-market-data-setting]").forEach(function (node) {
      node.addEventListener("focus", function () {
        if (node.dataset.masked === "1") {
          node.value = "";
          node.dataset.masked = "0";
        }
      });
    });
    document.getElementById("loadMarketDataSettingsButton").addEventListener("click", loadSettings);
    document.getElementById("saveMarketDataSettingsButton").addEventListener("click", saveSettings);
  }

  async function loadSettings() {
    ensureSection();
    if (!inserted || !getPassword()) return;
    const status = document.getElementById("marketDataSettingsStatus");
    try {
      const body = await callMarketDataApi("/api/admin/market-data-settings");
      const settings = body.settings || {};
      fields.forEach(function (item) {
        const key = item[0];
        const node = document.querySelector('[data-market-data-setting="' + key + '"]');
        if (!node) return;
        node.value = mask(settings[key]);
        node.dataset.masked = settings[key] ? "1" : "0";
      });
      loaded = true;
      if (status) status.textContent = "行情配置已加载";
    } catch (error) {
      if (status) status.textContent = "行情配置加载失败：" + (error && error.message ? error.message : String(error));
    }
  }

  async function saveSettings() {
    ensureSection();
    const status = document.getElementById("marketDataSettingsStatus");
    try {
      const current = await callMarketDataApi("/api/admin/market-data-settings");
      const next = { ...(current.settings || {}) };
      fields.forEach(function (item) {
        const key = item[0];
        const node = document.querySelector('[data-market-data-setting="' + key + '"]');
        if (!node || node.dataset.masked === "1") return;
        next[key] = node.value.trim();
      });
      await callMarketDataApi("/api/admin/market-data-settings", { method: "PUT", body: JSON.stringify(next) });
      if (status) status.textContent = "行情配置已保存";
      await loadSettings();
    } catch (error) {
      if (status) status.textContent = "行情配置保存失败：" + (error && error.message ? error.message : String(error));
    }
  }

  function tick() {
    ensureSection();
    const adminView = document.getElementById("adminView");
    if (inserted && !loaded && adminView && !adminView.classList.contains("hidden") && getPassword()) {
      loadSettings();
    }
  }

  document.addEventListener("DOMContentLoaded", tick);
  setInterval(tick, 1000);
})();
</script>`;
