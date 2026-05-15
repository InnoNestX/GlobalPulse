export function renderMarketDataAdminUi(): Response {
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

const html = `<!doctype html>
<html lang="zh">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GlobalPulse Market Data Settings</title>
  <style>
    body { margin:0; min-height:100vh; background:#070b12; color:#f4f7fb; font:14px/1.5 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { width:min(760px, calc(100vw - 32px)); margin:0 auto; padding:32px 0; }
    .card { background:#0f1724; border:1px solid #263548; border-radius:14px; padding:22px; box-shadow:0 18px 60px rgba(0,0,0,.25); }
    h1 { margin:0 0 8px; font-size:24px; }
    p { color:#94a3b8; margin:0 0 18px; }
    label { display:grid; gap:6px; margin:14px 0; color:#cbd5e1; font-weight:700; font-size:13px; }
    input { width:100%; box-sizing:border-box; border:1px solid #263548; border-radius:9px; background:#141f2e; color:#f8fafc; padding:11px 12px; font:inherit; }
    button, a { display:inline-flex; align-items:center; justify-content:center; min-height:38px; padding:8px 13px; border-radius:9px; border:1px solid #263548; background:#2563eb; color:white; font-weight:800; text-decoration:none; cursor:pointer; }
    a { background:#141f2e; color:#f8fafc; margin-left:8px; }
    .row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:18px; }
    .status { min-height:22px; color:#94a3b8; margin-top:14px; }
    code { background:#141f2e; border:1px solid #263548; border-radius:6px; padding:1px 5px; }
  </style>
</head>
<body>
  <main>
    <section class="card">
      <h1>行情数据源配置</h1>
      <p>这些配置会保存到 KV，用于 Alpha Vantage、Finnhub、Twelve Data、CoinGecko 等可靠数据源。环境变量仍然优先，页面配置作为补充。</p>
      <label>Alpha Vantage API Key<input id="alphaVantageApiKey" type="password" autocomplete="off"></label>
      <label>Finnhub API Key<input id="finnhubApiKey" type="password" autocomplete="off"></label>
      <label>Twelve Data API Key<input id="twelveDataApiKey" type="password" autocomplete="off"></label>
      <label>CoinGecko API Key<input id="coingeckoApiKey" type="password" autocomplete="off"></label>
      <div class="row">
        <button id="saveButton">保存配置</button>
        <a href="/admin">返回主后台</a>
      </div>
      <div class="status" id="status"></div>
      <p style="margin-top:18px">接口：<code>GET /api/admin/market-data-settings</code>，<code>PUT /api/admin/market-data-settings</code></p>
    </section>
  </main>
  <script>
    let password = localStorage.getItem("globalpulse_admin_password") || "";
    if (!password) password = prompt("Admin password") || "";
    const fields = ["alphaVantageApiKey", "finnhubApiKey", "twelveDataApiKey", "coingeckoApiKey"];
    const statusEl = document.getElementById("status");
    async function api(path, options = {}) {
      const response = await fetch(path, {
        ...options,
        headers: { "Authorization": "Bearer " + password, "Content-Type": "application/json", ...(options.headers || {}) }
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || response.statusText);
      return body;
    }
    function mask(value) {
      if (!value) return "";
      return "••••••" + String(value).slice(-4);
    }
    async function load() {
      try {
        const body = await api("/api/admin/market-data-settings");
        const settings = body.settings || {};
        for (const key of fields) {
          const el = document.getElementById(key);
          el.value = mask(settings[key]);
          el.dataset.masked = settings[key] ? "1" : "0";
          el.addEventListener("focus", () => { if (el.dataset.masked === "1") { el.value = ""; el.dataset.masked = "0"; } });
        }
        statusEl.textContent = "已加载";
      } catch (error) {
        statusEl.textContent = "加载失败：" + error.message;
      }
    }
    async function save() {
      const payload = {};
      for (const key of fields) {
        const el = document.getElementById(key);
        if (el.dataset.masked !== "1") payload[key] = el.value.trim();
      }
      try {
        const current = await api("/api/admin/market-data-settings");
        await api("/api/admin/market-data-settings", { method: "PUT", body: JSON.stringify({ ...(current.settings || {}), ...payload }) });
        statusEl.textContent = "已保存";
        await load();
      } catch (error) {
        statusEl.textContent = "保存失败：" + error.message;
      }
    }
    document.getElementById("saveButton").addEventListener("click", save);
    load();
  </script>
</body>
</html>`;
