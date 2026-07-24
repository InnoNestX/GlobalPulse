import type { Env } from "../env";
import { formatTelegramMessage } from "../providers/telegram";

const TELEGRAM_TEXT_LIMIT = 4096;

export interface TelegramChatMessage {
  message_id: number;
  text?: string;
  chat: { id: number; type: string; title?: string; username?: string };
  from?: { id: number; username?: string; first_name?: string; language_code?: string };
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramChatMessage;
  edited_message?: TelegramChatMessage;
  callback_query?: {
    id: string;
    data?: string;
    message?: TelegramChatMessage;
    from?: { id: number };
  };
}

export async function sendTelegramHtml(
  env: Env,
  chatId: string | number,
  title: string,
  body: string,
  options?: { replyMarkup?: unknown },
): Promise<{ ok: boolean; status: number; message: string }> {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, status: 500, message: "TELEGRAM_BOT_TOKEN missing" };
  }

  const text = truncate(formatTelegramMessage(title, body));
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(options?.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
    }),
  });

  const payload = await response.json().catch(() => ({})) as { ok?: boolean; description?: string };
  return {
    ok: response.ok && payload.ok === true,
    status: response.status,
    message: payload.ok ? "Delivered" : (payload.description || "Telegram send failed").slice(0, 300),
  };
}

export async function answerCallbackQuery(env: Env, callbackQueryId: string, text?: string): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text?.slice(0, 180),
      show_alert: false,
    }),
  }).catch(() => undefined);
}

export async function registerTelegramCommands(env: Env): Promise<boolean> {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  const commandsZh = [
    { command: "start", description: "开始使用 / 欢迎" },
    { command: "help", description: "查看命令列表" },
    { command: "brief", description: "立即生成一份简报" },
    { command: "ashare", description: "A股简报" },
    { command: "us", description: "美股简报" },
    { command: "crypto", description: "加密货币简报" },
    { command: "hot", description: "热点简报" },
    { command: "status", description: "查看推送状态" },
  ];

  const scopes = [
    { type: "default" },
    { type: "all_private_chats" },
    { type: "all_group_chats" },
  ];

  let ok = true;
  for (const scope of scopes) {
    const response = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: commandsZh,
        scope,
        language_code: "zh",
      }),
    });
    const payload = await response.json().catch(() => ({})) as { ok?: boolean };
    if (!(response.ok && payload.ok)) ok = false;

    // Also set without language_code as fallback for clients that ignore zh.
    const fallback = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands: commandsZh, scope }),
    });
    const fallbackPayload = await fallback.json().catch(() => ({})) as { ok?: boolean };
    if (!(fallback.ok && fallbackPayload.ok)) ok = false;
  }

  return ok;
}

export async function setTelegramWebhook(env: Env, webhookUrl: string, secretToken?: string): Promise<boolean> {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: false,
      ...(secretToken ? { secret_token: secretToken } : {}),
    }),
  });
  const payload = await response.json().catch(() => ({})) as { ok?: boolean };
  return response.ok && payload.ok === true;
}

export function extractCommand(text: string): { command: string; args: string } | null {
  const trimmed = text.trim();
  const match = trimmed.match(/^\/([a-zA-Z0-9_]+)(?:@[A-Za-z0-9_]+)?(?:\s+([\s\S]*))?$/);
  if (!match) return null;
  return {
    command: (match[1] || "").toLowerCase(),
    args: (match[2] || "").trim(),
  };
}

export function isChatAllowed(env: Env, chatId: number | string): boolean {
  const configured = String(env.TELEGRAM_CHAT_ID || "").trim();
  if (!configured) return false;
  const allowed = configured.split(",").map((part) => part.trim()).filter(Boolean);
  const id = String(chatId);
  return allowed.includes(id);
}

function truncate(value: string): string {
  if (value.length <= TELEGRAM_TEXT_LIMIT) return value;
  return `${value.slice(0, TELEGRAM_TEXT_LIMIT - 1)}…`;
}
