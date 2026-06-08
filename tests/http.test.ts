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

function createBatchOnlyD1(): D1Database {
  return {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return { sql, args };
        },
      };
    },
    async batch(statements: unknown[]) {
      return statements.map(() => ({ success: true }));
    },
  } as unknown as D1Database;
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
    const response = await handleRequest(new Request("https://worker.example/health"), {
      CF_VERSION_METADATA: {
        id: "worker-version-id",
        tag: "0123456789abcdef0123456789abcdef01234567",
        timestamp: "2026-06-08T17:55:00.000Z",
      },
      WORKERS_CI_BRANCH: "main",
      WORKERS_CI_BUILD_UUID: "workers-build-id",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      service: "globalpulse",
      commitId: "0123456789abcdef0123456789abcdef01234567",
      commitShort: "0123456789ab",
      branch: "main",
      buildId: "workers-build-id",
      deployedAt: "2026-06-08T17:55:00.000Z",
      versionId: "worker-version-id",
      versionTag: "0123456789abcdef0123456789abcdef01234567",
    });
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
        if (/site:weibo|site:douyin|知乎热榜|小红书/i.test(query)) {
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
            { title: "国内消费数据改善带动财经讨论", link: "https://news.example.test/domestic-2", source: "财新" },
            { title: "多地公共服务改革聚焦医疗和教育", link: "https://news.example.test/domestic-3", source: "RTHK" },
            { title: "中国资本市场改革议题继续升温", link: "https://news.example.test/domestic-4", source: "明报" },
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
        if (/site:weibo|site:douyin|知乎热榜|小红书/i.test(query)) {
          return rss([
            { title: "微博实时热点 - 微博", link: "https://news.example.test/weibo-hot-index", source: "微博", description: "微博实时热点 微博" },
            { title: "我真要笑死了#AI#火@抖音热点 - 抖音", link: "https://news.example.test/douyin-vague", source: "抖音", description: "我真要笑死了#AI#火@抖音热点 抖音" },
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
    expect(previewBody).not.toContain("我真要笑死了");
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

  it("uses real secondary sources when daily hot NewsAPI coverage is too thin", async () => {
    const rss = (items: Array<{ title: string; link: string; source: string; description: string }>) => new Response([
      "<rss><channel>",
      ...items.map((item) => [
        "<item>",
        `<title>${item.title}</title>`,
        `<link>${item.link}</link>`,
        `<source>${item.source}</source>`,
        `<description>${item.description}</description>`,
        "<pubDate>Wed, 03 Jun 2026 01:00:00 GMT</pubDate>",
        "</item>",
      ].join("")),
      "</channel></rss>",
    ].join(""), { status: 200 });
    const repeatedHeadline = {
      title: "单一国际要闻连续重复出现",
      link: "https://news.example.test/only-global-live",
      source: "Reuters",
      description: "外部实时源此刻只返回一条国际新闻。",
    };
    const globalHeadlines = [
      { title: "国际峰会关注供应链安全协调", link: "https://news.example.test/global-rss-1", source: "BBC World", description: "多国讨论供应链、能源运输和关键基础设施韧性。" },
      { title: "主要央行利率路径牵动全球市场", link: "https://news.example.test/global-rss-2", source: "Al Jazeera", description: "通胀和利率预期继续影响汇率与风险资产。" },
      { title: "中东局势推动避险资产波动", link: "https://news.example.test/global-rss-3", source: "NYTimes World", description: "地缘风险成为全球市场关注焦点。" },
      { title: "AI芯片出口规则影响产业链布局", link: "https://news.example.test/global-rss-4", source: "France24", description: "科技政策和供应链议题继续升温。" },
    ];
    const domesticHeadlines = [
      { title: "中国消费政策继续释放稳增长信号", link: "https://news.example.test/domestic-rss-1", source: "SCMP", description: "消费、就业和服务业政策成为国内关注点。" },
      { title: "多地公共服务改革聚焦医疗教育", link: "https://news.example.test/domestic-rss-2", source: "RTHK", description: "医疗、教育和城市治理改革继续推进。" },
      { title: "中国资本市场改革讨论升温", link: "https://news.example.test/domestic-rss-3", source: "明报", description: "监管政策、流动性和投资者信心受到关注。" },
      { title: "国内新能源产业政策调整引发关注", link: "https://news.example.test/domestic-rss-4", source: "SCMP", description: "新能源、汽车和供应链政策继续影响产业预期。" },
    ];
    const toutiaoHotJson = (items: Array<{ title: string; hotValue: string; label?: string }>) => new Response(JSON.stringify({
      data: items.map((item, index) => ({
        Title: item.title,
        QueryWord: item.title,
        Url: `https://www.toutiao.com/trending/test-${index}/`,
        HotValue: item.hotValue,
        Label: item.label ?? "",
        ClusterIdStr: `test-${index}`,
      })),
    }), { status: 200, headers: { "Content-Type": "application/json" } });
    const tencentHotJson = (items: Array<{ title: string; summary: string; hotScore: number }>) => new Response(JSON.stringify({
      ret: 0,
      idlist: [{
        newslist: [
          { id: "TIP2022042216544300", title: "腾讯新闻用户最关注的热点，每10分钟更新一次" },
          ...items.map((item, index) => ({
            title: item.title,
            longtitle: item.title,
            url: `https://view.inews.qq.com/a/test-${index}`,
            source: "腾讯新闻",
            abstract: item.summary,
            nlpAbstract: item.summary,
            timestamp: 1780448400 - index * 60,
            hotEvent: { title: item.title, hotScore: item.hotScore, ranking: index + 1 },
          })),
        ],
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.startsWith("https://newsapi.org/v2/")) {
        return new Response(JSON.stringify({
          articles: [{
            title: repeatedHeadline.title,
            description: repeatedHeadline.description,
            url: repeatedHeadline.link,
            publishedAt: "2026-06-03T01:00:00Z",
            source: { name: repeatedHeadline.source },
          }],
        }), { status: 200 });
      }

      if (url.startsWith("https://api.gdeltproject.org/api/v2/doc/doc")) {
        return new Response(JSON.stringify({ articles: [] }), { status: 200 });
      }

      if (url.startsWith("https://www.toutiao.com/hot-event/hot-board/")) {
        return toutiaoHotJson([
          { title: "教育部发布2026年高考预警信息", hotValue: "6800000", label: "热" },
          { title: "一文了解汛期知识、避险方法", hotValue: "5800000", label: "新" },
          { title: "中方回应区域安全议题", hotValue: "4800000" },
          { title: "新能源车企发布召回和补贴调整", hotValue: "3800000" },
        ]);
      }

      if (url.startsWith("https://r.inews.qq.com/gw/event/hot_ranking_list")) {
        return tencentHotJson([
          { title: "多地提醒高考考生入场前须接受查验", summary: "教育考试、公共服务和民生话题进入新闻热榜。", hotScore: 5600000 },
          { title: "强降雨影响城市交通出行", summary: "天气、交通和公共安全受到关注。", hotScore: 4600000 },
        ]);
      }

      if (
        url.startsWith("https://feeds.bbci.co.uk/news/world/rss.xml")
        || url.startsWith("https://www.aljazeera.com/xml/rss/all.xml")
        || url.startsWith("https://rss.nytimes.com/services/xml/rss/nyt/World.xml")
        || url.startsWith("https://www.france24.com/en/rss")
        || url.startsWith("https://feeds.npr.org/1004/rss.xml")
      ) {
        return rss(globalHeadlines);
      }

      if (
        url.startsWith("https://www.rthk.hk/rthk/news/rss/")
        || url.startsWith("https://www.scmp.com/rss/91/feed")
        || url.startsWith("https://feeds.bbci.co.uk/zhongwen/simp/rss.xml")
      ) {
        return rss(domesticHeadlines);
      }

      if (url.startsWith("https://news.google.com/rss/")) {
        return rss([repeatedHeadline]);
      }

      return new Response("ok", { status: 200 });
    });
    const appEnv: Env = {
      ...env,
      APP_KV: createMemoryKV(),
      NEWSAPI_API_KEY: "newsapi-key",
    };
    const schedule: PulseSchedule = {
      id: "daily-hot-thin-preview",
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
      targets: ["telegram", "email"],
      marketCalendar: "everyday",
      tradingDaySource: "weekday",
      marketHolidayDates: [],
      topicQuery: "全球热点 国际新闻 地缘政治 产业趋势 宏观政策",
      template: "# Brief\n\n{{itemsMarkdown}}",
    };
    vi.stubGlobal("fetch", fetchMock);

    const report = await buildScheduleReport(appEnv, schedule, new Date("2026-06-02T17:22:00Z"));
    const countItems = (section: string): number => section.match(/^\d+\. \*\*/gm)?.length ?? 0;
    const between = (start: string, end: string): string => report.body.split(start)[1]?.split(end)[0] ?? "";

    expect(report.sourceStatus).toBe("live");
    expect(report.sourceMessage).toContain("实时抓取成功");
    expect(report.sourceUrl).toContain("NewsAPI(1条)");
    expect(report.sourceUrl).toContain("直接国际RSS");
    expect(report.sourceUrl).toContain("国内/香港媒体RSS");
    expect(report.sourceUrl).toContain("头条热榜");
    expect(report.sourceUrl).toContain("腾讯新闻热榜");
    expect(report.body).toContain("单一国际要闻连续重复出现");
    expect(report.body).toContain("中国消费政策继续释放稳增长信号");
    expect(report.body).toContain("教育部发布2026年高考预警信息");
    expect(report.body).toContain("腾讯新闻热榜");
    expect(report.body).not.toContain("百度");
    expect(report.body).not.toContain("备用观察");
    expect(report.body).not.toContain("备用热点框架");
    expect(report.body).not.toContain("备用示例数据");
    expect(report.body).not.toContain("暂无相关内容");
    expect(countItems(between("## 🌍 国际要闻", "## 🇨🇳 国内热点"))).toBe(4);
    expect(countItems(between("## 🇨🇳 国内热点", "## 🔥 全网热搜精选"))).toBe(4);
    expect(countItems(between("## 🔥 全网热搜精选", "## 📌 全网热度最高话题"))).toBe(3);
    expect(countItems(between("## 📌 全网热度最高话题", "## 🧩 补充要闻"))).toBe(1);
  });

  it("keeps daily hot sections balanced when platform rankings dominate source scores", async () => {
    const rss = (items: Array<{ title: string; link: string; source: string; description: string }>) => new Response([
      "<rss><channel>",
      ...items.map((item) => [
        "<item>",
        `<title>${item.title}</title>`,
        `<link>${item.link}</link>`,
        `<source>${item.source}</source>`,
        `<description>${item.description}</description>`,
        "<pubDate>Fri, 22 May 2026 01:00:00 GMT</pubDate>",
        "</item>",
      ].join("")),
      "</channel></rss>",
    ].join(""), { status: 200 });
    const globalItems = ([
      ["主要央行利率路径牵动全球市场", "通胀、利率和汇率变化影响跨资产风险偏好。"],
      ["中东能源航运风险推升避险资产波动", "地缘风险和能源运输扰动继续影响油价和黄金。"],
      ["欧洲财政政策协调影响欧元区增长预期", "财政政策、债券收益率和增长预期成为市场焦点。"],
      ["全球半导体供应链调整影响数据中心投资", "芯片、能源和数据中心建设继续受到产业政策影响。"],
      ["美国关税政策变化牵动国际贸易谈判", "贸易、关税和供应链配置影响企业投资计划。"],
      ["公共卫生预警推动跨境旅行政策调整", "公共卫生和边境政策变化影响服务业与出行需求。"],
      ["新兴市场汇率承压引发央行政策回应", "美元流动性和本币汇率波动影响资本流向。"],
      ["全球港口拥堵增加制造业交付不确定性", "航运延误和供应链韧性成为产业关注点。"],
      ["国际粮食价格上涨引发政策储备讨论", "农产品价格和食品通胀影响民生与财政政策。"],
      ["主要经济体选举结果影响监管议程", "监管政策、贸易安排和产业补贴存在调整预期。"],
      ["跨国能源企业调整天然气供应合同", "能源价格和长期供应协议影响欧洲工业成本。"],
      ["网络安全事件冲击关键基础设施运行", "公共安全和数字基础设施韧性受到关注。"],
      ["全球汽车供应链评估新能源补贴变化", "新能源车、芯片和贸易政策影响产业布局。"],
      ["国际金融监管机构讨论稳定币规则", "金融监管和数字资产规则影响市场风险偏好。"],
    ] satisfies Array<[string, string]>).map(([title, description], index) => ({
      title,
      link: `https://news.example.test/balanced-global-${index + 1}`,
      source: "Reuters",
      description,
    }));
    const domesticItems = Array.from({ length: 10 }, (_, index) => ({
      title: `中国国内热点 ${index + 1}：消费政策和民生服务调整`,
      link: `https://news.example.test/balanced-domestic-${index + 1}`,
      source: "Caixin",
      description: `国内消费、就业和公共服务政策受到关注 ${index + 1}。`,
    }));
    const platformTitles = Array.from({ length: 24 }, (_, index) => `消费补贴政策热议 ${index + 1}`);
    const toutiaoHotJson = () => new Response(JSON.stringify({
      data: platformTitles.map((title, index) => ({
        Title: title,
        QueryWord: title,
        Url: `https://www.toutiao.com/trending/balanced-${index}/`,
        HotValue: String(9000000 - index * 100000),
        Label: index < 2 ? "hot" : "",
        ClusterIdStr: `balanced-${index}`,
      })),
    }), { status: 200, headers: { "Content-Type": "application/json" } });
    const tencentHotJson = () => new Response(JSON.stringify({
      ret: 0,
      idlist: [{
        newslist: [
          { id: "TIP2022042216544300", title: "腾讯新闻用户最关注的热点，每10分钟更新一次" },
          ...platformTitles.map((title, index) => ({
            title: `民生服务政策进入热榜 ${index + 1}`,
            longtitle: `民生服务政策进入热榜 ${index + 1}`,
            url: `https://view.inews.qq.com/a/balanced-${index}`,
            source: "腾讯新闻",
            abstract: "公共服务、消费政策和城市治理成为平台热议话题。",
            nlpAbstract: "公共服务、消费政策和城市治理成为平台热议话题。",
            timestamp: 1780486800 - index * 60,
            hotEvent: { title, hotScore: 8800000 - index * 100000, ranking: index + 1 },
          })),
        ],
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.startsWith("https://api.gdeltproject.org/api/v2/doc/doc")) {
        return new Response(JSON.stringify({ articles: [] }), { status: 200 });
      }

      if (url.startsWith("https://www.toutiao.com/hot-event/hot-board/")) {
        return toutiaoHotJson();
      }

      if (url.startsWith("https://r.inews.qq.com/gw/event/hot_ranking_list")) {
        return tencentHotJson();
      }

      if (
        url.startsWith("https://www.rthk.hk/rthk/news/rss/")
        || url.startsWith("https://www.scmp.com/rss/91/feed")
        || url.startsWith("https://feeds.bbci.co.uk/zhongwen/simp/rss.xml")
      ) {
        return rss(domesticItems);
      }

      if (url.startsWith("https://news.google.com/rss/")) {
        const query = new URL(url).searchParams.get("q") ?? "";
        if (/weibo|douyin|热搜|热榜|小红书|知乎/i.test(query)) {
          return rss(platformTitles.slice(0, 8).map((title, index) => ({
            title: `微博热搜：${title}`,
            link: `https://news.example.test/balanced-platform-search-${index + 1}`,
            source: "微博热搜",
            description: "消费、民生和政策话题进入社交平台高热讨论。",
          })));
        }
        if (/中国|China policy|site:rthk|site:scmp/i.test(query)) {
          return rss(domesticItems);
        }
        return rss(globalItems);
      }

      if (
        url.startsWith("https://feeds.bbci.co.uk/news/world/rss.xml")
        || url.startsWith("https://www.aljazeera.com/xml/rss/all.xml")
        || url.startsWith("https://rss.nytimes.com/services/xml/rss/nyt/World.xml")
        || url.startsWith("https://www.france24.com/en/rss")
        || url.startsWith("https://feeds.npr.org/1004/rss.xml")
      ) {
        return rss(globalItems);
      }

      return new Response("ok", { status: 200 });
    });
    const appEnv: Env = {
      ...env,
      APP_KV: createMemoryKV(),
    };
    const schedule: PulseSchedule = {
      id: "daily-hot-balanced",
      name: "每日热点",
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
      topicQuery: "全球热点 国际新闻 国内新闻 微博热搜 抖音热榜",
      template: "# Brief\n\n{{itemsMarkdown}}",
    };
    vi.stubGlobal("fetch", fetchMock);

    const report = await buildScheduleReport(appEnv, schedule, new Date("2026-05-22T02:00:00Z"));
    const countItems = (section: string): number => section.match(/^\d+\. \*\*/gm)?.length ?? 0;
    const between = (start: string, end: string): string => report.body.split(start)[1]?.split(end)[0] ?? "";

    expect(report.sourceStatus).toBe("live");
    expect(report.body).toContain("主要央行利率路径");
    expect(report.body).toContain("中国国内热点");
    expect(report.body).toContain("消费补贴政策热议");
    expect(countItems(between("## 🌍 国际要闻", "## 🇨🇳 国内热点"))).toBe(4);
    expect(countItems(between("## 🇨🇳 国内热点", "## 🔥 全网热搜精选"))).toBe(4);
    expect(countItems(between("## 🔥 全网热搜精选", "## 📌 全网热度最高话题"))).toBe(3);
    expect(countItems(between("## 📌 全网热度最高话题", "## 🧩 补充要闻"))).toBe(1);
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
      ...Array.from({ length: 8 }, (_, index) => {
        const title = prefix === "platform"
          ? `微博热搜：消费补贴政策讨论 ${index + 1}`
          : prefix === "domestic"
            ? `中国宏观政策与民生服务话题 ${index + 1}`
            : `${prefix} policy inflation topic ${index + 1}`;
        const description = prefix === "platform"
          ? `消费、民生和政策话题进入社交平台高热讨论 ${index + 1}`
          : prefix === "domestic"
            ? `中国政策、经济和民生服务成为国内新闻焦点 ${index + 1}`
            : `${prefix} summary for global pulse item ${index + 1}`;
        return [
          "<item>",
          `<title>${title}</title>`,
          `<link>https://news.example.test/${prefix}-${index + 1}</link>`,
          `<source>${source}</source>`,
          `<description>${description}</description>`,
          "<pubDate>Mon, 18 May 2026 01:00:00 GMT</pubDate>",
          "</item>",
        ].join("");
      }),
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
    expect(translateCalls.length).toBeLessThanOrEqual(20);
    expect(fetchMock).toHaveBeenCalledWith("https://open.feishu.cn/open-apis/bot/v2/hook/test-token", expect.objectContaining({
      method: "POST",
    }));
    const [, init] = fetchMock.mock.calls.find((call) => call[0] === "https://open.feishu.cn/open-apis/bot/v2/hook/test-token") as unknown as [string, RequestInit];
    const payload = JSON.parse(String(init.body));
    const itemCount = (String(payload.content.text).match(/^\d+\. \*\*/gm) ?? []).length;
    expect(itemCount).toBeGreaterThanOrEqual(10);
    expect(payload.content.text).toContain("已翻译标题");
    expect(payload.content.text).not.toContain("global policy inflation");
    expect(payload.content.text).not.toContain("暂无相关内容");
  });

  it("batch translates English daily hot headlines before rendering Chinese reports", async () => {
    const rss = (items: Array<{ title: string; link: string; source: string; description: string }>) => new Response([
      "<rss><channel>",
      ...items.map((item) => [
        "<item>",
        `<title>${item.title}</title>`,
        `<link>${item.link}</link>`,
        `<source>${item.source}</source>`,
        `<description>${item.description}</description>`,
        "<pubDate>Tue, 09 Jun 2026 01:00:00 GMT</pubDate>",
        "</item>",
      ].join("")),
      "</channel></rss>",
    ].join(""), { status: 200 });
    const globalItems = [
      { title: "Iran and Israel say they have halted strikes after truce", link: "https://news.example.test/global-ai-1", source: "BBC World", description: "Iran launched missiles while Israel carried out air strikes." },
      { title: "Three rescued after Russian drone strike on Ukraine block", link: "https://news.example.test/global-ai-2", source: "Reuters", description: "Emergency teams continued rescue work after the overnight attack." },
      { title: "Central banks debate inflation path as markets reprice rates", link: "https://news.example.test/global-ai-3", source: "AP News", description: "Bond yields and currencies moved as investors reassessed policy risks." },
      { title: "Energy shipping risks rise after port disruption", link: "https://news.example.test/global-ai-4", source: "Financial Times", description: "Supply-chain and energy routes remain under pressure." },
    ];
    const domesticItems = [
      { title: "中国消费政策继续释放稳增长信号", link: "https://news.example.test/domestic-ai-1", source: "SCMP", description: "消费、就业和服务业政策成为国内关注点。" },
      { title: "多地公共服务改革聚焦医疗教育", link: "https://news.example.test/domestic-ai-2", source: "RTHK", description: "医疗、教育和城市治理改革继续推进。" },
      { title: "中国资本市场改革讨论升温", link: "https://news.example.test/domestic-ai-3", source: "明报", description: "监管政策、流动性和投资者信心受到关注。" },
      { title: "国内新能源产业政策调整引发关注", link: "https://news.example.test/domestic-ai-4", source: "SCMP", description: "新能源、汽车和供应链政策继续影响产业预期。" },
    ];
    const platformItems = [
      { title: "微博热搜：公共交通票价调整引发讨论", link: "https://news.example.test/platform-ai-1", source: "微博热搜", description: "民生政策成为平台热议话题。" },
      { title: "抖音热榜：国产芯片发布带动科技讨论", link: "https://news.example.test/platform-ai-2", source: "抖音热榜", description: "科技产业链相关话题热度上升。" },
      { title: "微博热议：高考服务政策受到关注", link: "https://news.example.test/platform-ai-3", source: "微博热搜", description: "教育民生服务政策进入热搜讨论。" },
      { title: "头条热榜：暴雨天气影响城市出行", link: "https://news.example.test/platform-ai-4", source: "今日头条热榜", description: "公共安全和城市交通成为讨论焦点。" },
    ];
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.startsWith("https://translate.googleapis.com/translate_a/single")) {
        return new Response(JSON.stringify([[["不应调用逐条翻译"]]]), { status: 200 });
      }
      if (url.startsWith("https://www.toutiao.com/hot-event/hot-board/")) {
        return new Response(JSON.stringify({ data: [] }), { status: 200 });
      }
      if (url.startsWith("https://r.inews.qq.com/gw/event/hot_ranking_list")) {
        return new Response(JSON.stringify({ idlist: [] }), { status: 200 });
      }
      if (
        url.startsWith("https://feeds.bbci.co.uk/news/world/rss.xml")
        || url.startsWith("https://www.aljazeera.com/xml/rss/all.xml")
        || url.startsWith("https://rss.nytimes.com/services/xml/rss/nyt/World.xml")
        || url.startsWith("https://www.france24.com/en/rss")
      ) {
        return rss(globalItems);
      }
      if (url.startsWith("https://www.rthk.hk/rthk/news/rss/") || url.startsWith("https://www.scmp.com/rss/91/feed")) {
        return rss(domesticItems);
      }
      if (url.startsWith("https://news.google.com/rss/search")) {
        const query = new URL(url).searchParams.get("q") ?? "";
        if (/weibo|douyin|热搜|热榜|小红书|知乎/i.test(query)) return rss(platformItems);
        if (/中国|China policy|site:rthk|site:scmp/i.test(query)) return rss(domesticItems);
        return rss(globalItems);
      }

      return new Response("ok", { status: 200 });
    });
    const aiRun = vi.fn(async () => ({
      response: JSON.stringify({
        items: [
          { index: 0, title: "伊朗和以色列称停火后已停止打击", summary: "伊朗发射导弹，以色列发动空袭，双方随后表示行动暂停。" },
          { index: 1, title: "俄无人机袭击乌克兰居民楼后多人获救", summary: "夜间袭击后，应急人员继续开展救援。" },
          { index: 2, title: "央行讨论通胀路径，市场重新定价利率", summary: "债券收益率和汇率随政策风险预期波动。" },
          { index: 3, title: "港口扰动后能源航运风险上升", summary: "供应链和能源运输线路仍承压。" },
        ],
      }),
    }));
    const appEnv: Env = {
      ...env,
      APP_KV: createMemoryKV(),
      AI: { run: aiRun } as unknown as Ai,
    };
    const schedule: PulseSchedule = {
      id: "daily-hot-ai-translation",
      name: "每日热点 17:00",
      enabled: true,
      triggerMode: "cron",
      skipNonTradingInCron: false,
      cronExpression: "0 17 * * *",
      time: "17:00",
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
      topicQuery: "全球金融市场、宏观经济、地缘政治与国际热点",
      template: "# Brief\n\n{{itemsMarkdown}}",
    };
    vi.stubGlobal("fetch", fetchMock);

    const report = await buildScheduleReport(appEnv, schedule, new Date("2026-06-08T17:24:00Z"));
    const translateCalls = fetchMock.mock.calls.filter((call) => String(call[0]).startsWith("https://translate.googleapis.com/translate_a/single"));

    expect(report.sourceStatus).toBe("live");
    expect(aiRun).toHaveBeenCalledTimes(1);
    expect(translateCalls).toHaveLength(0);
    expect(report.body).toContain("伊朗和以色列称停火后已停止打击");
    expect(report.body).toContain("伊朗发射导弹");
    expect(report.body).not.toContain("Iran and Israel say they have halted strikes");
  });

  it("uses Gemini batch translation when Workers AI is unavailable", async () => {
    const rss = (items: Array<{ title: string; link: string; source: string; description: string }>) => new Response([
      "<rss><channel>",
      ...items.map((item) => [
        "<item>",
        `<title>${item.title}</title>`,
        `<link>${item.link}</link>`,
        `<source>${item.source}</source>`,
        `<description>${item.description}</description>`,
        "<pubDate>Tue, 09 Jun 2026 01:00:00 GMT</pubDate>",
        "</item>",
      ].join("")),
      "</channel></rss>",
    ].join(""), { status: 200 });
    const globalItems = [
      { title: "Peru election leaves reform agenda uncertain", link: "https://news.example.test/gemini-global-1", source: "Reuters", description: "Neither candidate has a strong congressional majority." },
      { title: "Iran and Israel pull back after exchange of attacks", link: "https://news.example.test/gemini-global-2", source: "BBC", description: "Both sides signaled a pause after fresh strikes." },
      { title: "Energy markets watch shipping disruption", link: "https://news.example.test/gemini-global-3", source: "AP News", description: "Port delays added pressure to commodity markets." },
      { title: "Central banks weigh inflation risks", link: "https://news.example.test/gemini-global-4", source: "Financial Times", description: "Bond yields moved as policy expectations shifted." },
    ];
    const domesticItems = [
      { title: "中国消费政策继续释放稳增长信号", link: "https://news.example.test/gemini-domestic-1", source: "SCMP", description: "消费和就业政策成为国内关注点。" },
      { title: "多地公共服务改革聚焦医疗教育", link: "https://news.example.test/gemini-domestic-2", source: "RTHK", description: "城市治理改革继续推进。" },
      { title: "资本市场改革讨论升温", link: "https://news.example.test/gemini-domestic-3", source: "明报", description: "监管政策和投资者信心受到关注。" },
      { title: "新能源产业政策调整引发关注", link: "https://news.example.test/gemini-domestic-4", source: "SCMP", description: "汽车和供应链政策影响产业预期。" },
    ];
    const platformItems = [
      { title: "微博热搜：公共交通票价调整引发讨论", link: "https://news.example.test/gemini-platform-1", source: "微博热搜", description: "民生政策成为平台热议话题。" },
      { title: "抖音热榜：国产芯片发布带动科技讨论", link: "https://news.example.test/gemini-platform-2", source: "抖音热榜", description: "科技产业链相关话题热度上升。" },
      { title: "微博热议：高考服务政策受到关注", link: "https://news.example.test/gemini-platform-3", source: "微博热搜", description: "教育民生服务政策进入热搜讨论。" },
      { title: "头条热榜：暴雨天气影响城市出行", link: "https://news.example.test/gemini-platform-4", source: "今日头条热榜", description: "公共安全和城市交通成为讨论焦点。" },
    ];
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url === "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions") {
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                items: [
                  { index: 0, title: "秘鲁选举令改革议程充满不确定性", summary: "两名候选人都没有稳固的国会多数支持。" },
                  { index: 1, title: "伊朗和以色列交火后暂时后撤", summary: "新一轮打击后，双方都释放暂停信号。" },
                  { index: 2, title: "能源市场关注航运扰动", summary: "港口延误给大宗商品市场增加压力。" },
                  { index: 3, title: "主要央行权衡通胀风险", summary: "政策预期变化推动债券收益率波动。" },
                ],
              }),
            },
          }],
        }), { status: 200 });
      }
      if (url.startsWith("https://translate.googleapis.com/translate_a/single")) {
        return new Response(JSON.stringify([[["不应调用逐条翻译"]]]), { status: 200 });
      }
      if (url.startsWith("https://www.toutiao.com/hot-event/hot-board/")) return new Response(JSON.stringify({ data: [] }), { status: 200 });
      if (url.startsWith("https://r.inews.qq.com/gw/event/hot_ranking_list")) return new Response(JSON.stringify({ idlist: [] }), { status: 200 });
      if (url.startsWith("https://www.rthk.hk/rthk/news/rss/") || url.startsWith("https://www.scmp.com/rss/91/feed")) return rss(domesticItems);
      if (
        url.startsWith("https://feeds.bbci.co.uk/news/world/rss.xml")
        || url.startsWith("https://www.aljazeera.com/xml/rss/all.xml")
        || url.startsWith("https://rss.nytimes.com/services/xml/rss/nyt/World.xml")
        || url.startsWith("https://www.france24.com/en/rss")
      ) return rss(globalItems);
      if (url.startsWith("https://news.google.com/rss/search")) {
        const query = new URL(url).searchParams.get("q") ?? "";
        if (/weibo|douyin|热搜|热榜|小红书|知乎/i.test(query)) return rss(platformItems);
        if (/中国|China policy|site:rthk|site:scmp/i.test(query)) return rss(domesticItems);
        return rss(globalItems);
      }

      return new Response("ok", { status: 200 });
    });
    const appEnv: Env = {
      ...env,
      APP_KV: createMemoryKV(),
      GEMINI_API_KEY: "gemini-key",
    };
    const schedule: PulseSchedule = {
      id: "daily-hot-gemini-translation",
      name: "每日热点 17:00",
      enabled: true,
      triggerMode: "cron",
      skipNonTradingInCron: false,
      cronExpression: "0 17 * * *",
      time: "17:00",
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
      topicQuery: "全球金融市场、宏观经济、地缘政治与国际热点",
      template: "# Brief\n\n{{itemsMarkdown}}",
    };
    vi.stubGlobal("fetch", fetchMock);

    const report = await buildScheduleReport(appEnv, schedule, new Date("2026-06-08T17:40:00Z"));
    const geminiCalls = fetchMock.mock.calls.filter((call) => String(call[0]).includes("generativelanguage.googleapis.com"));
    const translateCalls = fetchMock.mock.calls.filter((call) => String(call[0]).startsWith("https://translate.googleapis.com/translate_a/single"));

    expect(report.sourceStatus).toBe("live");
    expect(geminiCalls).toHaveLength(1);
    expect(translateCalls).toHaveLength(0);
    expect(report.body).toContain("秘鲁选举令改革议程充满不确定性");
    expect(report.body).not.toContain("Peru election leaves reform agenda uncertain");
  });

  it("uses Admin provider settings for scheduled Gemini report translation", async () => {
    const rss = (items: Array<{ title: string; link: string; source: string; description: string }>) => new Response([
      "<rss><channel>",
      ...items.map((item) => [
        "<item>",
        `<title>${item.title}</title>`,
        `<link>${item.link}</link>`,
        `<source>${item.source}</source>`,
        `<description>${item.description}</description>`,
        "<pubDate>Tue, 09 Jun 2026 01:00:00 GMT</pubDate>",
        "</item>",
      ].join("")),
      "</channel></rss>",
    ].join(""), { status: 200 });
    const globalItems = [
      { title: "Peru election leaves reform agenda uncertain", link: "https://news.example.test/settings-global-1", source: "Reuters", description: "Neither candidate has a strong congressional majority." },
      { title: "Iran and Israel pull back after exchange of attacks", link: "https://news.example.test/settings-global-2", source: "BBC", description: "Both sides signaled a pause after fresh strikes." },
      { title: "Energy markets watch shipping disruption", link: "https://news.example.test/settings-global-3", source: "AP News", description: "Port delays added pressure to commodity markets." },
      { title: "Central banks weigh inflation risks", link: "https://news.example.test/settings-global-4", source: "Financial Times", description: "Bond yields moved as policy expectations shifted." },
    ];
    const domesticItems = [
      { title: "中国消费政策继续释放稳增长信号", link: "https://news.example.test/settings-domestic-1", source: "SCMP", description: "消费和就业政策成为国内关注点。" },
      { title: "多地公共服务改革聚焦医疗教育", link: "https://news.example.test/settings-domestic-2", source: "RTHK", description: "城市治理改革继续推进。" },
      { title: "资本市场改革讨论升温", link: "https://news.example.test/settings-domestic-3", source: "明报", description: "监管政策和投资者信心受到关注。" },
      { title: "新能源产业政策调整引发关注", link: "https://news.example.test/settings-domestic-4", source: "SCMP", description: "汽车和供应链政策影响产业预期。" },
    ];
    const platformItems = [
      { title: "微博热搜：公共交通票价调整引发讨论", link: "https://news.example.test/settings-platform-1", source: "微博热搜", description: "民生政策成为平台热议话题。" },
      { title: "抖音热榜：国产芯片发布带动科技讨论", link: "https://news.example.test/settings-platform-2", source: "抖音热榜", description: "科技产业链相关话题热度上升。" },
      { title: "微博热议：高考服务政策受到关注", link: "https://news.example.test/settings-platform-3", source: "微博热搜", description: "教育民生服务政策进入热搜讨论。" },
      { title: "头条热榜：暴雨天气影响城市出行", link: "https://news.example.test/settings-platform-4", source: "今日头条热榜", description: "公共安全和城市交通成为讨论焦点。" },
    ];
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url === "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions") {
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                items: [
                  { index: 0, title: "秘鲁选举令改革议程充满不确定性", summary: "两名候选人都没有稳固的国会多数支持。" },
                  { index: 1, title: "伊朗和以色列交火后暂时后撤", summary: "新一轮打击后，双方都释放暂停信号。" },
                  { index: 2, title: "能源市场关注航运扰动", summary: "港口延误给大宗商品市场增加压力。" },
                  { index: 3, title: "主要央行权衡通胀风险", summary: "政策预期变化推动债券收益率波动。" },
                ],
              }),
            },
          }],
        }), { status: 200 });
      }
      if (url.startsWith("https://translate.googleapis.com/translate_a/single")) {
        return new Response(JSON.stringify([[["不应调用逐条翻译"]]]), { status: 200 });
      }
      if (url.startsWith("https://www.toutiao.com/hot-event/hot-board/")) return new Response(JSON.stringify({ data: [] }), { status: 200 });
      if (url.startsWith("https://r.inews.qq.com/gw/event/hot_ranking_list")) return new Response(JSON.stringify({ idlist: [] }), { status: 200 });
      if (url.startsWith("https://www.rthk.hk/rthk/news/rss/") || url.startsWith("https://www.scmp.com/rss/91/feed")) return rss(domesticItems);
      if (
        url.startsWith("https://feeds.bbci.co.uk/news/world/rss.xml")
        || url.startsWith("https://www.aljazeera.com/xml/rss/all.xml")
        || url.startsWith("https://rss.nytimes.com/services/xml/rss/nyt/World.xml")
        || url.startsWith("https://www.france24.com/en/rss")
      ) return rss(globalItems);
      if (url.startsWith("https://news.google.com/rss/search")) {
        const query = new URL(url).searchParams.get("q") ?? "";
        if (/weibo|douyin|热搜|热榜|小红书|知乎/i.test(query)) return rss(platformItems);
        if (/中国|China policy|site:rthk|site:scmp/i.test(query)) return rss(domesticItems);
        return rss(globalItems);
      }
      if (url === "https://open.feishu.cn/open-apis/bot/v2/hook/test-token") {
        return new Response(JSON.stringify({ code: 0, msg: "ok" }), { status: 200 });
      }

      return new Response("ok", { status: 200 });
    });
    const appEnv: Env = {
      ...env,
      APP_KV: createMemoryKV(),
    };
    vi.stubGlobal("fetch", fetchMock);
    await saveSettings(appEnv, {
      appName: "GlobalPulse",
      language: "zh",
      timezone: "Asia/Shanghai",
      defaultTargets: ["feishu"],
      outputFormat: "markdown",
      topicFocus: "全球热点",
      providerSettings: {
        geminiApiKey: "gemini-key-from-admin",
        geminiModel: "gemini-2.5-flash",
      },
      template: "# Brief\n\n{{itemsMarkdown}}",
      schedules: [{
        id: "daily-hot-admin-gemini",
        name: "每日热点 17:00",
        enabled: true,
        triggerMode: "cron",
        skipNonTradingInCron: false,
        cronExpression: "0 17 * * *",
        time: "17:00",
        days: [0, 1, 2, 3, 4, 5, 6],
        timezone: "Asia/Shanghai",
        language: "zh",
        outputFormat: "markdown",
        reportType: "daily_hot",
        reportMode: "digest",
        marketSession: "intraday",
        moduleSwitches: { news: true },
        targets: ["feishu"],
        marketCalendar: "everyday",
        tradingDaySource: "weekday",
        topicQuery: "全球热点 国际新闻 国内新闻 微博热搜 抖音热榜",
        template: "# Brief\n\n{{itemsMarkdown}}",
      }],
    });

    const result = await runDueSchedules(appEnv, new Date("2026-06-08T09:00:00Z"));
    const geminiCalls = fetchMock.mock.calls.filter((call) => String(call[0]).includes("generativelanguage.googleapis.com"));
    const translateCalls = fetchMock.mock.calls.filter((call) => String(call[0]).startsWith("https://translate.googleapis.com/translate_a/single"));
    const [, geminiInit] = geminiCalls[0] as unknown as [string, RequestInit];
    const [, feishuInit] = fetchMock.mock.calls.find((call) => call[0] === "https://open.feishu.cn/open-apis/bot/v2/hook/test-token") as unknown as [string, RequestInit];
    const geminiPayload = JSON.parse(String(geminiInit.body));
    const feishuPayload = JSON.parse(String(feishuInit.body));

    expect(result).toMatchObject({ checked: 1, executed: 1, skipped: 0 });
    expect(geminiCalls).toHaveLength(1);
    expect((geminiInit.headers as Record<string, string>).Authorization).toBe("Bearer gemini-key-from-admin");
    expect(geminiPayload.model).toBe("gemini-2.5-flash");
    expect(translateCalls).toHaveLength(0);
    expect(feishuPayload.content.text).toContain("秘鲁选举令改革议程充满不确定性");
    expect(feishuPayload.content.text).not.toContain("Peru election leaves reform agenda uncertain");
  });

  it("keeps market cron fetches under the free Worker subrequest budget", async () => {
    const translationSeparator = "1234567890GLOBALPULSE9876543210";
    const rss = () => new Response([
      "<rss><channel>",
      ...Array.from({ length: 8 }, (_, index) => [
        "<item>",
        `<title>Fed policy supports growth stocks ${index + 1}</title>`,
        `<link>https://news.example.test/us-market-${index + 1}</link>`,
        "<source>Reuters</source>",
        `<description>Nasdaq, earnings and interest-rate expectations are driving the session ${index + 1}.</description>`,
        "<pubDate>Mon, 18 May 2026 10:00:00 GMT</pubDate>",
        "</item>",
      ].join("")),
      "</channel></rss>",
    ].join(""), { status: 200 });
    const yahooPayload = {
      quoteResponse: {
        result: ["SPY", "QQQ", "DIA", "IWM"].map((symbol, index) => ({
          symbol,
          regularMarketPrice: 100 + index,
          regularMarketPreviousClose: 99 + index,
          regularMarketChangePercent: 1,
          marketState: "REGULAR",
          regularMarketVolume: 10_000_000,
          averageDailyVolume10Day: 9_000_000,
        })),
      },
    };
    const fredPayload = {
      observations: Array.from({ length: 13 }, (_, index) => ({
        value: String(4.5 - index * 0.02),
        date: `2026-05-${String(18 - index).padStart(2, "0")}`,
      })),
    };
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.startsWith("https://news.google.com/rss/search")) {
        return rss();
      }
      if (url.startsWith("https://translate.googleapis.com/translate_a/single")) {
        const q = new URL(url).searchParams.get("q") ?? "";
        const translated = q.includes(translationSeparator)
          ? `已翻译市场标题\n${translationSeparator}\n已翻译市场摘要`
          : "已翻译市场标题";
        return new Response(JSON.stringify([[[translated]]]), { status: 200 });
      }
      if (url.startsWith("https://query1.finance.yahoo.com/v7/finance/quote")) {
        return new Response(JSON.stringify(yahooPayload), { status: 200 });
      }
      if (url.startsWith("https://api.stlouisfed.org/fred/series/observations")) {
        return new Response(JSON.stringify(fredPayload), { status: 200 });
      }
      if (url.startsWith("https://date.nager.at/api/v3/PublicHolidays/")) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      if (url === "https://open.feishu.cn/open-apis/bot/v2/hook/test-token") {
        return new Response(JSON.stringify({ code: 0, msg: "ok" }), { status: 200 });
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    const appEnv: Env = {
      ...env,
      APP_KV: createMemoryKV(),
      RESEARCH_DB: createBatchOnlyD1(),
      FRED_API_KEY: "fred-key",
    };
    vi.stubGlobal("fetch", fetchMock);
    await saveSettings(appEnv, {
      appName: "GlobalPulse",
      language: "zh",
      timezone: "Asia/Shanghai",
      defaultTargets: ["feishu"],
      outputFormat: "markdown",
      topicFocus: "美股",
      template: "# Brief\n\n{{itemsMarkdown}}",
      schedules: [{
        id: "us-market-cron",
        name: "美股分析（夜间 Cron）",
        enabled: true,
        triggerMode: "cron",
        cronExpression: "30 21 * * *",
        time: "21:30",
        days: [1, 2, 3, 4, 5],
        timezone: "Asia/Shanghai",
        language: "zh",
        outputFormat: "markdown",
        reportType: "us_stock",
        reportMode: "market",
        marketSession: "post_close",
        focusSymbols: ["SPY", "QQQ", "NVDA"],
        positionSymbols: [],
        moduleSwitches: { news: true, macro: true, us_market: true },
        targets: ["feishu"],
        marketCalendar: "us_stock",
        tradingDaySource: "external",
        topicQuery: "US stock Nasdaq Fed earnings",
        template: "# Brief\n\n{{itemsMarkdown}}",
      }],
    });

    const result = await runDueSchedules(appEnv, new Date("2026-05-18T13:30:00Z"));
    const calls = fetchMock.mock.calls;
    const translateCalls = calls.filter((call) => String(call[0]).startsWith("https://translate.googleapis.com/translate_a/single"));
    const fredCalls = calls.filter((call) => String(call[0]).startsWith("https://api.stlouisfed.org/fred/series/observations"));

    expect(result).toMatchObject({ checked: 1, executed: 1, skipped: 0 });
    expect(calls.length).toBeLessThan(30);
    expect(translateCalls.length).toBeLessThanOrEqual(8);
    expect(fredCalls).toHaveLength(4);
    expect(fetchMock).toHaveBeenCalledWith("https://open.feishu.cn/open-apis/bot/v2/hook/test-token", expect.objectContaining({
      method: "POST",
    }));
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
      { title: "头条热榜：暴雨天气影响城市出行", link: "https://news.example.test/platform-cache-4", source: "今日头条热榜", description: "公共安全和城市交通成为讨论焦点。" },
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
        if (/weibo|douyin|热搜|热榜|小红书|知乎/i.test(query)) {
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

  it("does not accept a single repeated headline as a usable daily hot report", async () => {
    let sourceMode: "healthy" | "single" = "healthy";
    const rss = (items: Array<{ title: string; link: string; source: string; description: string }>) => new Response([
      "<rss><channel>",
      ...items.map((item) => [
        "<item>",
        `<title>${item.title}</title>`,
        `<link>${item.link}</link>`,
        `<source>${item.source}</source>`,
        `<description>${item.description}</description>`,
        "<pubDate>Thu, 21 May 2026 01:00:00 GMT</pubDate>",
        "</item>",
      ].join("")),
      "</channel></rss>",
    ].join(""), { status: 200 });
    const globalItems = [
      { title: "国际经济讨论聚焦主要央行利率路径", link: "https://news.example.test/global-quality-1", source: "Reuters", description: "主要央行政策路径影响全球资产定价。" },
      { title: "中东能源运输风险推升避险情绪", link: "https://news.example.test/global-quality-2", source: "AP News", description: "能源和航运市场继续关注地缘风险。" },
      { title: "欧洲财政政策协调进入关键阶段", link: "https://news.example.test/global-quality-3", source: "BBC", description: "财政政策与增长预期影响欧洲市场。" },
      { title: "AI供应链成为全球产业政策重点", link: "https://news.example.test/global-quality-4", source: "Bloomberg", description: "半导体和数据中心投资继续受到关注。" },
    ];
    const domesticItems = [
      { title: "国内消费补贴政策带动服务业讨论", link: "https://news.example.test/domestic-quality-1", source: "Caixin", description: "消费政策和服务业修复成为市场焦点。" },
      { title: "多地公共服务改革聚焦医疗和教育", link: "https://news.example.test/domestic-quality-2", source: "RTHK", description: "民生服务改革持续推进。" },
      { title: "资本市场改革议题继续升温", link: "https://news.example.test/domestic-quality-3", source: "SCMP", description: "监管和融资制度调整影响市场预期。" },
      { title: "就业政策调整释放稳民生信号", link: "https://news.example.test/domestic-quality-4", source: "Nikkei Asia", description: "就业和收入预期是社会关注重点。" },
    ];
    const platformItems = [
      { title: "微博热搜：民生服务新规引发讨论破亿", link: "https://news.example.test/platform-quality-1", source: "微博热搜", description: "民生服务政策进入高热讨论。" },
      { title: "抖音热榜：消费补贴政策受到关注", link: "https://news.example.test/platform-quality-2", source: "抖音热榜", description: "消费政策在社交平台热度上升。" },
      { title: "微博热议：科技创新议题进入热榜", link: "https://news.example.test/platform-quality-3", source: "微博热搜", description: "科技创新和产业政策成为讨论焦点。" },
      { title: "腾讯新闻热榜：暴雨天气影响城市出行", link: "https://news.example.test/platform-quality-4", source: "腾讯新闻热榜", description: "公共安全和交通出行话题升温。" },
    ];
    const repeatedHeadline = {
      title: "重复国际要闻：单一外交新闻连续出现",
      link: "https://news.example.test/repeated-global-only",
      source: "Reuters",
      description: "只有一条国际新闻被所有来源重复返回。",
    };
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.startsWith("https://newsapi.org/v2/")) {
        return new Response(JSON.stringify({ articles: [] }), { status: 200 });
      }

      if (url.startsWith("https://api.gdeltproject.org/api/v2/doc/doc")) {
        return new Response(JSON.stringify({ articles: [] }), { status: 200 });
      }

      if (url.startsWith("https://news.google.com/rss/headlines/section/topic/WORLD")) {
        return rss(sourceMode === "healthy" ? globalItems : [repeatedHeadline]);
      }
      if (url.startsWith("https://news.google.com/rss/headlines/section/topic/NATION")) {
        return rss(sourceMode === "healthy" ? domesticItems : [repeatedHeadline]);
      }
      if (url.startsWith("https://news.google.com/rss/search")) {
        const query = new URL(url).searchParams.get("q") ?? "";
        if (sourceMode === "single") {
          return rss([repeatedHeadline]);
        }
        if (/weibo|douyin|热搜|热榜|小红书|知乎/i.test(query)) {
          return rss(platformItems);
        }
        if (/中国|China policy|site:rthk|site:scmp/i.test(query)) {
          return rss(domesticItems);
        }
        return rss(globalItems);
      }

      return new Response(JSON.stringify({ code: 0, msg: "ok" }), { status: 200 });
    });
    const appEnv: Env = {
      ...env,
      APP_KV: createMemoryKV(),
    };
    const schedule: PulseSchedule = {
      id: "daily-hot-quality",
      name: "每日热点",
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
      topicQuery: "全球热点 国际新闻 国内新闻 微博热搜 抖音热榜",
      template: "# Brief\n\n{{itemsMarkdown}}",
    };
    vi.stubGlobal("fetch", fetchMock);

    const healthyReport = await buildScheduleReport(appEnv, schedule, new Date("2026-05-21T01:30:00Z"));
    expect(healthyReport.sourceStatus).toBe("live");
    expect(healthyReport.body).toContain("民生服务新规");

    sourceMode = "single";
    const fallbackReport = await buildScheduleReport(appEnv, schedule, new Date("2026-05-21T02:00:00Z"));

    expect(fallbackReport.sourceStatus).toBe("fallback");
    expect(fallbackReport.sourceMessage).toContain("too few usable items");
    expect(fallbackReport.body).toContain("最近一次成功缓存");
    expect(fallbackReport.body).toContain("民生服务新规");
    expect(fallbackReport.body).not.toContain("重复国际要闻");
    expect((fallbackReport.body.match(/^\d+\. \*\*/gm) ?? []).length).toBeGreaterThanOrEqual(10);
  });

  it("keeps international-media China-related stories in international daily hot headlines", () => {
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

    expect(internationalSection).toContain("China policy debate");
    expect(internationalSection).toContain("台湾海峡");
    expect(internationalSection).toContain("Beijing announces");
    expect(internationalSection).toContain("Middle East");
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
        { title: "我真要笑死了#AI#火@抖音热点 - 抖音", url: "https://douyin.example.test/vague", source: "抖音", section: "platform", summary: "我真要笑死了#AI#火@抖音热点 抖音", score: 7999 },
        { title: "微博热搜：公共交通票价调整引发讨论", url: "https://news.example.test/platform-1", source: "微博热搜", section: "platform", summary: "多地民生政策成为社交平台讨论焦点。", score: 1200 },
        { title: "抖音热榜：国产芯片发布带动科技讨论", url: "https://news.example.test/platform-2", source: "抖音热榜", section: "platform", summary: "科技产业链话题热度持续上升。", score: 1100 },
      ],
    });
    const topTopicSection = body.split("## 📌 全网热度最高话题")[1]?.split("## 🧩 补充要闻")[0] ?? "";

    expect(body).not.toContain("微博实时热点");
    expect(body).not.toContain("抖音热点榜 - 抖音");
    expect(body).not.toContain("我真要笑死了");
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
