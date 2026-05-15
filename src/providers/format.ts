import type { PushMessage } from "../messages";

const levelLabels: Record<PushMessage["level"], string> = {
  info: "Info",
  success: "Success",
  warning: "Warning",
  error: "Error",
};

export const levelColors: Record<PushMessage["level"], number> = {
  info: 0x2563eb,
  success: 0x16a34a,
  warning: 0xd97706,
  error: 0xdc2626,
};

export function formatPlainText(message: PushMessage): string {
  if (isLockedResearchReportBody(message.body)) {
    return message.body;
  }

  const lines = [
    `[${levelLabels[message.level]}] ${message.title}`,
    message.body,
    message.url ? `Link: ${message.url}` : undefined,
  ].filter(Boolean);

  return lines.join("\n");
}

export function formatMarkdown(message: PushMessage): string {
  if (isLockedResearchReportBody(message.body)) {
    return message.body;
  }

  const lines = [
    `**${message.title}**`,
    "",
    message.body,
    "",
    `Level: ${message.level}`,
    message.url ? `[Open link](${message.url})` : undefined,
  ].filter(Boolean);

  return lines.join("\n");
}

export function isLockedResearchReportBody(value: string): boolean {
  return value.trimStart().startsWith("📊 **");
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
