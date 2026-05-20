import { afterEach, describe, expect, it, vi } from "vitest";
import { saveSettings, type PulseSchedule } from "../src/config";
import type { Env } from "../src/env";
import { handleRequest } from "../src/http";
import { telegramProvider } from "../src/providers/telegram";
import { buildScheduleReport } from "../src/report";
import { runDueSchedules } from "../src/scheduler";
import { renderDigest } from "../src/template";

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
        body: "Bot delivery works\n\n1. **Headline** [🔗](https://news.example.test/story?ref=gp&item=1)",
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
    expect(payload.text).toContain("<b>Headline</b>");
    expect(payload.text).toContain("<a href=\"https://news.example.test/story?ref=gp&amp;item=1\">🔗</a>");
    expect(payload.text).not.toContain("[🔗](");
    expect(payload.text).not.toContain("**Headline**");
    expect(payload.text).not.toContain("Sources:");
    expect(payload.text).not.toContain("Tags:");
  });

  it("truncates Telegram HTML without cutting open tags", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const longBody = Array.from({ length: 260 }, (_, index) =>
      `${index + 1}. **很长标题${index + 1}** [查看原文](https://news.example.test/story-${index + 1}?ref=gp&item=${index + 1})`,
    ).join("\n");

    const result = await telegramProvider.send({
      title: "Telegram long brief",
      body: longBody,
      level: "info",
      actions: [],
      tags: [],
      metadata: {},
    }, {
      ...env,
      TELEGRAM_BOT_TOKEN: "telegram-token",
      TELEGRAM_CHAT_ID: "-100123456",
    });

    expect(result.ok).toBe(true);
    const [, init] = getFetchCall(fetchMock, 0);
    const payload = JSON.parse(String(init.body));
    const text = String(payload.text);

    expect(text.length).toBeLessThanOrEqual(4096);
    expect((text.match(/<a /g) ?? [])).toHaveLength((text.match(/<\/a>/g) ?? []).length);
    expect((text.match(/<b>/g) ?? [])).toHaveLength((text.match(/<\/b>/g) ?? []).length);
    expect(text).toContain("\n…");
    expect(text).not.toContain("[查看原文](");
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

  it("filters generic platform pages and avoids empty daily hot sections", async () => {
    const appEnv: Env = {
      ...env,
      ADMIN_PASSWORD: "admin-pass",
      APP_KV: createMemoryKV(),
      NEWSAPI_API_KEY: "newsapi-key",
    };
    const rss = (items: Array<{ title: string; link: string; source: string; description?: string }>) => new Response([
      "<rss><channel>",
      ...items.map((item) => [
        "<item>",
        `<title>${item.title}</title>`,
        `<link>${item.link}</link>`,
        `<source>${item.source}</source>`,
        item.description ? `<description>${item.description}</description>` : "",
        "<pubDate>Mon, 18 May 2026 01:00:00 GMT</pubDate>",
        "</item>",
      ].join("")),
      "</channel></rss>",
    ].join(""), { status: 200 });
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.startsWith("https://newsapi.org/v2/")) {
        return new Response(JSON.stringify({ articles: [] }), { status: 200 });
      }

      if (url.startsWith("https://news.google.com/rss/search")) {
        const query = new URL(url).searchParams.get("q") ?? "";
        if (/global breaking news/i.test(query)) {
          return rss([
            { title: "G7 leaders discuss tariff and security coordination", link: "https://news.example.test/global-1", source: "Reuters", description: "Policy coordination and security talks dominated the meeting agenda." },
            { title: "Central banks face renewed inflation pressure", link: "https://news.example.test/global-2", source: "AP News", description: "Markets repriced rate expectations after fresh inflation signals." },
            { title: "Energy supply risks rise after port disruption", link: "https://news.example.test/global-3", source: "BBC", description: "Shipping delays raised concerns over global energy supply chains.&nbsp;&nbsp;court.gov.cn" },
            { title: "AI chip export rules reshape supply chains", link: "https://news.example.test/global-4", source: "Bloomberg", description: "Technology policy continues to affect semiconductor flows." },
          ]);
        }
        if (/site:weibo|site:douyin|知乎热榜|小红书|百度 热搜/i.test(query)) {
          return rss([
            { title: "微博实时热点 - 微博", link: "https://news.example.test/weibo-hot-index", source: "微博", description: "微博实时热点 微博" },
            { title: "微博正文 - 微博", link: "https://news.example.test/weibo-ad", source: "微博" },
            { title: "2024年度回忆#抖音热点记忆2024 - 抖音", link: "https://news.example.test/douyin-memory", source: "抖音" },
            { title: "微博热搜：高考服务政策引发讨论破亿", link: "https://news.example.test/platform-1", source: "微博热搜", description: "民生政策话题进入高热讨论。" },
          ]);
        }
        if (/中国|China policy|site:rthk|site:scmp/i.test(query)) {
          return rss([
            { title: "国内消费补贴政策带动服务业讨论", link: "https://news.example.test/domestic-1", source: "Caixin", description: "消费政策和服务业复苏受到关注。" },
            { title: "多地推进公共服务改革", link: "https://news.example.test/domestic-2", source: "RTHK", description: "医疗、教育和城市治理成为政策焦点。" },
            { title: "全国助残日专场文艺演出举行", link: "https://news.example.test/domestic-low-1", source: "首都文明网", description: "文艺演出和志愿公益活动受到关注。" },
            { title: "上海博物馆联票发布吸引游客打卡", link: "https://news.example.test/domestic-low-2", source: "大洋网", description: "博物馆日和文旅活动成为本地话题。" },
          ]);
        }
        return rss([
          { title: "中国经济动能转换融资结构现新变化", link: "https://news.example.test/domestic-main", source: "凤凰网", description: "宏观政策和融资结构继续受到市场关注。" },
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
          id: "daily-hot-filter-preview",
          name: "每日热点",
          enabled: true,
          time: "10:00",
          days: [0, 1, 2, 3, 4, 5, 6],
          timezone: "Asia/Shanghai",
          language: "zh",
          outputFormat: "markdown",
          reportType: "daily_hot",
          targets: ["feishu"],
          marketCalendar: "everyday",
          tradingDaySource: "weekday",
          topicQuery: "全球热点 国际新闻 地缘政治 产业趋势 宏观政策",
          template: "# Demo\n\n{{itemsMarkdown}}",
        },
      }),
    }), appEnv);

    expect(response.status).toBe(200);
    const body = await response.json() as { preview: { body: string; sourceStatus: string } };
    const previewBody = body.preview.body;

    expect(body.preview.sourceStatus).toBe("live");
    expect(previewBody).not.toContain("暂无相关内容");
    expect(previewBody).not.toContain("NewsAPI");
    expect(previewBody).not.toContain("微博实时热点");
    expect(previewBody).not.toContain("微博正文");
    expect(previewBody).not.toContain("2024年度回忆");
    expect(previewBody).not.toContain("抖音热点记忆");
    expect(previewBody).not.toContain("court.gov.cn");
    expect(previewBody).not.toContain("&nbsp");
    expect(previewBody).not.toContain("助残日");
    expect(previewBody).not.toContain("博物馆联票");
    expect(previewBody).toContain("G7 leaders");
    expect(previewBody).toContain("高考服务政策");
    expect(previewBody).toContain("全网热度最高话题");
    const topTopicSection = previewBody.split("## 📌 全网热度最高话题")[1]?.split("## 🧩 补充要闻")[0] ?? "";
    expect(topTopicSection).toContain("高考服务政策");
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
    expect(reachabilityCalls).toHaveLength(0);
    expect(translateCalls.length).toBeLessThanOrEqual(12);
    expect(fetchMock).toHaveBeenCalledWith("https://open.feishu.cn/open-apis/bot/v2/hook/test-token", expect.objectContaining({
      method: "POST",
    }));
    const [, init] = fetchMock.mock.calls.find((call) => call[0] === "https://open.feishu.cn/open-apis/bot/v2/hook/test-token") as unknown as [string, RequestInit];
    const payload = JSON.parse(String(init.body));
    const itemCount = (String(payload.content.text).match(/^\d+\. \*\*/gm) ?? []).length;
    expect(itemCount).toBeGreaterThanOrEqual(10);
    expect(payload.content.text).not.toContain("暂无相关内容");
  });

  it("uses the last successful daily hot cache when cron live sources are empty", async () => {
    let liveSourcesAvailable = true;
    const rss = (items: Array<{ title: string; link: string; source: string; description: string }>) => new Response([
      "<rss><channel>",
      ...items.map((item) => [
        "<item>",
        `<title>${item.title}</title>`,
        `<link>${item.link}</link>`,
        `<source>${item.source}</source>`,
        `<description>${item.description}</description>`,
        "<pubDate>Wed, 20 May 2026 01:00:00 GMT</pubDate>",
        "</item>",
      ].join("")),
      "</channel></rss>",
    ].join(""), { status: 200 });
    const globalItems = [
      { title: "欧洲央行讨论通胀路径", link: "https://news.example.test/global-cache-1", source: "Reuters", description: "欧洲货币政策和通胀路径受到市场关注。" },
      { title: "中东停火谈判进入新阶段", link: "https://news.example.test/global-cache-2", source: "AP News", description: "地缘局势和能源市场继续受到影响。" },
      { title: "全球港口拥堵推高供应链风险", link: "https://news.example.test/global-cache-3", source: "BBC", description: "航运延误影响制造业供应链。" },
      { title: "AI芯片出口规则影响全球产业链", link: "https://news.example.test/global-cache-4", source: "Bloomberg", description: "半导体政策变化牵动科技公司供应。" },
    ];
    const domesticItems = [
      { title: "国内消费补贴政策带动服务业讨论", link: "https://news.example.test/domestic-cache-1", source: "Caixin", description: "消费政策和民生支出成为关注焦点。" },
      { title: "多地推进医疗公共服务改革", link: "https://news.example.test/domestic-cache-2", source: "RTHK", description: "医疗、教育和公共服务改革持续推进。" },
      { title: "资本市场监管新规引发机构解读", link: "https://news.example.test/domestic-cache-3", source: "SCMP", description: "监管政策影响市场预期。" },
      { title: "就业服务政策覆盖高校毕业生", link: "https://news.example.test/domestic-cache-4", source: "Nikkei Asia", description: "民生就业政策成为社会热点。" },
    ];
    const platformItems = [
      { title: "微博热搜：公共交通票价调整引发讨论", link: "https://news.example.test/platform-cache-1", source: "微博热搜", description: "多地公共交通票价和民生成本成为高热话题。" },
      { title: "抖音热榜：国产芯片发布带动科技讨论", link: "https://news.example.test/platform-cache-2", source: "抖音热榜", description: "科技产业链相关话题热度上升。" },
      { title: "微博热议：高考服务政策受到关注", link: "https://news.example.test/platform-cache-3", source: "微博热搜", description: "教育民生服务政策进入热搜讨论。" },
      { title: "百度热搜：暴雨天气影响城市出行", link: "https://news.example.test/platform-cache-4", source: "百度热搜", description: "公共安全和城市交通成为讨论焦点。" },
    ];
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url === "https://open.feishu.cn/open-apis/bot/v2/hook/test-token") {
        return new Response(JSON.stringify({ code: 0, msg: "ok" }), { status: 200 });
      }

      if (url.startsWith("https://newsapi.org/v2/")) {
        throw new Error("NewsAPI timed out");
      }

      if (!liveSourcesAvailable) {
        return new Response("", { status: 503 });
      }

      if (url.startsWith("https://news.google.com/rss/headlines/section/topic/WORLD")) {
        return rss(globalItems);
      }
      if (url.startsWith("https://news.google.com/rss/headlines/section/topic/NATION")) {
        return rss(domesticItems);
      }
      if (url.startsWith("https://news.google.com/rss/search")) {
        const query = new URL(url).searchParams.get("q") ?? "";
        if (/weibo|douyin|热搜|热榜|小红书|知乎|百度/i.test(query)) {
          return rss(platformItems);
        }
        if (/中国|China policy|site:rthk|site:scmp/i.test(query)) {
          return rss(domesticItems);
        }
        return rss(globalItems);
      }

      return new Response("", { status: 503 });
    });
    const appEnv: Env = {
      ...env,
      APP_KV: createMemoryKV(),
      NEWSAPI_API_KEY: "newsapi-key",
    };
    const schedule: PulseSchedule = {
      id: "daily-hot-cache",
      name: "每日热点（Cron）",
      enabled: true,
      triggerMode: "cron",
      skipNonTradingInCron: false,
      cronExpression: "0 10 * * *",
      time: "10:00",
      days: [0, 1, 2, 3, 4, 5, 6],
      timezone: "Asia/Shanghai",
      language: "zh",
      outputFormat: "markdown",
      reportType: "daily_hot",
      reportMode: "digest",
      marketSession: "intraday",
      focusSymbols: [],
      positionSymbols: [],
      moduleSwitches: { news: true },
      emailRecipientIds: [],
      targets: ["feishu"],
      marketCalendar: "everyday",
      tradingDaySource: "weekday",
      marketHolidayDates: [],
      topicQuery: "全球热点 国际新闻 地缘政治 产业趋势 宏观政策",
      template: "# Brief\n\n{{itemsMarkdown}}",
    };
    vi.stubGlobal("fetch", fetchMock);

    const liveReport = await buildScheduleReport(appEnv, schedule, new Date("2026-05-20T01:30:00Z"));
    expect(liveReport.sourceStatus).toBe("live");
    expect(liveReport.body).toContain("公共交通票价");

    liveSourcesAvailable = false;
    await saveSettings(appEnv, {
      appName: "GlobalPulse",
      language: "zh",
      timezone: "Asia/Shanghai",
      defaultTargets: ["feishu"],
      outputFormat: "markdown",
      topicFocus: "全球热点",
      template: "# Brief\n\n{{itemsMarkdown}}",
      schedules: [schedule],
    });

    const result = await runDueSchedules(appEnv, new Date("2026-05-20T02:00:00Z"));
    expect(result).toMatchObject({ checked: 1, executed: 1, skipped: 0 });

    const [, init] = fetchMock.mock.calls.find((call) => call[0] === "https://open.feishu.cn/open-apis/bot/v2/hook/test-token") as unknown as [string, RequestInit];
    const payload = JSON.parse(String(init.body));
    const text = String(payload.content.text);
    expect(text).toContain("最近一次成功缓存");
    expect(text).toContain("公共交通票价");
    expect(text).not.toContain("备用示例数据");
    expect(text).not.toContain("暂无相关内容");
  });

  it("keeps China-related stories out of international daily hot headlines", () => {
    const schedule = {
      name: "每日热点",
      language: "zh",
      outputFormat: "markdown",
      reportType: "daily_hot",
    } as PulseSchedule;
    const { body } = renderDigest(schedule, {
      generatedAt: "2026-05-19 10:00",
      timezone: "Asia/Shanghai",
      topicQuery: "全球热点",
      sourceUrl: "test",
      format: "markdown",
      items: [
        { title: "China policy debate dominates global markets", url: "https://news.example.test/china-1", source: "Reuters", section: "global", score: 3000 },
        { title: "台湾海峡紧张局势引发关注", url: "https://news.example.test/taiwan-1", source: "AP News", section: "global", score: 2990 },
        { title: "Beijing announces new technology rules", url: "https://news.example.test/beijing-1", source: "BBC", section: "global", score: 2980 },
        { title: "Middle East ceasefire talks enter new round", url: "https://news.example.test/global-1", source: "AP News", section: "global", score: 2100 },
        { title: "European central banks debate inflation path", url: "https://news.example.test/global-2", source: "Financial Times", section: "global", score: 2050 },
        { title: "UN warns climate disasters are straining public systems", url: "https://news.example.test/global-3", source: "BBC", section: "global", score: 2000 },
        { title: "Oil shipping routes face renewed geopolitical risk", url: "https://news.example.test/global-4", source: "Reuters", section: "global", score: 1950 },
        { title: "中国消费政策继续影响市场预期", url: "https://news.example.test/domestic-1", source: "SCMP", section: "domestic", score: 1900 },
        { title: "微博热搜：民生服务新规引发讨论", url: "https://news.example.test/platform-1", source: "微博热搜", section: "platform", score: 1800 },
      ],
    });
    const internationalSection = body.split("## 🌍 国际要闻")[1]?.split("## 🇨🇳 国内热点")[0] ?? "";

    expect(internationalSection).toContain("Middle East");
    expect(internationalSection).toContain("European central banks");
    expect(internationalSection).not.toMatch(/China|Chinese|Beijing|台湾|中国/);
  });

  it("does not use generic platform index pages as the top daily hot topic", () => {
    const schedule = {
      name: "每日热点",
      language: "zh",
      outputFormat: "markdown",
      reportType: "daily_hot",
    } as PulseSchedule;
    const { body } = renderDigest(schedule, {
      generatedAt: "2026-05-19 10:00",
      timezone: "Asia/Shanghai",
      topicQuery: "微博热搜 抖音热榜",
      sourceUrl: "test",
      format: "markdown",
      items: [
        { title: "微博实时热点 - 微博", url: "https://weibo.example.test/hot", source: "微博", section: "platform", summary: "微博实时热点 微博", score: 9999 },
        { title: "抖音热点榜 - 抖音", url: "https://douyin.example.test/hot", source: "抖音", section: "platform", summary: "抖音热点榜 抖音", score: 8999 },
        { title: "微博热搜：公共交通票价调整引发讨论", url: "https://news.example.test/platform-1", source: "微博热搜", section: "platform", summary: "多地民生政策成为社交平台讨论焦点。", score: 1200 },
        { title: "抖音热榜：国产芯片发布带动科技讨论", url: "https://news.example.test/platform-2", source: "抖音热榜", section: "platform", summary: "科技产业链话题热度持续上升。", score: 1100 },
      ],
    });
    const topTopicSection = body.split("## 📌 全网热度最高话题")[1]?.split("## 🧩 补充要闻")[0] ?? "";

    expect(body).not.toContain("微博实时热点");
    expect(body).not.toContain("抖音热点榜 - 抖音");
    expect(topTopicSection).toContain("公共交通票价调整");
    expect(topTopicSection).not.toContain("微博实时热点");
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
