import type { Provider } from "./types";
import { formatPlainText } from "./format";
import { jsonApiResponseToResult, providerNotConfigured } from "./shared";

export const telegramProvider: Provider = {
  name: "telegram",
  isConfigured(env) {
    return Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);
  },
  async send(message, env) {
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
      return providerNotConfigured("telegram");
    }
    const actions = normalizeActions(message.actions);
    const body = formatTelegramText(message.title, message.body);

    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: body.slice(0, 4096),
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...(actions.length > 0
          ? {
              reply_markup: {
                inline_keyboard: toInlineKeyboard(actions),
              },
            }
          : {}),
      }),
    });

    return jsonApiResponseToResult("telegram", response, (responseBody) => responseBody.ok === true);
  },
};

function toInlineKeyboard(actions: Array<{ label: string; url: string }>): Array<Array<{ text: string; url: string }>> {
  const rows: Array<Array<{ text: string; url: string }>> = [];
  const sliced = actions.slice(0, 6);

  for (let index = 0; index < sliced.length; index += 2) {
    const row = sliced.slice(index, index + 2).map((action) => ({
      text: action.label,
      url: action.url,
    }));
    rows.push(row);
  }

  return rows;
}

function formatTelegramText(title: string, body: string): string {
  const text = formatPlainText({
    title,
    body,
    level: "info",
    tags: [],
    actions: [],
    metadata: {},
  });

  return formatTelegramHtml(text
    .replace(/Sources:\s*.*$/gim, "")
    .replace(/Tags:\s*.*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim());
}

function formatTelegramHtml(value: string): string {
  const withoutHeadingMarkers = value.replace(/^#{1,6}\s+/gm, "");
  const withLinks = replaceMarkdownLinks(withoutHeadingMarkers);
  return withLinks
    .split(/(<a href="https?:\/\/[^"]+">[\s\S]*?<\/a>)/g)
    .map((part) => part.startsWith("<a href=") ? part : escapeTelegramHtml(part).replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>").replace(/`([^`\n]+)`/g, "$1"))
    .join("");
}

function replaceMarkdownLinks(value: string): string {
  return value.replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, (_match, label: string, rawUrl: string) => {
    const url = normalizeHttpUrl(rawUrl);
    if (!url) {
      return escapeTelegramHtml(label);
    }
    return `<a href="${escapeTelegramAttribute(url)}">${escapeTelegramHtml(label)}</a>`;
  });
}

function escapeTelegramHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeTelegramAttribute(value: string): string {
  return escapeTelegramHtml(value).replace(/"/g, "&quot;");
}

function normalizeActions(actions: Array<{ label: string; url: string }>): Array<{ label: string; url: string }> {
  const normalized: Array<{ label: string; url: string }> = [];
  const seen = new Set<string>();

  for (const action of actions) {
    const url = normalizeHttpUrl(action.url);

    if (!url || seen.has(url)) {
      continue;
    }

    seen.add(url);
    normalized.push({
      label: action.label.trim() || "查看原文",
      url,
    });
  }

  return normalized;
}

function normalizeHttpUrl(value: string): string | undefined {
  try {
    const parsed = new URL(value.trim());

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }

    return parsed.toString();
  } catch {
    return undefined;
  }
}
