import type { Env } from "../env";
import { formatTelegramMessage, parseTelegramChatIds } from "../providers/telegram";

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

export const TELEGRAM_COMMAND_MENU = [
  { command: "start", description: "开始使用 / 欢迎" },
  { command: "help", description: "查看命令列表" },
  { command: "brief", description: "立即生成一份简报" },
  { command: "ashare", description: "A股简报" },
  { command: "us", description: "美股简报" },
  { command: "crypto", description: "加密货币简报" },
  { command: "hot", description: "热点简报" },
  { command: "status", description: "查看推送状态" },
] as const;

export function buildCommandInlineKeyboard(): {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
} {
  return {
    inline_keyboard: [
      [
        { text: "A股简报", callback_data: "cmd:ashare" },
        { text: "美股简报", callback_data: "cmd:us" },
      ],
      [
        { text: "加密简报", callback_data: "cmd:crypto" },
        { text: "热点简报", callback_data: "cmd:hot" },
      ],
      [
        { text: "立即简报", callback_data: "cmd:brief" },
        { text: "推送状态", callback_data: "cmd:status" },
      ],
      [
        { text: "帮助", callback_data: "cmd:help" },
      ],
    ],
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

  const html = truncate(formatTelegramMessage(title, body));
  const first = await postTelegramMessage(token, chatId, html, "HTML", options?.replyMarkup);
  if (first.ok) return first;

  // Telegram rejects some edge HTML; retry as escaped plain text so commands still deliver.
  const plain = truncate(stripToPlainText(`${title}\n\n${body}`));
  const second = await postTelegramMessage(token, chatId, plain, undefined, options?.replyMarkup);
  if (second.ok) {
    return { ok: true, status: second.status, message: `Delivered(plain-fallback): ${first.message}` };
  }
  return {
    ok: false,
    status: second.status || first.status,
    message: `${first.message} | plain: ${second.message}`,
  };
}

async function postTelegramMessage(
  token: string,
  chatId: string | number,
  text: string,
  parseMode?: "HTML",
  replyMarkup?: unknown,
): Promise<{ ok: boolean; status: number; message: string }> {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
      ...(parseMode ? { parse_mode: parseMode } : {}),
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
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

  const commandsZh = TELEGRAM_COMMAND_MENU.map((entry) => ({
    command: entry.command,
    description: entry.description,
  }));

  const scopes = [
    { type: "default" },
    { type: "all_private_chats" },
    { type: "all_group_chats" },
  ];

  let ok = true;
  for (const scope of scopes) {
    for (const languageCode of ["zh", undefined] as const) {
      const response = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commands: commandsZh,
          scope,
          ...(languageCode ? { language_code: languageCode } : {}),
        }),
      });
      const payload = await response.json().catch(() => ({})) as { ok?: boolean };
      if (!(response.ok && payload.ok)) ok = false;
    }
  }

  // Ensure the chat input menu opens the command list.
  const menuButton = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      menu_button: { type: "commands" },
    }),
  });
  const menuPayload = await menuButton.json().catch(() => ({})) as { ok?: boolean };
  if (!(menuButton.ok && menuPayload.ok)) ok = false;

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
  const payload = await response.json().catch(() => ({})) as { ok?: boolean; description?: string };
  if (!(response.ok && payload.ok === true)) {
    console.warn("setWebhook failed", payload.description || response.status);
    return false;
  }
  return true;
}

export async function getTelegramWebhookInfo(env: Env): Promise<Record<string, unknown> | null> {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const payload = await response.json().catch(() => null) as { ok?: boolean; result?: Record<string, unknown> } | null;
  return payload?.ok ? (payload.result ?? null) : null;
}

export function extractCommand(text: string): { command: string; args: string } | null {
  const trimmed = text.trim();
  // Support "/us", "/us@BotName", and fullwidth slash ＂／＂ occasionally pasted from mobile.
  const normalized = trimmed.replace(/^／/, "/");
  const match = normalized.match(/^\/([a-zA-Z0-9_]+)(?:@[A-Za-z0-9_]+)?(?:\s+([\s\S]*))?$/);
  if (!match) return null;
  return {
    command: (match[1] || "").toLowerCase(),
    args: (match[2] || "").trim(),
  };
}

export function isChatAllowed(env: Env, chatId: number | string): boolean {
  const allowed = parseTelegramChatIds(env.TELEGRAM_CHAT_ID);
  if (!allowed.length) return false;
  return allowed.includes(String(chatId));
}

function stripToPlainText(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[<>&]/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function truncate(value: string): string {
  if (value.length <= TELEGRAM_TEXT_LIMIT) return value;
  return `${value.slice(0, TELEGRAM_TEXT_LIMIT - 1)}…`;
}
