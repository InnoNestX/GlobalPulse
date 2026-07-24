import type { Provider } from "./types";
import { isLockedResearchReportBody } from "./format";
import { jsonApiResponseToResult, providerNotConfigured } from "./shared";

const TELEGRAM_TEXT_LIMIT = 4096;
const TITLE_SEPARATOR = "────────";

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
    const body = formatTelegramMessage(message.title, message.body);

    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: truncateTelegramHtml(body),
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

/** Exported for preview / tests. */
export function formatTelegramMessage(title: string, body: string): string {
  const cleanedBody = stripNoise(body);
  const htmlBody = markdownToTelegramHtml(cleanedBody);
  const titleHtml = title.trim()
    ? `<b>${escapeTelegramHtml(stripMarkdownDecorations(title.trim()))}</b>\n${TITLE_SEPARATOR}\n`
    : "";

  return `${titleHtml}${htmlBody}`.replace(/\n{3,}/g, "\n\n").trim();
}

function toInlineKeyboard(actions: Array<{ label: string; url: string }>): Array<Array<{ text: string; url: string }>> {
  const rows: Array<{ text: string; url: string }[]> = [];
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

function stripNoise(value: string): string {
  return value
    .replace(/^\s*\[(?:info|success|warning|error)\]\s*/i, "")
    .replace(/^Sources:\s*.*$/gim, "")
    .replace(/^Tags:\s*.*$/gim, "")
    .replace(/^Level:\s*.*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripMarkdownDecorations(value: string): string {
  return value
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function markdownToTelegramHtml(value: string): string {
  if (!value) return "";

  // Research reports already start with emoji + bold markdown title; keep converting.
  const withoutTables = convertMarkdownTables(value);
  const lines = withoutTables.split("\n");
  const output: string[] = [];
  let inBlockquote = false;
  let blockquoteLines: string[] = [];

  const flushBlockquote = () => {
    if (!inBlockquote) return;
    const inner = blockquoteLines.join("\n").trim();
    if (inner) {
      output.push(`<blockquote>${inner}</blockquote>`);
    }
    blockquoteLines = [];
    inBlockquote = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/g, "");

    if (/^>\s?/.test(line)) {
      inBlockquote = true;
      blockquoteLines.push(formatInlineMarkdown(line.replace(/^>\s?/, "")));
      continue;
    }

    flushBlockquote();

    if (!line.trim()) {
      output.push("");
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      output.push(TITLE_SEPARATOR);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1]?.length ?? 2;
      const text = formatInlineMarkdown(heading[2] ?? "");
      if (level <= 2) {
        output.push("", `<b>${text}</b>`, TITLE_SEPARATOR);
      } else {
        output.push("", `<b>${text}</b>`);
      }
      continue;
    }

    // List items keep their bullets; bold labels inside.
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      output.push(formatInlineMarkdown(line));
      continue;
    }

    output.push(formatInlineMarkdown(line));
  }

  flushBlockquote();

  // Research locked bodies already contain a bold title line; avoid double separators at top.
  const joined = output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (isLockedResearchReportBody(value)) {
    return joined.replace(new RegExp(`^${escapeRegExp(TITLE_SEPARATOR)}\\n+`), "");
  }
  return joined;
}

function convertMarkdownTables(value: string): string {
  const lines = value.split("\n");
  const output: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const headerLine = lines[index] ?? "";
    const separatorLine = lines[index + 1] ?? "";

    if (isTableRow(headerLine) && isTableSeparator(separatorLine)) {
      const headers = splitTableRow(headerLine);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && isTableRow(lines[index] ?? "")) {
        rows.push(splitTableRow(lines[index] ?? ""));
        index += 1;
      }

      for (const row of rows) {
        const pairs = headers
          .map((header, headerIndex) => {
            const cell = (row[headerIndex] ?? "").trim();
            if (!cell || cell === "-" || cell === "—") return "";
            const label = header.trim();
            if (!label) return cell;
            // First column is usually the asset name — emphasize it.
            if (headerIndex === 0) return `• **${cell}**`;
            return `${label} ${cell}`;
          })
          .filter(Boolean);

        if (pairs.length > 0) {
          const [first, ...rest] = pairs;
          output.push(rest.length ? `${first}  ·  ${rest.join("  ·  ")}` : first ?? "");
        }
      }
      output.push("");
      continue;
    }

    output.push(headerLine);
    index += 1;
  }

  return output.join("\n");
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.includes("|");
}

function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return false;
  return /^[\s|:\-]+$/.test(trimmed) && trimmed.includes("-");
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function formatInlineMarkdown(value: string): string {
  // Protect links first so escaping does not break them.
  const withLinks = replaceMarkdownLinks(value);
  return withLinks
    .split(/(<a href="https?:\/\/[^"]+">[\s\S]*?<\/a>)/g)
    .map((part) => {
      if (part.startsWith("<a href=")) return part;
      return escapeTelegramHtml(part)
        .replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
        .replace(/__([^_\n]+)__/g, "<b>$1</b>")
        .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<i>$1</i>")
        .replace(/(?<!_)_([^_\n]+)_(?!_)/g, "<i>$1</i>")
        .replace(/`([^`\n]+)`/g, "<code>$1</code>");
    })
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function truncateTelegramHtml(value: string, limit = TELEGRAM_TEXT_LIMIT): string {
  if (value.length <= limit) return value;

  const suffix = "\n…";
  const budget = Math.max(0, limit - suffix.length);
  const lines = value.split("\n");
  const output: string[] = [];
  let length = 0;

  for (const line of lines) {
    const separatorLength = output.length > 0 ? 1 : 0;
    if (length + separatorLength + line.length <= budget) {
      output.push(line);
      length += separatorLength + line.length;
      continue;
    }

    const remaining = budget - length - separatorLength;
    if (remaining > 24) {
      output.push(truncateHtmlLine(line, remaining));
    }
    break;
  }

  const truncated = output.join("\n").replace(/\n+$/g, "");
  return `${truncated}${suffix}`.slice(0, limit);
}

function truncateHtmlLine(line: string, maxLength: number): string {
  let result = "";
  let index = 0;
  const closingTags: string[] = [];

  while (index < line.length) {
    const closingSuffix = closingTags.slice().reverse().join("");
    if (line[index] === "<") {
      const end = line.indexOf(">", index);
      if (end < 0) break;
      const tag = line.slice(index, end + 1);
      const nextClosingTags = updateClosingTags(closingTags, tag);
      const nextClosingSuffix = nextClosingTags.slice().reverse().join("");
      if (result.length + tag.length + nextClosingSuffix.length > maxLength) break;
      result += tag;
      closingTags.splice(0, closingTags.length, ...nextClosingTags);
      index = end + 1;
      continue;
    }

    if (line[index] === "&") {
      const end = line.indexOf(";", index);
      if (end > index) {
        const entity = line.slice(index, end + 1);
        if (result.length + entity.length + closingSuffix.length > maxLength) break;
        result += entity;
        index = end + 1;
        continue;
      }
    }

    const char = line[index] ?? "";
    if (result.length + char.length + closingSuffix.length > maxLength) break;
    result += char;
    index += 1;
  }

  const closingSuffix = closingTags.slice().reverse().join("");
  return result + closingSuffix;
}

function updateClosingTags(current: string[], tag: string): string[] {
  const next = [...current];
  const lower = tag.toLowerCase();

  const openMap: Record<string, string> = {
    "<b>": "</b>",
    "<i>": "</i>",
    "<u>": "</u>",
    "<code>": "</code>",
    "<pre>": "</pre>",
    "<blockquote>": "</blockquote>",
  };

  if (lower.startsWith("<a ")) {
    next.push("</a>");
  } else if (openMap[lower]) {
    next.push(openMap[lower]);
  } else if (lower === "</b>" || lower === "</i>" || lower === "</u>" || lower === "</code>" || lower === "</pre>" || lower === "</blockquote>" || lower === "</a>") {
    const index = next.lastIndexOf(lower);
    if (index >= 0) next.splice(index, 1);
  }

  return next;
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
