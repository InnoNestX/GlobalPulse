import { afterEach, describe, expect, it, vi } from "vitest";
import { saveSettings } from "../src/config";
import type { Env } from "../src/env";
import { handleRequest } from "../src/http";
import { runDueSchedules } from "../src/scheduler";

const env: Env = {
  API_TOKEN: "test-token",
  DEFAULT_TARGETS: "feishu",
  FEISHU_WEBHOOK_URL: "https://open.feishu.cn/open-apis/bot/v2/hook/test-token",
};

function createMemoryKV(): KVNamespace {
  const store = new Map<string, string>();

  return {
    async get(key: string, type?: "text" | "json") {
      const value = store.get(key) ?? null;

      if (value === null) {
        return null;
      }

      return type === "json" ? JSON.parse(value) : value;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
  } as unknown as KVNamespace;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function getFetchCall(fetchMock: ReturnType<typeof vi.fn>, index: number): [string, RequestInit] {
  const call = fetchMock.mock.calls[index];

  expect(call).toBeDefined();

  return call as unknown as [string, RequestInit];
}

describe("handleRequest", () => {
  it("returns health without authentication", async () => {
    const response = await handleRequest(new Request("https://worker.example/health"), {});

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("rejects unauthenticated message requests", async () => {
    const response = await handleRequest(new Request("https://worker.example/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Hello",
        body: "World",
      }),
    }), env);

    expect(response.status).toBe(401);
  });

  it("sends a message to the default Feishu target", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ code: 0, msg: "ok" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleRequest(new Request("https://worker.example/v1/messages", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Deploy finished",
        body: "main deployed",
        level: "success",
        tags: ["ci"],
      }),
    }), env);

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      delivered: 1,
      failed: 0,
    });
    expect(fetchMock).toHaveBeenCalledWith("https://open.feishu.cn/open-apis/bot/v2/hook/test-token", expect.objectContaining({
      method: "POST",
    }));
    const [, init] = getFetchCall(fetchMock, 0);
    const payload = JSON.parse(String(init.body));

    expect(payload.msg_type).toBe("text");
    expect(payload.content.text).toContain("Deploy finished");
  });

  it("validates target names", async () => {
    const response = await handleRequest(new Request("https://worker.example/v1/messages", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: "unknown",
        title: "Deploy finished",
        body: "main deployed",
      }),
    }), env);

    expect(response.status).toBe(400);
  });

  it("normalizes GitHub Actions events", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ code: 0, msg: "ok" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleRequest(new Request("https://worker.example/v1/events/github-actions", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repository: "example/globalpulse",
        workflow: "CI",
        run_number: 42,
        conclusion: "failure",
        run_url: "https://github.com/example/globalpulse/actions/runs/42",
      }),
    }), env);

    expect(response.status).toBe(202);
    const [, init] = getFetchCall(fetchMock, 0);
    const payload = JSON.parse(String(init.body));

    expect(payload.content.text).toContain("GitHub Actions: CI");
    expect(payload.content.text).toContain("Conclusion: failure");
    expect(payload.content.text).toContain("example/globalpulse");
  });

  it("normalizes Cloudflare edge events", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ code: 0, msg: "ok" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const request = new Request("https://worker.example/v1/events/cloudflare", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: "feishu",
        title: "Edge check",
      }),
    });
    Object.defineProperty(request, "cf", {
      value: {
        colo: "HKG",
        country: "HK",
        httpProtocol: "HTTP/3",
      },
    });

    const response = await handleRequest(request, env);

    expect(response.status).toBe(202);
    const [, init] = getFetchCall(fetchMock, 0);
    const payload = JSON.parse(String(init.body));

    expect(payload.content.text).toContain("Edge check");
    expect(payload.content.text).toContain("HKG");
    expect(payload.content.text).toContain("cloudflare");
  });

  it("sends messages to the wechat clawbot webhook", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ errcode: 0, errmsg: "ok" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleRequest(new Request("https://worker.example/v1/messages", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: "wechat_clawbot",
        title: "clawbot check",
        body: "Webhook delivery works",
      }),
    }), {
      ...env,
      WECHAT_CLAWBOT_WEBHOOK_KEY: "wechat-key",
    });

    expect(response.status).toBe(202);
    const [url, init] = getFetchCall(fetchMock, 0);
    const payload = JSON.parse(String(init.body));

    expect(url).toBe("https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=wechat-key");
    expect(payload.msgtype).toBe("markdown");
    expect(payload.markdown.content).toContain("clawbot check");
  });

  it("keeps the legacy WeChat AI target as a wechat clawbot alias", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ errcode: 0, errmsg: "ok" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleRequest(new Request("https://worker.example/v1/messages", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: "wechat_ai_agent",
        title: "Legacy alias check",
        body: "Old configs still work",
      }),
    }), {
      ...env,
      WECHAT_AI_AGENT_WEBHOOK_KEY: "legacy-key",
    });

    expect(response.status).toBe(202);
    const [url] = getFetchCall(fetchMock, 0);

    expect(url).toBe("https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=legacy-key");
  });

  it("sends messages to Telegram", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleRequest(new Request("https://worker.example/v1/messages", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: "telegram",
        title: "Telegram check",
        body: "Bot delivery works",
      }),
    }), {
      ...env,
      TELEGRAM_BOT_TOKEN: "telegram-token",
      TELEGRAM_CHAT_ID: "-100123456",
    });

    expect(response.status).toBe(202);
    const [url, init] = getFetchCall(fetchMock, 0);
    const payload = JSON.parse(String(init.body));

    expect(url).toBe("https://api.telegram.org/bottelegram-token/sendMessage");
    expect(payload.chat_id).toBe("-100123456");
    expect(payload.text).toContain("Telegram check");
  });

  it("sends customer-service messages through WeChat Official Account", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.startsWith("https://api.weixin.qq.com/cgi-bin/token")) {
        return new Response(JSON.stringify({ access_token: "access-token", expires_in: 7200 }), { status: 200 });
      }

      return new Response(JSON.stringify({ errcode: 0, errmsg: "ok" }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleRequest(new Request("https://worker.example/v1/messages", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: "wechat_official_account",
        title: "Official Account check",
        body: "Customer-service delivery works",
      }),
    }), {
      ...env,
      WECHAT_OFFICIAL_APP_ID: "appid",
      WECHAT_OFFICIAL_APP_SECRET: "secret",
      WECHAT_OFFICIAL_OPENID: "openid",
    });

    expect(response.status).toBe(202);
    const [, init] = getFetchCall(fetchMock, 1);
    const payload = JSON.parse(String(init.body));

    expect(payload.touser).toBe("openid");
    expect(payload.msgtype).toBe("text");
    expect(payload.text.content).toContain("Official Account check");
  });

  it("serves protected admin settings from KV", async () => {
    const appEnv: Env = {
      ...env,
      ADMIN_PASSWORD: "admin-pass",
      APP_KV: createMemoryKV(),
    };

    const login = await handleRequest(new Request("https://worker.example/api/admin/login", {
      method: "POST",
      headers: {
        Authorization: "Bearer admin-pass",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: "admin-pass" }),
    }), appEnv);
    const settings = await handleRequest(new Request("https://worker.example/api/admin/settings", {
      headers: {
        Authorization: "Bearer admin-pass",
      },
    }), appEnv);

    expect(login.status).toBe(200);
    expect(settings.status).toBe(200);
    await expect(settings.json()).resolves.toMatchObject({
      settings: {
        appName: "GlobalPulse",
      },
    });
  });

  it("uses provider settings saved in KV for Telegram delivery", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, result: { message_id: 7 } }), { status: 200 }));
    const appEnv: Env = {
      API_TOKEN: "test-token",
      DEFAULT_TARGETS: "telegram",
      APP_KV: createMemoryKV(),
    };
    vi.stubGlobal("fetch", fetchMock);
    await saveSettings(appEnv, {
      appName: "GlobalPulse",
      language: "zh",
      timezone: "Asia/Hong_Kong",
      defaultTargets: ["telegram"],
      outputFormat: "markdown",
      topicFocus: "markets",
      providerSettings: {
        telegramBotToken: "kv-telegram-token",
        telegramChatId: "-100777",
      },
      template: "# Brief\n\n{{itemsMarkdown}}",
      schedules: [],
    });

    const response = await handleRequest(new Request("https://worker.example/v1/messages", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "KV Telegram check",
        body: "Provider settings are applied",
      }),
    }), appEnv);

    expect(response.status).toBe(202);
    const [url, init] = getFetchCall(fetchMock, 0);
    const payload = JSON.parse(String(init.body));

    expect(url).toBe("https://api.telegram.org/botkv-telegram-token/sendMessage");
    expect(payload.chat_id).toBe("-100777");
  });

  it("returns a provider-specific admin message preview", async () => {
    const appEnv: Env = {
      ...env,
      ADMIN_PASSWORD: "admin-pass",
      APP_KV: createMemoryKV(),
    };

    const response = await handleRequest(new Request("https://worker.example/api/admin/preview", {
      method: "POST",
      headers: {
        Authorization: "Bearer admin-pass",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        schedule: {
          id: "preview",
          name: "Preview Pulse",
          enabled: true,
          time: "09:00",
          days: [1, 2, 3, 4, 5],
          timezone: "Asia/Hong_Kong",
          language: "zh",
          outputFormat: "markdown",
          targets: ["telegram", "wechat_clawbot"],
          marketCalendar: "a_share",
          tradingDaySource: "external",
          marketHolidayDates: [],
          topicQuery: "global markets",
          template: "# Demo\n\n{{itemsMarkdown}}",
        },
      }),
    }), appEnv);

    expect(response.status).toBe(200);
    const body = await response.json() as {
      preview: {
        deliveries: Array<{ label: string; format: string; content: string }>;
      };
    };

    expect(body.preview.deliveries).toHaveLength(2);
    const telegramPreview = body.preview.deliveries[0];
    const clawbotPreview = body.preview.deliveries[1];

    expect(telegramPreview).toMatchObject({ label: "Telegram", format: "text" });
    expect(clawbotPreview).toMatchObject({ label: "wechat clawbot", format: "markdown" });
    expect(telegramPreview?.content).toContain("美联储");
  });

  it("runs due schedules using the saved timezone and pushes a digest", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.startsWith("https://news.google.com/rss/search")) {
        return new Response([
          "<rss><channel><item>",
          "<title>Markets rally on policy hopes</title>",
          "<link>https://example.com/markets</link>",
          "<source>Example News</source>",
          "</item></channel></rss>",
        ].join(""), { status: 200 });
      }

      return new Response(JSON.stringify({ code: 0, msg: "ok" }), { status: 200 });
    });
    const appEnv: Env = {
      ...env,
      APP_KV: createMemoryKV(),
    };
    vi.stubGlobal("fetch", fetchMock);
    await saveSettings(appEnv, {
      appName: "GlobalPulse",
      language: "en",
      timezone: "UTC",
      defaultTargets: ["feishu"],
      outputFormat: "markdown",
      topicFocus: "markets",
      template: "# Brief\n\n{{itemsMarkdown}}",
      schedules: [{
        id: "utc-noon",
        name: "UTC Noon",
        enabled: true,
        time: "12:00",
        days: [1],
        timezone: "UTC",
        language: "en",
        outputFormat: "markdown",
        targets: ["feishu"],
        topicQuery: "markets",
        template: "# Brief\n\n{{itemsMarkdown}}",
      }],
    });

    const result = await runDueSchedules(appEnv, new Date("2026-05-11T12:00:00Z"));

    expect(result.executed).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith("https://open.feishu.cn/open-apis/bot/v2/hook/test-token", expect.objectContaining({
      method: "POST",
    }));
    const [, init] = fetchMock.mock.calls.find((call) => call[0] === "https://open.feishu.cn/open-apis/bot/v2/hook/test-token") as unknown as [string, RequestInit];
    const payload = JSON.parse(String(init.body));

    expect(payload.content.text).toContain("Markets rally");
  });

  it("skips A-share schedules on non-trading weekends", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ code: 0, msg: "ok" }), { status: 200 }));
    const appEnv: Env = {
      ...env,
      APP_KV: createMemoryKV(),
    };
    vi.stubGlobal("fetch", fetchMock);
    await saveSettings(appEnv, {
      appName: "GlobalPulse",
      language: "zh",
      timezone: "Asia/Hong_Kong",
      defaultTargets: ["feishu"],
      outputFormat: "markdown",
      topicFocus: "markets",
      template: "# Brief\n\n{{itemsMarkdown}}",
      schedules: [{
        id: "a-share-weekend",
        name: "A-share Weekend",
        enabled: true,
        time: "10:00",
        days: [6],
        timezone: "Asia/Hong_Kong",
        language: "zh",
        outputFormat: "markdown",
        targets: ["feishu"],
        marketCalendar: "a_share",
        marketHolidayDates: [],
        topicQuery: "markets",
        template: "# Brief\n\n{{itemsMarkdown}}",
      }],
    });

    const result = await runDueSchedules(appEnv, new Date("2026-05-16T02:00:00Z"));

    expect(result).toMatchObject({ checked: 1, executed: 0, skipped: 1 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips A-share schedules on weekday holidays from the external calendar", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      code: 0,
      holiday: { holiday: true },
      type: { type: 2 },
    }), { status: 200 }));
    const appEnv: Env = {
      ...env,
      APP_KV: createMemoryKV(),
    };
    vi.stubGlobal("fetch", fetchMock);
    await saveSettings(appEnv, {
      appName: "GlobalPulse",
      language: "zh",
      timezone: "Asia/Hong_Kong",
      defaultTargets: ["feishu"],
      outputFormat: "markdown",
      topicFocus: "markets",
      template: "# Brief\n\n{{itemsMarkdown}}",
      schedules: [{
        id: "a-share-holiday",
        name: "A-share Holiday",
        enabled: true,
        time: "10:00",
        days: [5],
        timezone: "Asia/Hong_Kong",
        language: "zh",
        outputFormat: "markdown",
        targets: ["feishu"],
        marketCalendar: "a_share",
        tradingDaySource: "external",
        marketHolidayDates: [],
        topicQuery: "markets",
        template: "# Brief\n\n{{itemsMarkdown}}",
      }],
    });

    const result = await runDueSchedules(appEnv, new Date("2026-05-01T02:00:00Z"));

    expect(result).toMatchObject({ checked: 1, executed: 0, skipped: 1 });
    expect(fetchMock).toHaveBeenCalledWith("https://timor.tech/api/holiday/info/2026-05-01", expect.any(Object));
  });

  it("skips US stock schedules on US market holidays separately from A-share rules", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([
      { date: "2026-07-03", name: "Independence Day" },
    ]), { status: 200 }));
    const appEnv: Env = {
      ...env,
      APP_KV: createMemoryKV(),
    };
    vi.stubGlobal("fetch", fetchMock);
    await saveSettings(appEnv, {
      appName: "GlobalPulse",
      language: "en",
      timezone: "America/New_York",
      defaultTargets: ["feishu"],
      outputFormat: "markdown",
      topicFocus: "markets",
      template: "# Brief\n\n{{itemsMarkdown}}",
      schedules: [{
        id: "us-stock-holiday",
        name: "US Stock Holiday",
        enabled: true,
        time: "09:30",
        days: [5],
        timezone: "America/New_York",
        language: "en",
        outputFormat: "markdown",
        targets: ["feishu"],
        marketCalendar: "us_stock",
        tradingDaySource: "external",
        marketHolidayDates: [],
        topicQuery: "markets",
        template: "# Brief\n\n{{itemsMarkdown}}",
      }],
    });

    const result = await runDueSchedules(appEnv, new Date("2026-07-03T13:30:00Z"));

    expect(result).toMatchObject({ checked: 1, executed: 0, skipped: 1 });
    expect(fetchMock).toHaveBeenCalledWith("https://date.nager.at/api/v3/PublicHolidays/2026/US", expect.any(Object));
  });
});
