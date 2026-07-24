import type { Env } from "../env";
import { getSettings, mergeProviderSettings, type AppSettings, type PulseSchedule, type ReportType } from "../config";
import { mergeMarketDataProviderSettings } from "../market-data-settings";
import { buildScheduleReport } from "../report";
import { getLocalTimeParts } from "../time";
import {
  answerCallbackQuery,
  extractCommand,
  isChatAllowed,
  registerTelegramCommands,
  sendTelegramHtml,
  setTelegramWebhook,
  type TelegramUpdate,
} from "./api";
import { classifyTelegramIntent, type BotIntent } from "./openrouter";

const HELP_BODY = [
  "可用命令（也可点输入框旁菜单）：",
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

  const secret = deliveryEnv.TELEGRAM_WEBHOOK_SECRET?.trim() || env.TELEGRAM_WEBHOOK_SECRET?.trim();
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

  const work = processTelegramUpdate(deliveryEnv, update);
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
}> {
  const settings = await getSettings(env).catch(() => undefined);
  const deliveryEnv = settings ? mergeProviderSettings(env, settings) : env;
  const webhookUrl = `${origin.replace(/\/$/, "")}/api/telegram/webhook`;
  const commands = await registerTelegramCommands(deliveryEnv);
  const webhook = await setTelegramWebhook(
    deliveryEnv,
    webhookUrl,
    deliveryEnv.TELEGRAM_WEBHOOK_SECRET || env.TELEGRAM_WEBHOOK_SECRET,
  );
  return { commands, webhook, webhookUrl };
}

async function processTelegramUpdate(env: Env, update: TelegramUpdate): Promise<void> {
  if (update.callback_query) {
    const chatId = update.callback_query.message?.chat.id;
    const data = update.callback_query.data || "";
    await answerCallbackQuery(env, update.callback_query.id);
    if (chatId == null) return;
    if (!isChatAllowed(env, chatId)) {
      await sendTelegramHtml(env, chatId, "⚠️ 未授权", "此聊天未绑定 GlobalPulse。请在管理后台配置 Telegram Chat ID。");
      return;
    }
    const intent = callbackToIntent(data);
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
    await handleIntent(env, chatId, commandToIntent(parsed.command));
    return;
  }

  const classified = await classifyTelegramIntent(env, message.text);
  if (classified.intent === "unknown") {
    await sendTelegramHtml(
      env,
      chatId,
      "🤖 GlobalPulse",
      classified.reply || "我没太听懂。发送 /help 或点输入框旁的命令菜单。",
    );
    return;
  }

  await handleIntent(env, chatId, classified.intent);
}

async function handleIntent(env: Env, chatId: number, intent: BotIntent): Promise<void> {
  switch (intent) {
    case "start":
      await sendTelegramHtml(env, chatId, "👋 欢迎使用 GlobalPulse", [
        "我是财经与热点简报机器人。",
        "",
        "点输入框左侧 **菜单** 可展开命令列表；",
        "也可以直接发文字，例如「美股简报」。",
        "",
        HELP_BODY,
      ].join("\n"));
      return;
    case "help":
      await sendTelegramHtml(env, chatId, "📖 命令帮助", HELP_BODY);
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
      await sendTelegramHtml(env, chatId, "🤖 GlobalPulse", "发送 /help 查看可用命令。");
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
    "> 定时推送仍由 Cron 触发；这里可手动拉取。",
  ].join("\n"));
}

async function replyBrief(env: Env, chatId: number, reportType: ReportType | undefined): Promise<void> {
  await sendTelegramHtml(env, chatId, "⏳ 生成中", "正在生成简报，请稍候…");

  try {
    const settings = await getSettings(env);
    const schedule = pickSchedule(settings, reportType);
    if (!schedule) {
      await sendTelegramHtml(env, chatId, "📭 暂无任务", reportType
        ? `没有找到启用中的 **${reportType}** 推送任务。请先在管理后台配置。`
        : "没有启用中的推送任务。请先在管理后台配置时间表。");
      return;
    }

    const providerEnv = mergeProviderSettings(env, settings);
    const reportEnv = await mergeMarketDataProviderSettings(providerEnv);
    const report = await buildScheduleReport(reportEnv, schedule, new Date());
    const result = await sendTelegramHtml(env, chatId, report.title, report.body);
    if (!result.ok) {
      await sendTelegramHtml(env, chatId, "❌ 发送失败", result.message);
    }
  } catch (error) {
    await sendTelegramHtml(
      env,
      chatId,
      "❌ 生成失败",
      error instanceof Error ? error.message : "简报生成失败，请稍后重试。",
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
    const hit = enabled.find((schedule) => schedule.reportType === type);
    if (hit) return hit;
  }
  return enabled[0];
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
