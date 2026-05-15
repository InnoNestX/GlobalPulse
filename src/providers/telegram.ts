import type { Provider } from "./types";
import { escapeHtml, isLockedResearchReportBody } from "./format";
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
    const body = formatTelegramHtml(message.title, message.body);

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

function formatTelegramHtml(title: string, body: string): string {
  if (isLockedResearchReportBody(body)) {
    return convertMarkdownLinksToHtml(body);
  }

  const escapedTitle = escapeHtml(title);
  const convertedBody = convertMarkdownLinksToHtml(body);

  return `<b>${escapedTitle}</b>\n${convertedBody}`;
}

function convertMarkdownLinksToHtml(value: string): string {
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let result = "";
  let lastIndex = 0;

  for (const match of value.matchAll(linkPattern)) {
    const [fullMatch, linkTextRaw, urlRaw] = match;
    const matchIndex = match.index ?? 0;
    result += escapeHtml(value.slice(lastIndex, matchIndex));
    lastIndex = matchIndex + fullMatch.length;

    const normalizedUrl = typeof urlRaw === "string" ? normalizeHttpUrl(urlRaw) : undefined;
    if (!normalizedUrl) {
      continue;
    }

    const linkText = (linkTextRaw || "").trim();
    const anchorText = /^查看原文\d*$/u.test(linkText) || /^source\s*\d*$/iu.test(linkText)
      ? "🔗"
      : linkText;
    result += `<a href="${escapeHtml(normalizedUrl)}">${escapeHtml(anchorText || "🔗")}</a>`;
  }

  result += escapeHtml(value.slice(lastIndex));
  return renderTelegramInlineMarkdown(result);
}

function renderTelegramInlineMarkdown(value: string): string {
  return value
    .replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
    .replace(/^###\s+/gm, "");
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
