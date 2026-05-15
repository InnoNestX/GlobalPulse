import type { Env } from "../env";
import type { Provider } from "./types";
import { formatPlainText, isLockedResearchReportBody } from "./format";
import { jsonApiResponseToResult, providerNotConfigured } from "./shared";

const EMAIL_LOGO_URL = "https://pulse.xuxuclassmate.com/assets/globalpulse-symbol-v5.jpg";

/**
 * Email provider via Brevo (preferred) or Resend (fallback compatibility)
 *
 * Required env vars:
 *   BREVO_API_KEY        — Brevo API key (preferred)
 *   RESEND_API_KEY       — Resend API key (fallback compatibility)
 *   EMAIL_FROM           — Sender address, e.g. "GlobalPulse <hello@yourdomain.com>"
 *   EMAIL_TO             — Default recipient (overridden by providerSettings.emailRecipients if set)
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

    const emailDisabled = (env as Env & { EMAIL_DISABLED?: boolean }).EMAIL_DISABLED;
    if (emailDisabled) {
      return { provider: "email", ok: true, status: 200, message: "Email disabled for this schedule (no recipients selected)" };
    }

    const recipientList = (env as Env & { EMAIL_RECIPIENTS?: string }).EMAIL_RECIPIENTS ?? env.EMAIL_TO ?? "";
    if (!recipientList) {
      return { provider: "email", ok: false, status: 400, message: "No email recipient configured (set EMAIL_TO or add recipients in address book)" };
    }

    const toAddresses = recipientList.split(",").map((s: string) => s.trim()).filter(Boolean);
    if (!toAddresses.length) {
      return { provider: "email", ok: false, status: 400, message: "No valid email recipients found" };
    }

    const fromAddress = (env as Env & { EMAIL_FROM_OVERRIDE?: string }).EMAIL_FROM_OVERRIDE ?? env.EMAIL_FROM;
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
        headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      return jsonApiResponseToResult("email", response, (body) => Boolean(body.messageId || body.messageIds));
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromAddress, to: toAddresses, subject: message.title, html: htmlBody, text: plainTextBody, tags: message.tags?.slice(0, 5) ?? [] }),
    });

    return jsonApiResponseToResult("email", response, (body) => Boolean(body.id));
  },
};

function parseSender(input: string): { email: string; name?: string } {
  const trimmed = input.trim();
  const match = /^(.*?)<([^>]+)>$/.exec(trimmed);
  if (!match) return { email: trimmed };
  const name = (match[1] ?? "").trim().replace(/^"|"$/g, "");
  const email = (match[2] ?? trimmed).trim();
  return name ? { email, name } : { email };
}

function buildHtmlEmail(title: string, body: string): string {
  const escapedTitle = escapeHtml(title);
  const htmlLines = renderMarkdownLikeBody(body);
  const isLockedResearch = isLockedResearchReportBody(body);

  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapedTitle}</title>
</head>
<body style="margin:0;padding:0;background:#07101c;color:#f4f7fb;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;font-size:14px;line-height:1.6;">
  <div style="max-width:720px;margin:0 auto;padding:24px 16px;">
    <div style="background:#0f1724;border-radius:16px;overflow:hidden;box-shadow:0 18px 60px rgba(0,0,0,.24);border:1px solid #1f2a3a;">
      <div style="padding:0;border-bottom:1px solid #263548;background:#0f1724;">
        ${renderBrandHeader()}
        ${isLockedResearch ? "" : `<div style="padding:0 28px 20px;"><h1 style="margin:0;font-size:20px;font-weight:800;color:#f8fafc;line-height:1.35;">${escapedTitle}</h1></div>`}
      </div>
      <div style="padding:20px 24px;">${htmlLines}</div>
    </div>
    <p style="margin-top:16px;font-size:11px;color:#475569;text-align:center;">GlobalPulse · 全自动市场报告推送服务</p>
  </div>
</body>
</html>`;
}

function renderBrandHeader(): string {
  return `<div style="padding:24px 28px;background:linear-gradient(135deg,#061936 0%,#0c2a54 58%,#071322 100%);">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;">
      <tr>
        <td style="vertical-align:middle;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
              <td width="86" style="width:86px;vertical-align:middle;">
                <img src="${EMAIL_LOGO_URL}" alt="GlobalPulse" width="72" height="54" style="display:block;width:72px;height:54px;border:0;outline:none;text-decoration:none;object-fit:contain;">
              </td>
              <td width="1" style="width:1px;background:#5b7ba8;opacity:.55;font-size:0;line-height:0;">&nbsp;</td>
              <td style="vertical-align:middle;padding-left:28px;">
                <div style="font-size:34px;line-height:1;font-weight:900;letter-spacing:-.035em;color:#f8fafc;white-space:nowrap;">Global<span style="color:#38bdf8;">Pulse</span></div>
                <div style="margin-top:10px;font-size:13px;color:#dbeafe;text-transform:uppercase;letter-spacing:.24em;white-space:nowrap;">Market Intelligence</div>
              </td>
            </tr>
          </table>
        </td>
        <td style="vertical-align:middle;text-align:right;padding-left:18px;">
          <div style="font-size:18px;color:#f8fafc;font-weight:800;white-space:nowrap;">全自动市场报告</div>
          <div style="margin-top:9px;font-size:14px;color:#cbd5e1;white-space:nowrap;">由 GlobalPulse 自动生成</div>
        </td>
      </tr>
    </table>
  </div>`;
}

function renderMarkdownLikeBody(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i] ?? "";
    const line = rawLine.trim();
    if (!line) { i += 1; continue; }

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
      const items: string[] = [];
      while (i < lines.length) {
        const current = (lines[i] ?? "").trim();
        const match = /^(\d+)\.\s+(.+)$/.exec(current);
        if (!match) break;
        items.push(match[2] ?? "");
        i += 1;
      }
      blocks.push(`<ol style="margin:8px 0 10px 22px;padding:0;">${items.map((item) => `<li style="margin:6px 0;">${renderInline(item)}</li>`).join("")}</ol>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const current = (lines[i] ?? "").trim();
        if (!/^[-*]\s+/.test(current)) break;
        items.push(current.replace(/^[-*]\s+/, ""));
        i += 1;
      }
      blocks.push(`<ul style="margin:8px 0 10px 20px;padding:0;">${items.map((item) => `<li style="margin:4px 0;">${renderInline(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (line.startsWith("### ")) blocks.push(`<h3 style="margin:16px 0 8px;font-size:15px;font-weight:700;color:#f8fafc;">${renderInline(line.slice(4))}</h3>`);
    else if (line.startsWith("## ")) blocks.push(`<h2 style="margin:16px 0 8px;font-size:16px;font-weight:700;color:#f8fafc;">${renderInline(line.slice(3))}</h2>`);
    else if (line.startsWith("# ")) blocks.push(`<h1 style="margin:16px 0 8px;font-size:18px;font-weight:700;color:#f8fafc;">${renderInline(line.slice(2))}</h1>`);
    else blocks.push(`<p style="margin:6px 0;">${renderInline(line)}</p>`);
    i += 1;
  }

  return blocks.join("");
}

function isTableLine(line: string): boolean {
  return line.startsWith("|") && line.endsWith("|");
}

function renderTable(lines: string[]): string {
  const rows = lines.map(parseMarkdownTableRow).filter((row) => row.length > 0 && !isMarkdownSeparatorRow(row));
  if (!rows.length) return "";
  const header = rows[0] ?? [];
  const bodyRows = rows.slice(1).map((row) => normalizeTableRow(row, header.length));
  return `<div style="overflow-x:auto;margin:10px 0 14px;border:1px solid #263548;border-radius:10px;"><table style="border-collapse:collapse;width:100%;min-width:420px;font-size:13px;table-layout:auto;">
    <thead><tr>${header.map((cell) => `<th style="border-bottom:1px solid #263548;padding:8px 10px;background:#141f2e;text-align:left;color:#dbeafe;white-space:nowrap;">${renderInline(cell)}</th>`).join("")}</tr></thead>
    <tbody>${bodyRows.map((row) => `<tr>${row.map((cell) => `<td style="border-top:1px solid #1f2a3a;padding:8px 10px;color:#e2e8f0;vertical-align:top;white-space:nowrap;">${renderInline(cell || "—")}</td>`).join("")}</tr>`).join("")}</tbody>
  </table></div>`;
}

function parseMarkdownTableRow(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function isMarkdownSeparatorRow(row: string[]): boolean {
  return row.length > 0 && row.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function normalizeTableRow(row: string[], expectedLength: number): string[] {
  if (expectedLength <= 0 || row.length === expectedLength) return row;
  if (row.length > expectedLength) return row.slice(0, expectedLength - 1).concat(row.slice(expectedLength - 1).join(" | "));
  return [...row, ...Array.from({ length: expectedLength - row.length }, () => "")];
}

function renderInline(value: string): string {
  const escaped = escapeHtml(value);
  const linked = escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_match, text, url) => `<a href="${url}" style="color:#60a5fa;text-decoration:none;">${text}</a>`);
  const bolded = linked.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  return bolded.replace(/`([^`]+)`/g, `<code style="background:#1e293b;border:1px solid #334155;border-radius:4px;padding:0 4px;">$1</code>`);
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
