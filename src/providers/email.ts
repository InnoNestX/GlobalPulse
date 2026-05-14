import type { Env } from "../env";
import type { Provider } from "./types";
import { formatPlainText } from "./format";
import { jsonApiResponseToResult, providerNotConfigured } from "./shared";

/**
 * Email provider via Brevo (preferred) or Resend (fallback compatibility)
 *
 * Required env vars:
 *   BREVO_API_KEY        — Brevo API key (preferred)
 *   RESEND_API_KEY       — Resend API key (fallback compatibility)
 *   EMAIL_FROM           — Sender address, e.g. "GlobalPulse <hello@yourdomain.com>"
 *   EMAIL_TO             — Default recipient (overridden by providerSettings.emailRecipients if set)
 *
 * Provider settings (per-user, stored in KV):
 *   emailRecipients      — Comma-separated recipient list (overrides EMAIL_TO)
 *   emailFromOverride    — Optional override of EMAIL_FROM for this user
 *
 * Resend free tier: 3,000 emails/day. No domain required for sandbox (onboarding@resend.dev).
 */
export const emailProvider: Provider = {
  name: "email",
  isConfigured(env) {
    return Boolean(env.EMAIL_FROM) && (Boolean(env.BREVO_API_KEY) || Boolean(env.RESEND_API_KEY));
  },
  async send(message, env) {
    if (!env.EMAIL_FROM || (!env.BREVO_API_KEY && !env.RESEND_API_KEY)) {
      return providerNotConfigured("email");
    }

    // Check if email is explicitly disabled for this schedule (empty emailRecipientIds)
    const emailDisabled = (env as Env & { EMAIL_DISABLED?: boolean }).EMAIL_DISABLED;
    if (emailDisabled) {
      return { provider: "email", ok: true, status: 200, message: "Email disabled for this schedule (no recipients selected)" };
    }

    // Determine recipient(s): injected override > env default
    const recipientList = (env as Env & { EMAIL_RECIPIENTS?: string }).EMAIL_RECIPIENTS
      ?? env.EMAIL_TO
      ?? "";

    if (!recipientList) {
      return {
        provider: "email",
        ok: false,
        status: 400,
        message: "No email recipient configured (set EMAIL_TO or add recipients in address book)",
      };
    }

    const toAddresses = recipientList
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);

    if (!toAddresses.length) {
      return {
        provider: "email",
        ok: false,
        status: 400,
        message: "No valid email recipients found",
      };
    }

    const fromAddress = (env as Env & { EMAIL_FROM_OVERRIDE?: string }).EMAIL_FROM_OVERRIDE
      ?? env.EMAIL_FROM;

    // Build HTML email body — markdown-ish rendering
    const htmlBody = buildHtmlEmail(message.title, message.body);
    const plainTextBody = formatPlainText(message);

    if (env.BREVO_API_KEY) {
      const sender = parseSender(fromAddress);
      const payload = {
        sender,
        to: toAddresses.map((email) => ({ email })),
        subject: message.title,
        htmlContent: htmlBody,
        textContent: plainTextBody,
        tags: message.tags?.slice(0, 10) ?? [],
      };

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      return jsonApiResponseToResult("email", response, (body) => {
        return Boolean(body.messageId || body.messageIds);
      });
    }

    const payload = {
      from: fromAddress,
      to: toAddresses,
      subject: message.title,
      html: htmlBody,
      text: plainTextBody,
      tags: message.tags?.slice(0, 5) ?? [],
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return jsonApiResponseToResult("email", response, (body) => {
      // Resend returns { id: "..." } on success
      return Boolean(body.id);
    });
  },
};

function parseSender(input: string): { email: string; name?: string } {
  const trimmed = input.trim();
  const match = /^(.*?)<([^>]+)>$/.exec(trimmed);
  if (!match) {
    return { email: trimmed };
  }
  const name = (match[1] ?? "").trim().replace(/^"|"$/g, "");
  const email = (match[2] ?? trimmed).trim();
  return name ? { email, name } : { email };
}

function buildHtmlEmail(title: string, body: string): string {
  const escapedTitle = escapeHtml(title);
  const htmlLines = renderMarkdownLikeBody(body);

  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapedTitle}</title>
</head>
<body style="margin:0;padding:0;background:#070b12;color:#f4f7fb;font-family:Inter,ui-sans-serif,system-ui,sans-serif;font-size:14px;line-height:1.6;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
    <div style="background:#0f1724;border-radius:12px;overflow:hidden;box-shadow:0 18px 60px rgba(0,0,0,.25);">
      <div style="padding:20px 24px;border-bottom:1px solid #263548;">
        <h1 style="margin:0;font-size:18px;font-weight:700;color:#4f9cf9;">${escapedTitle}</h1>
        <p style="margin:6px 0 0;font-size:12px;color:#94a3b8;">由 GlobalPulse 自动生成</p>
      </div>
      <div style="padding:20px 24px;">
        ${htmlLines}
      </div>
    </div>
    <p style="margin-top:16px;font-size:11px;color:#475569;text-align:center;">
      GlobalPulse · 全自动市场报告推送服务
    </p>
  </div>
</body>
</html>`;
}

function renderMarkdownLikeBody(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i] ?? "";
    const line = rawLine.trim();

    if (!line) {
      i += 1;
      continue;
    }

    if (isTableLine(line)) {
      const tableLines: string[] = [];
      while (i < lines.length && isTableLine((lines[i] ?? "").trim())) {
        tableLines.push((lines[i] ?? "").trim());
        i += 1;
      }
      const tableHtml = renderTable(tableLines);
      if (tableHtml) blocks.push(tableHtml);
      continue;
    }

    const ordered = /^(\d+)\.\s+(.+)$/.exec(line);
    if (ordered) {
      const items: Array<{ num: number; parts: string[] }> = [];
      while (i < lines.length) {
        const current = (lines[i] ?? "").trim();
        const currentMatch = /^(\d+)\.\s+(.+)$/.exec(current);
        if (!currentMatch) break;

        const num = Number(currentMatch[1]);
        const parts = [(currentMatch[2] ?? "")];
        i += 1;

        while (i < lines.length) {
          const nextRaw = lines[i] ?? "";
          const next = nextRaw.trim();
          if (!next) {
            i += 1;
            if (/^\d+\.\s+/.test((lines[i] ?? "").trim())) {
              break;
            }
            continue;
          }
          if (/^\d+\.\s+/.test(next) || /^#{1,3}\s+/.test(next) || /^[-*]\s+/.test(next) || isTableLine(next)) {
            break;
          }
          parts.push(next);
          i += 1;
        }

        items.push({ num: Number.isFinite(num) ? num : 1, parts });
      }

      const start = Math.max(1, items[0]?.num ?? 1);
      blocks.push(
        `<ol start="${start}" style="margin:8px 0 10px 22px;padding:0;">${
          items.map((item) => `<li style="margin:6px 0;">${item.parts.map((part, idx) =>
            idx === 0
              ? `${renderInline(part)}`
              : `<div style="margin-top:4px;color:#cbd5e1;">${renderInline(part)}</div>`).join("")}</li>`).join("")
        }</ol>`
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const candidate = (lines[i] ?? "").trim();
        if (!/^[-*]\s+/.test(candidate)) break;
        items.push(candidate.replace(/^[-*]\s+/, ""));
        i += 1;
      }
      blocks.push(
        `<ul style="margin:8px 0 10px 20px;padding:0;">${
          items.map((item) => `<li style="margin:4px 0;">${renderInline(item)}</li>`).join("")
        }</ul>`
      );
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push(`<h3 style="margin:16px 0 8px;font-size:15px;font-weight:700;color:#f8fafc;">${renderInline(line.slice(4))}</h3>`);
      i += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(`<h2 style="margin:16px 0 8px;font-size:16px;font-weight:700;color:#f8fafc;">${renderInline(line.slice(3))}</h2>`);
      i += 1;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push(`<h1 style="margin:16px 0 8px;font-size:18px;font-weight:700;color:#f8fafc;">${renderInline(line.slice(2))}</h1>`);
      i += 1;
      continue;
    }

    blocks.push(`<p style="margin:6px 0;">${renderInline(line)}</p>`);
    i += 1;
  }

  return blocks.join("");
}

function isTableLine(line: string): boolean {
  return line.startsWith("|") && line.endsWith("|");
}

function renderTable(lines: string[]): string {
  if (lines.length === 0) return "";
  const rows = lines.map((line) => line.split("|").map((cell) => cell.trim()).filter(Boolean));
  const normalizedRows = rows.filter((row) => row.length > 0 && !row.every((cell) => /^-+$/.test(cell)));
  if (normalizedRows.length === 0) return "";

  const header = normalizedRows[0] ?? [];
  const bodyRows = normalizedRows.slice(1);

  return `<div style="overflow-x:auto;margin:8px 0 12px;"><table style="border-collapse:collapse;width:100%;font-size:13px;">
    <thead><tr>${header.map((cell) => `<th style="border:1px solid #263548;padding:6px 10px;background:#141f2e;text-align:left;">${renderInline(cell)}</th>`).join("")}</tr></thead>
    <tbody>${bodyRows.map((row) => `<tr>${row.map((cell) => `<td style="border:1px solid #263548;padding:6px 10px;">${renderInline(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
  </table></div>`;
}

function renderInline(value: string): string {
  const escaped = escapeHtml(value);

  const linked = escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_match, text, url) => {
    return `<a href="${url}" style="color:#60a5fa;text-decoration:none;">${text}</a>`;
  });

  const bolded = linked.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  return bolded.replace(/`([^`]+)`/g, `<code style="background:#1e293b;border:1px solid #334155;border-radius:4px;padding:0 4px;">$1</code>`);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
