import type { Provider } from "./types";
import { formatMarkdown } from "./format";
import { jsonApiResponseToResult, providerNotConfigured } from "./shared";

const SLACK_LIMIT = 2900;

export const slackProvider: Provider = {
  name: "slack",
  isConfigured(env) {
    return Boolean(env.SLACK_WEBHOOK_URL);
  },
  async send(message, env) {
    if (!env.SLACK_WEBHOOK_URL) {
      return providerNotConfigured("slack");
    }

    const text = truncate(`*${message.title}*\n${formatMarkdown(message)}`, SLACK_LIMIT);
    const response = await fetch(env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (response.ok) {
      const bodyText = await response.text();
      const ok = !bodyText || bodyText === "ok";
      return { provider: "slack", ok, status: response.status, message: ok ? "ok" : bodyText.slice(0, 200) };
    }

    return jsonApiResponseToResult("slack", response, () => false);
  },
};

function truncate(value: string, limit: number): string {
  return value.length <= limit ? value : `${value.slice(0, limit - 1)}…`;
}
