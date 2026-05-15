import { renderAdminUi } from "./admin-ui";

export async function renderAdminUiWithSystemSections(): Promise<Response> {
  const response = renderAdminUi();
  const html = await response.text();
  return new Response(enhanceAdminHtml(html), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function enhanceAdminHtml(html: string): string {
  return html
    .replace(
      '<div class="provider-form" id="researchSettingsForm"></div>',
      '<details class="collapsible-section" id="researchEngineSettings"><summary><span class="section-title"><span class="emoji">🧠</span> <span>研究引擎</span></span><span class="chevron">▾</span></summary><div class="section-body stack"><div class="provider-form" id="researchSettingsForm"></div></div></details><details class="collapsible-section" id="marketDataProviderSettings"><summary><span class="section-title"><span class="emoji">📈</span> <span>行情/宏观数据源</span></span><span class="chevron">▾</span></summary><div class="section-body stack"><div class="provider-form" id="marketDataSettingsForm"></div></div></details>',
    )
    .replace(oldRenderResearchSettings, newRenderResearchSettings)
    .replace('renderResearchSettings();\n      renderProviderExtras();', 'renderResearchSettings();\n      renderMarketDataSettings();\n      renderProviderExtras();');
}

const oldRenderResearchSettings = `    function renderResearchSettings() {
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
    }`;

const newRenderResearchSettings = `    function renderResearchSettings() {
      const values = state.providerSettings || {};
      const fields = [
        ["geminiApiKey", t("geminiApiKey"), "password"],
        ["geminiBaseUrl", t("geminiBaseUrl"), "text"],
        ["geminiModel", t("geminiModel"), "text"],
        ["workersAiModel", t("workersAiModel"), "text"]
      ];
      $("researchSettingsForm").innerHTML = '<div class="provider-config"><h3><span>' + t("researchEngine") + '</span><span class="badge">Gemini / Workers AI</span></h3>' +
        '<p class="muted">' + t("researchHelp") + '</p>' +
        fields.map(([key, label, type]) => renderMaskedProviderField(values, key, label, type)).join("") + '</div>';
    }

    function renderMarketDataSettings() {
      const values = state.providerSettings || {};
      const fields = [
        ["alphaVantageApiKey", t("alphaVantageApiKey"), "password"],
        ["finnhubApiKey", "Finnhub API Key", "password"],
        ["twelveDataApiKey", "Twelve Data API Key", "password"],
        ["coingeckoApiKey", "CoinGecko API Key", "password"],
        ["fredApiKey", t("fredApiKey"), "password"],
        ["blsApiKey", t("blsApiKey"), "password"],
        ["beaApiKey", t("beaApiKey"), "password"]
      ];
      const form = $("marketDataSettingsForm");
      if (!form) return;
      form.innerHTML = '<div class="provider-config"><h3><span>行情/宏观数据源</span><span class="badge">Market / Macro</span></h3>' +
        '<p class="muted">配置行情与宏观数据源 API Key。环境变量优先，页面配置作为补充；数据完整度低于 85% 时会继续切换可用数据源补齐。</p>' +
        fields.map(([key, label, type]) => renderMaskedProviderField(values, key, label, type)).join("") + '</div>';
    }`;
