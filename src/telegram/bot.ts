import type { Env } from "../env";
import { getSettings, mergeProviderSettings, type AppSettings, type PulseSchedule, type ReportType } from "../config";
import { mergeMarketDataProviderSettings } from "../market-data-settings";
import { buildScheduleReport } from "../report";
import { getLocalTimeParts } from "../time";
import {
  answerCallbackQuery,
  buildCommandInlineKeyboard,
  extractCommand,
  getTelegramWebhookInfo,
  isChatAllowed,
  registerTelegramCommands,
  sendTelegramHtml,
  setTelegramWebhook,
  type TelegramUpdate,
} from "./api";
import { classifyTelegramIntent, type BotIntent } from "./openrouter";

const HELP_BODY = [
  "可用命令（也可点下方按钮 / 输入框旁菜单）：",
  "",
  "• /brief — 立即生成一份简报",
  "• /ashare — A股简报",
  "• /us — 美股简报",
  "• /crypto — 加密货币简报",
  "• /hot — 热点简报",
  "• /status — 查看推送状态",
  "• /help — 显示本说明",
  "",
  "也可以直接说：",
  "• 「给我看美股」",
  "• 「A股怎么样」",
  "• 「加密行情」",
  "• 「今天有什么热点」",
].join("\n");

export async function handleTelegramWebhook(
  request: Request,
  env: Env,
  ctx?: ExecutionContext,
): Promise<Response> {
  const settings = await getSettings(env).catch(() => undefined);
  const deliveryEnv = settings ? mergeProviderSettings(env, settings) : env;

  if (!deliveryEnv.TELEGRAM_BOT_TOKEN) {
    return json({ ok: false, error: "Telegram bot not configured" }, 503);
  }

  const secret = env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (secret) {
    const header = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
    if (header !== secret) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }
  }

  let update: TelegramUpdate;
  try {
    update = await request.json() as TelegramUpdate;
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  // Keep bindings from original env; overlay telegram credentials from settings.
  const runtimeEnv: Env = {
    ...env,
    TELEGRAM_BOT_TOKEN: deliveryEnv.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID: deliveryEnv.TELEGRAM_CHAT_ID,
    OPENROUTER_API_KEY: env.OPENROUTER_API_KEY || deliveryEnv.OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL: env.OPENROUTER_BASE_URL || deliveryEnv.OPENROUTER_BASE_URL,
    OPENROUTER_MODEL: env.OPENROUTER_MODEL || deliveryEnv.OPENROUTER_MODEL,
  };

  const work = processTelegramUpdate(runtimeEnv, update);
  if (ctx?.waitUntil) {
    ctx.waitUntil(work.catch((error) => console.error("Telegram update failed", error)));
    return json({ ok: true });
  }

  await work;
  return json({ ok: true });
}

export async function bootstrapTelegramBot(env: Env, origin: string): Promise<{
  commands: boolean;
  webhook: boolean;
  webhookUrl: string;
  webhookInfo: Record<string, unknown> | null;
}> {
  const settings = await getSettings(env).catch(() => undefined);
  const deliveryEnv = settings ? mergeProviderSettings(env, settings) : env;
  const runtimeEnv: Env = {
    ...env,
    TELEGRAM_BOT_TOKEN: deliveryEnv.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID: deliveryEnv.TELEGRAM_CHAT_ID,
  };
  const webhookUrl = `${origin.replace(/\/$/, "")}/api/telegram/webhook`;
  const commands = await registerTelegramCommands(runtimeEnv);
  const webhook = await setTelegramWebhook(runtimeEnv, webhookUrl, env.TELEGRAM_WEBHOOK_SECRET);
  const webhookInfo = await getTelegramWebhookInfo(runtimeEnv);
  return { commands, webhook, webhookUrl, webhookInfo };
}

/** Smoke-test slash/menu intents by pushing real replies to the configured chat. */
export async function verifyTelegramCommands(env: Env): Promise<{
  ok: boolean;
  chatId?: string;
  results: Array<{ command: string; ok: boolean; message: string }>;
}> {
  const settings = await getSettings(env);
  const deliveryEnv = mergeProviderSettings(env, settings);
  const runtimeEnv: Env = {
    ...env,
    TELEGRAM_BOT_TOKEN: deliveryEnv.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID: deliveryEnv.TELEGRAM_CHAT_ID,
  };
  const chatId = String(runtimeEnv.TELEGRAM_CHAT_ID || "").split(",")[0]?.trim();
  if (!runtimeEnv.TELEGRAM_BOT_TOKEN || !chatId) {
    return { ok: false, results: [{ command: "*", ok: false, message: "Telegram 未配置" }] };
  }

  const results: Array<{ command: string; ok: boolean; message: string }> = [];

  // Lightweight commands first.
  for (const command of ["help", "status"] as const) {
    try {
      await handleIntent(runtimeEnv, Number(chatId), command);
      results.push({ command: `/${command}`, ok: true, message: "ok" });
    } catch (error) {
      results.push({
        command: `/${command}`,
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // One real brief push to prove end-to-end generation + delivery.
  try {
    await handleIntent(runtimeEnv, Number(chatId), "brief");
    results.push({ command: "/brief", ok: true, message: "ok" });
  } catch (error) {
    results.push({
      command: "/brief",
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    ok: results.every((entry) => entry.ok),
    chatId,
    results,
  };
}

async function processTelegramUpdate(env: Env, update: TelegramUpdate): Promise<void> {
  if (update.callback_query) {
    const chatId = update.callback_query.message?.chat.id;
    const data = update.callback_query.data || "";
    await answerCallbackQuery(env, update.callback_query.id, "收到，正在处理…");
    if (chatId == null) return;
    if (!isChatAllowed(env, chatId)) {
      await sendTelegramHtml(env, chatId, "⚠️ 未授权", "此聊天未绑定 GlobalPulse。请在管理后台配置 Telegram Chat ID。");
      return;
    }
    const intent = callbackToIntent(data);
    if (intent === "unknown") {
      await sendTelegramHtml(env, chatId, "📖 命令帮助", HELP_BODY, {
        replyMarkup: buildCommandInlineKeyboard(),
      });
      return;
    }
    await handleIntent(env, chatId, intent);
    return;
  }

  const message = update.message || update.edited_message;
  if (!message?.text) return;

  const chatId = message.chat.id;
  if (!isChatAllowed(env, chatId)) {
    await sendTelegramHtml(env, chatId, "⚠️ 未授权", [
      "这个聊天还没有授权接收 GlobalPulse。",
      "",
      `当前 Chat ID：\`${chatId}\``,
      "请把它填到管理后台的 Telegram Chat ID，或加入已配置的群。",
    ].join("\n"));
    return;
  }

  const parsed = extractCommand(message.text);
  if (parsed) {
    const intent = commandToIntent(parsed.command);
    if (intent === "unknown") {
      await sendTelegramHtml(env, chatId, "📖 命令帮助", HELP_BODY, {
        replyMarkup: buildCommandInlineKeyboard(),
      });
      return;
    }
    await handleIntent(env, chatId, intent);
    return;
  }

  const classified = await classifyTelegramIntent(env, message.text);
  if (classified.intent === "unknown") {
    await sendTelegramHtml(
      env,
      chatId,
      "🤖 GlobalPulse",
      classified.reply || "我没太听懂。可点下方按钮，或发送 /help。",
      { replyMarkup: buildCommandInlineKeyboard() },
    );
    return;
  }

  await handleIntent(env, chatId, classified.intent);
}

async function handleIntent(env: Env, chatId: number, intent: BotIntent): Promise<void> {
  const keyboard = buildCommandInlineKeyboard();
  switch (intent) {
    case "start":
      await sendTelegramHtml(env, chatId, "👋 欢迎使用 GlobalPulse", [
        "我是财经与热点简报机器人。",
        "",
        "点输入框左侧 **菜单**，或直接点下方按钮：",
        "",
        HELP_BODY,
      ].join("\n"), { replyMarkup: keyboard });
      return;
    case "help":
      await sendTelegramHtml(env, chatId, "📖 命令帮助", HELP_BODY, { replyMarkup: keyboard });
      return;
    case "status":
      await replyStatus(env, chatId);
      return;
    case "brief":
      await replyBrief(env, chatId, undefined);
      return;
    case "ashare":
      await replyBrief(env, chatId, "a_share");
      return;
    case "us":
      await replyBrief(env, chatId, "us_stock");
      return;
    case "crypto":
      await replyBrief(env, chatId, "crypto");
      return;
    case "hot":
      await replyBrief(env, chatId, "daily_hot");
      return;
    default:
      await sendTelegramHtml(env, chatId, "🤖 GlobalPulse", "发送 /help 查看可用命令。", {
        replyMarkup: keyboard,
      });
  }
}

async function replyStatus(env: Env, chatId: number): Promise<void> {
  const settings = await getSettings(env);
  const now = new Date();
  const lines = settings.schedules
    .filter((schedule) => schedule.enabled)
    .slice(0, 12)
    .map((schedule) => {
      const local = getLocalTimeParts(now, schedule.timezone, schedule.language);
      return `• **${schedule.name}**\n  ${schedule.reportType} · ${schedule.time} · ${schedule.timezone}\n  当前本地时间 ${local.label}`;
    });

  await sendTelegramHtml(env, chatId, "📊 推送状态", [
    `应用：${settings.appName}`,
    `内容语言：${settings.language === "en" ? "English" : "中文"}`,
    `启用任务：${settings.schedules.filter((s) => s.enabled).length} / ${settings.schedules.length}`,
    "",
    lines.length ? lines.join("\n\n") : "_暂无启用中的推送任务_",
    "",
    "> 定时推送仍由 Cron 触发；点下方按钮可立即拉取。",
  ].join("\n"), { replyMarkup: buildCommandInlineKeyboard() });
}

async function replyBrief(env: Env, chatId: number, reportType: ReportType | undefined): Promise<void> {
  await sendTelegramHtml(env, chatId, "⏳ 生成中", "正在生成简报，请稍候…");

  try {
    const settings = await getSettings(env);
    const schedule = pickSchedule(settings, reportType);
    if (!schedule) {
      await sendTelegramHtml(env, chatId, "📭 暂无任务", reportType
        ? `没有找到启用中的 **${reportType}** 推送任务。请先在管理后台配置。`
        : "没有启用中的推送任务。请先在管理后台配置时间表。", {
        replyMarkup: buildCommandInlineKeyboard(),
      });
      return;
    }

    const providerEnv = mergeProviderSettings(env, settings);
    const reportEnv = await mergeMarketDataProviderSettings(providerEnv);
    // Keep telegram credentials for the reply chat path.
    reportEnv.TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN || reportEnv.TELEGRAM_BOT_TOKEN;
    reportEnv.TELEGRAM_CHAT_ID = env.TELEGRAM_CHAT_ID || reportEnv.TELEGRAM_CHAT_ID;

    const report = await buildScheduleReport(reportEnv, schedule, new Date());
    const result = await sendTelegramHtml(env, chatId, report.title, report.body, {
      replyMarkup: buildCommandInlineKeyboard(),
    });
    if (!result.ok) {
      await sendTelegramHtml(env, chatId, "❌ 发送失败", result.message, {
        replyMarkup: buildCommandInlineKeyboard(),
      });
    }
  } catch (error) {
    await sendTelegramHtml(
      env,
      chatId,
      "❌ 生成失败",
      error instanceof Error ? error.message : "简报生成失败，请稍后重试。",
      { replyMarkup: buildCommandInlineKeyboard() },
    );
  }
}

function pickSchedule(settings: AppSettings, reportType?: ReportType): PulseSchedule | undefined {
  const enabled = settings.schedules.filter((schedule) => schedule.enabled);
  if (reportType) {
    return enabled.find((schedule) => schedule.reportType === reportType && schedule.targets.includes("telegram"))
      || enabled.find((schedule) => schedule.reportType === reportType)
      || undefined;
  }

  const preferredOrder: ReportType[] = ["daily_hot", "a_share", "us_stock", "crypto", "custom"];
  for (const type of preferredOrder) {
    const hit = enabled.find((schedule) => schedule.reportType === type && schedule.targets.includes("telegram"))
      || enabled.find((schedule) => schedule.reportType === type);
    if (hit) return hit;
  }
  return enabled.find((schedule) => schedule.targets.includes("telegram")) || enabled[0];
}

function commandToIntent(command: string): BotIntent {
  switch (command) {
    case "start":
      return "start";
    case "help":
      return "help";
    case "brief":
    case "report":
      return "brief";
    case "ashare":
    case "a_share":
    case "cn":
      return "ashare";
    case "us":
    case "usstock":
    case "us_stock":
      return "us";
    case "crypto":
    case "btc":
      return "crypto";
    case "hot":
    case "news":
      return "hot";
    case "status":
      return "status";
    default:
      return "unknown";
  }
}

function callbackToIntent(data: string): BotIntent {
  const normalized = data.replace(/^cmd:/, "").toLowerCase();
  return commandToIntent(normalized);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
