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

  it("serves the original project logo as a png asset", async () => {
    const response = await handleRequest(new Request("https://worker.example/assets/globalpulse-project-logo.png?v=test"), {});

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toContain("max-age=31536000");
    expect(Array.from(new Uint8Array(await response.arrayBuffer()).slice(0, 8))).toEqual([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
    ]);
  });

  it("keeps the legacy svg logo URL on the original png image", async () => {
    const response = await handleRequest(new Request("https://worker.example/assets/globalpulse-project-logo.svg"), {});

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
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
    expect(payload.content.text).toContain("HTTP/3");
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
    expect(payload.parse_mode).toBe("HTML");
    expect(payload.text).not.toContain("Sources:");
    expect(payload.text).not.toContain("Tags:");
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

  it("serves admin settings without KV binding", async () => {
    const appEnv: Env = {
      ...env,
      ADMIN_PASSWORD: "admin-pass",
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

  it("rejects cron schedules that cannot be triggered by 5-minute polling", async () => {
    const appEnv: Env = {
      ...env,
      ADMIN_PASSWORD: "admin-pass",
      APP_KV: createMemoryKV(),
    };

    const response = await handleRequest(new Request("https://worker.example/api/admin/settings", {
      method: "PUT",
      headers: {
        Authorization: "Bearer admin-pass",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        appName: "GlobalPulse",
        language: "zh",
        timezone: "Asia/Hong_Kong",
        defaultTargets: ["feishu"],
        outputFormat: "markdown",
        topicFocus: "markets",
        providerSettings: {},
        template: "# Brief\\n\\n{{itemsMarkdown}}",
        schedules: [{
          id: "cron-invalid",
          name: "Invalid Cron",
          enabled: true,
          triggerMode: "cron",
          cronExpression: "1 * * * *",
          time: "09:00",
          days: [1, 2, 3, 4, 5],
          timezone: "Asia/Hong_Kong",
          language: "zh",
          outputFormat: "markdown",
          targets: ["feishu"],
          topicQuery: "markets",
          template: "# Brief\\n\\n{{itemsMarkdown}}",
        }],
      }),
    }), appEnv);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("5-minute"),
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
    const fetchMock = vi.fn(async () => {
      throw new Error("network disabled in test");
    });
    vi.stubGlobal("fetch", fetchMock);

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
        sourceStatus: string;
        sourceMessage: string;
        deliveries: Array<{ label: string; format: string; content: string }>;
      };
    };

    expect(body.preview.sourceStatus).toBe("fallback");
    expect(body.preview.sourceMessage).toContain("回退");
    expect(body.preview.deliveries).toHaveLength(2);
    const telegramPreview = body.preview.deliveries[0];
    const clawbotPreview = body.preview.deliveries[1];

    expect(telegramPreview).toMatchObject({ label: "Telegram", format: "text" });
    expect(clawbotPreview).toMatchObject({ label: "wechat clawbot", format: "markdown" });
    expect(telegramPreview?.content).toContain("🔗");
  });

  it("renders daily hot preview as 4 international, 4 domestic, 3 hot-search, and 1 top topic", async () => {
    const appEnv: Env = {
      ...env,
      ADMIN_PASSWORD: "admin-pass",
      APP_KV: createMemoryKV(),
    };
    const rss = (items: Array<{ title: string; link: string; source: string }>) => new Response([
      "<rss><channel>",
      ...items.map((item) => [
        "<item>",
        `<title>${item.title}</title>`,
        `<link>${item.link}</link>`,
        `<source>${item.source}</source>`,
        "<pubDate>Sun, 17 May 2026 08:00:00 GMT</pubDate>",
        "</item>",
      ].join("")),
      "</channel></rss>",
    ].join(""), { status: 200 });
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? (input instanceof Request ? input.method : "GET");

      if (method === "HEAD" && url.startsWith("https://news.example.test/")) {
        return new Response(null, { status: 200 });
      }

      if (url.startsWith("https://news.google.com/rss/search")) {
        const query = new URL(url).searchParams.get("q") ?? "";
        if (/site:weibo|site:douyin|知乎热榜|小红书|百度 热搜/i.test(query)) {
          return rss([
            { title: "全网热度第一：AI产品安全讨论热度破亿", link: "https://news.example.test/platform-top", source: "微博热搜" },
            { title: "微博热搜：民生服务新规引发讨论", link: "https://news.example.test/platform-1", source: "微博热搜" },
            { title: "抖音热榜：消费补贴政策受到关注", link: "https://news.example.test/platform-2", source: "抖音热榜" },
            { title: "微博热议：科技创新议题进入热榜", link: "https://news.example.test/platform-3", source: "微博热搜" },
          ]);
        }
        if (/中国|China policy|site:rthk|site:scmp/i.test(query)) {
          return rss([
            { title: "中国就业政策调整释放稳民生信号", link: "https://news.example.test/domestic-1", source: "SCMP" },
            { title: "国内消费数据改善带动财经讨论", link: "https://news.example.test/domestic-2", source: "Reuters" },
            { title: "多地公共服务改革聚焦医疗和教育", link: "https://news.example.test/domestic-3", source: "RTHK" },
            { title: "中国资本市场改革议题继续升温", link: "https://news.example.test/domestic-4", source: "Bloomberg" },
          ]);
        }
        return rss([
          { title: "全球局势关注中东停火谈判进展", link: "https://news.example.test/global-1", source: "Reuters" },
          { title: "国际经济讨论聚焦主要央行利率路径", link: "https://news.example.test/global-2", source: "AP News" },
          { title: "全球重大公共事件推动公共卫生协作", link: "https://news.example.test/global-3", source: "BBC" },
          { title: "AI供应链成为全球产业政策重点", link: "https://news.example.test/global-4", source: "Financial Times" },
        ]);
      }

      return new Response("ok", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleRequest(new Request("https://worker.example/api/admin/preview", {
      method: "POST",
      headers: {
        Authorization: "Bearer admin-pass",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        schedule: {
          id: "daily-hot-preview",
          name: "每日热点",
          enabled: true,
          time: "09:00",
          days: [0, 1, 2, 3, 4, 5, 6],
          timezone: "Asia/Hong_Kong",
          language: "zh",
          outputFormat: "markdown",
          reportType: "daily_hot",
          targets: ["feishu"],
          marketCalendar: "everyday",
          tradingDaySource: "weekday",
          marketHolidayDates: [],
          topicQuery: "全球热点 国际新闻 国内新闻 微博热搜 抖音热榜",
          template: "# Demo\n\n{{itemsMarkdown}}",
        },
      }),
    }), appEnv);

    expect(response.status).toBe(200);
    const body = await response.json() as {
      preview: {
        body: string;
        sourceStatus: string;
      };
    };
    const previewBody = body.preview.body;
    const countItems = (section: string): number => section.match(/^\d+\. \*\*/gm)?.length ?? 0;
    const between = (start: string, end: string): string => previewBody.split(start)[1]?.split(end)[0] ?? "";

    expect(body.preview.sourceStatus).toBe("live");
    expect(countItems(between("## 🌍 国际要闻", "## 🇨🇳 国内热点"))).toBe(4);
    expect(countItems(between("## 🇨🇳 国内热点", "## 🔥 全网热搜精选"))).toBe(4);
    const hotSearchSection = between("## 🔥 全网热搜精选", "## 📌 全网热度最高话题");
    const topTopicSection = between("## 📌 全网热度最高话题", "## 🧭 后续观察方向");
    expect(countItems(hotSearchSection)).toBe(3);
    expect(countItems(topTopicSection)).toBe(1);
    expect(hotSearchSection).not.toContain("全网热度第一");
    expect(topTopicSection).toContain("全网热度第一");
    expect(previewBody).not.toContain("Reuters");
    expect(previewBody).not.toContain("微博热搜 —");
    expect(previewBody).not.toContain("example.com");
  });

  it("keeps ordered email list numbers increasing when items have observation lines", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ messageId: "email-1" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleRequest(new Request("https://worker.example/v1/messages", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: "email",
        title: "Daily hot numbering",
        body: [
          "## 测试",
          "1. **第一条** [🔗](https://news.example.test/1)",
          "   观察点：第一条续行。",
          "2. **第二条** [🔗](https://news.example.test/2)",
          "   观察点：第二条续行。",
          "3. **第三条** [🔗](https://news.example.test/3)",
          "   观察点：第三条续行。",
        ].join("\n"),
      }),
    }), {
      ...env,
      DEFAULT_TARGETS: "email",
      BREVO_API_KEY: "brevo-key",
      EMAIL_FROM: "GlobalPulse <noreply@example.test>",
      EMAIL_TO: "reader@example.test",
    });

    expect(response.status).toBe(202);
    const [, init] = getFetchCall(fetchMock, 0);
    const payload = JSON.parse(String(init.body)) as { htmlContent: string };

    expect(payload.htmlContent).toContain(">1.</span>");
    expect(payload.htmlContent).toContain(">2.</span>");
    expect(payload.htmlContent).toContain(">3.</span>");
    expect(payload.htmlContent).toContain("观察点：第二条续行。");
  });

  it("runs admin test send without KV when schedule payload is provided", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url === "https://example.com/custom-rss.xml") {
        return new Response([
          "<rss><channel><item>",
          "<title>Custom topic headline</title>",
          "<link>https://example.com/topic</link>",
          "</item></channel></rss>",
        ].join(""), { status: 200 });
      }

      return new Response(JSON.stringify({ code: 0, msg: "ok" }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const appEnv: Env = {
      ...env,
      ADMIN_PASSWORD: "admin-pass",
    };

    const response = await handleRequest(new Request("https://worker.example/api/admin/run", {
      method: "POST",
      headers: {
        Authorization: "Bearer admin-pass",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        schedule: {
          id: "manual-run",
          name: "Manual Run",
          enabled: true,
          time: "09:00",
          days: [1, 2, 3, 4, 5],
          timezone: "UTC",
          language: "en",
          outputFormat: "markdown",
          targets: ["feishu"],
          marketCalendar: "everyday",
          tradingDaySource: "weekday",
          marketHolidayDates: [],
          topicQuery: "markets",
          sourceUrl: "https://example.com/custom-rss.xml",
          template: "# Brief\\n\\n{{itemsMarkdown}}",
        },
      }),
    }), appEnv);

    expect(response.status).toBe(202);
    expect(fetchMock).toHaveBeenCalledWith("https://open.feishu.cn/open-apis/bot/v2/hook/test-token", expect.objectContaining({
      method: "POST",
    }));
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

  it("keeps daily hot cron fetches under the free Worker subrequest budget", async () => {
    const translationSeparator = "1234567890GLOBALPULSE9876543210";
    const rss = (prefix: string, source: string) => new Response([
      "<rss><channel>",
      ...Array.from({ length: 8 }, (_, index) => [
        "<item>",
        `<title>${prefix} policy inflation topic ${index + 1}</title>`,
        `<link>https://news.example.test/${prefix}-${index + 1}</link>`,
        `<source>${source}</source>`,
        `<description>${prefix} summary for global pulse item ${index + 1}</description>`,
        "<pubDate>Mon, 18 May 2026 01:00:00 GMT</pubDate>",
        "</item>",
      ].join("")),
      "</channel></rss>",
    ].join(""), { status: 200 });
    const newsApiPayload = (prefix: string) => new Response(JSON.stringify({
      articles: Array.from({ length: 8 }, (_, index) => ({
        title: `${prefix} policy inflation article ${index + 1}`,
        description: `${prefix} summary for article ${index + 1}`,
        url: `https://news.example.test/${prefix}-article-${index + 1}`,
        publishedAt: "2026-05-18T01:00:00Z",
        source: { name: "NewsAPI Test" },
      })),
    }), { status: 200 });
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? (input instanceof Request ? input.method : "GET");

      if (method === "HEAD" && url.startsWith("https://news.example.test/")) {
        return new Response(null, { status: 200 });
      }

      if (url.startsWith("https://translate.googleapis.com/translate_a/single")) {
        const q = new URL(url).searchParams.get("q") ?? "";
        const translated = q.includes(translationSeparator)
          ? `已翻译标题\n${translationSeparator}\n已翻译摘要`
          : "已翻译标题";
        return new Response(JSON.stringify([[[translated]]]), { status: 200 });
      }

      if (url.startsWith("https://newsapi.org/v2/everything")) {
        return newsApiPayload("global");
      }

      if (url.startsWith("https://newsapi.org/v2/top-headlines")) {
        return newsApiPayload("headline");
      }

      if (url.startsWith("https://news.google.com/rss/search")) {
        const query = new URL(url).searchParams.get("q") ?? "";
        if (/weibo|douyin|热搜|热榜/i.test(query)) {
          return rss("platform", "微博热搜");
        }
        if (/中国|China policy|site:rthk|site:scmp/i.test(query)) {
          return rss("domestic", "Reuters");
        }
        return rss("global", "AP News");
      }

      return new Response(JSON.stringify({ code: 0, msg: "ok" }), { status: 200 });
    });
    const appEnv: Env = {
      ...env,
      APP_KV: createMemoryKV(),
      NEWSAPI_API_KEY: "newsapi-key",
    };
    vi.stubGlobal("fetch", fetchMock);
    await saveSettings(appEnv, {
      appName: "GlobalPulse",
      language: "zh",
      timezone: "Asia/Shanghai",
      defaultTargets: ["feishu"],
      outputFormat: "markdown",
      topicFocus: "全球热点",
      template: "# Brief\n\n{{itemsMarkdown}}",
      schedules: [{
        id: "daily-hot-cron",
        name: "每日热点",
        enabled: true,
        triggerMode: "cron",
        cronExpression: "0 10 * * *",
        time: "10:00",
        days: [0, 1, 2, 3, 4, 5, 6],
        timezone: "Asia/Shanghai",
        language: "zh",
        outputFormat: "markdown",
        reportType: "daily_hot",
        reportMode: "digest",
        targets: ["feishu"],
        marketCalendar: "everyday",
        tradingDaySource: "weekday",
        topicQuery: "全球热点 国际新闻 国内新闻 微博热搜 抖音热榜",
        template: "# Brief\n\n{{itemsMarkdown}}",
      }],
    });

    const result = await runDueSchedules(appEnv, new Date("2026-05-18T02:00:00Z"));
    const calls = fetchMock.mock.calls;
    const translateCalls = calls.filter((call) => String(call[0]).startsWith("https://translate.googleapis.com/translate_a/single"));
    const reachabilityCalls = calls.filter((call) => (call[1] as RequestInit | undefined)?.method === "HEAD");

    expect(result).toMatchObject({ checked: 1, executed: 1, skipped: 0 });
    expect(calls.length).toBeLessThan(50);
    expect(reachabilityCalls).toHaveLength(6);
    expect(translateCalls.length).toBeLessThanOrEqual(12);
    expect(fetchMock).toHaveBeenCalledWith("https://open.feishu.cn/open-apis/bot/v2/hook/test-token", expect.objectContaining({
      method: "POST",
    }));
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
