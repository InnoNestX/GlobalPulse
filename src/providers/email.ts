import type { Env } from "../env";
import type { Provider } from "./types";
import { formatPlainText, isLockedResearchReportBody } from "./format";
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
 * Optional env vars:
 *   GLOBALPULSE_LOGO_URL — Optional hosted logo image URL shown at the top of HTML emails
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
    const logoUrl = (env as Env & { GLOBALPULSE_LOGO_URL?: string }).GLOBALPULSE_LOGO_URL;

    // Build HTML email body — markdown-ish rendering
    const htmlBody = buildHtmlEmail(message.title, message.body, logoUrl);
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

function buildHtmlEmail(title: string, body: string, logoUrl?: string): string {
  const escapedTitle = escapeHtml(title);
  const htmlLines = renderMarkdownLikeBody(body);
  const isLockedResearch = isLockedResearchReportBody(body);
  const subtitle = isLockedResearch ? "全自动市场报告" : escapedTitle;

  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapedTitle}</title>
</head>
<body style="margin:0;padding:0;background:#070b12;color:#f4f7fb;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;font-size:14px;line-height:1.6;">
  <div style="max-width:720px;margin:0 auto;padding:24px 16px;">
    <div style="background:#0f1724;border-radius:14px;overflow:hidden;box-shadow:0 18px 60px rgba(0,0,0,.25);border:1px solid #1f2a3a;">
      <div style="padding:20px 24px;border-bottom:1px solid #263548;background:linear-gradient(135deg,#101827 0%,#13233a 55%,#0f1724 100%);">
        ${renderBrandHeader(logoUrl)}
        ${isLockedResearch ? "" : `<h1 style="margin:16px 0 0;font-size:20px;font-weight:800;color:#f8fafc;line-height:1.35;">${escapedTitle}</h1>`}
        <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">${subtitle} · 由 GlobalPulse 自动生成</p>
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

function renderBrandHeader(logoUrl?: string): string {
  const safeLogoUrl = normalizeHttpUrl(logoUrl);

  if (safeLogoUrl) {
    return `<div style="display:flex;align-items:center;gap:12px;">
      <img src="${escapeHtml(safeLogoUrl)}" alt="GlobalPulse" width="36" height="36" style="display:block;width:36px;height:36px;border-radius:10px;object-fit:contain;background:#0b1220;border:1px solid #2b3a50;">
      <div>
        <div style="font-size:17px;line-height:1;font-weight:800;letter-spacing:.2px;color:#f8fafc;">GlobalPulse</div>
        <div style="margin-top:4px;font-size:11px;color:#60a5fa;text-transform:uppercase;letter-spacing:.12em;">Market Intelligence</div>
      </div>
    </div>`;
  }

  return `<div style="display:flex;align-items:center;gap:12px;">
    <div aria-label="GlobalPulse logo" style="width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,#2563eb,#22c55e);display:inline-flex;align-items:center;justify-content:center;color:#ffffff;font-weight:900;font-size:15px;letter-spacing:-.03em;box-shadow:0 8px 24px rgba(37,99,235,.35);">GP</div>
    <div>
      <div style="font-size:17px;line-height:1;font-weight:800;letter-spacing:.2px;color:#f8fafc;">GlobalPulse</div>
      <div style="margin-top:4px;font-size:11px;color:#60a5fa;text-transform:uppercase;letter-spacing:.12em;">Market Intelligence</div>
    </div>
  </div>`;
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
  const rows = lines
    .map(parseMarkdownTableRow)
    .filter((row) => row.length > 0);
  const normalizedRows = rows.filter((row) => !isMarkdownSeparatorRow(row));
  if (normalizedRows.length === 0) return "";

  const header = normalizedRows[0] ?? [];
  const bodyRows = normalizedRows.slice(1).map((row) => normalizeTableRow(row, header.length));

  return `<div style="overflow-x:auto;margin:10px 0 14px;border:1px solid #263548;border-radius:10px;"><table style="border-collapse:collapse;width:100%;min-width:420px;font-size:13px;table-layout:auto;">
    <thead><tr>${header.map((cell) => `<th style="border-bottom:1px solid #263548;padding:8px 10px;background:#141f2e;text-align:left;color:#dbeafe;white-space:nowrap;">${renderInline(cell)}</th>`).join("")}</tr></thead>
    <tbody>${bodyRows.map((row) => `<tr>${row.map((cell) => `<td style="border-top:1px solid #1f2a3a;padding:8px 10px;color:#e2e8f0;vertical-align:top;white-space:nowrap;">${renderInline(cell || "—")}</td>`).join("")}</tr>`).join("")}</tbody>
  </table></div>`;
}

function parseMarkdownTableRow(line: string): string[] {
  const trimmed = line.trim();
  const withoutOuterPipes = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  return withoutOuterPipes.split("|").map((cell) => cell.trim());
}

function isMarkdownSeparatorRow(row: string[]): boolean {
  return row.length > 0 && row.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function normalizeTableRow(row: string[], expectedLength: number): string[] {
  if (expectedLength <= 0) {
    return row;
  }

  if (row.length === expectedLength) {
    return row;
  }

  if (row.length > expectedLength) {
    return row.slice(0, expectedLength - 1).concat(row.slice(expectedLength - 1).join(" | "));
  }

  return [...row, ...Array.from({ length: expectedLength - row.length }, () => "")];
}

function renderInline(value: string): string {
  const escaped = escapeHtml(value);

  const linked = escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_match, text, url) => {
    return `<a href="${url}" style="color:#60a5fa;text-decoration:none;">${text}</a>`;
  });

  const bolded = linked.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  return bolded.replace(/`([^`]+)`/g, `<code style="background:#1e293b;border:1px solid #334155;border-radius:4px;padding:0 4px;">$1</code>`);
}

function normalizeHttpUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}