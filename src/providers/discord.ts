import type { Provider } from "./types";
import { formatMarkdown } from "./format";
import { jsonApiResponseToResult, providerNotConfigured } from "./shared";

const DISCORD_LIMIT = 1900;

export const discordProvider: Provider = {
  name: "discord",
  isConfigured(env) {
    return Boolean(env.DISCORD_WEBHOOK_URL);
  },
  async send(message, env) {
    if (!env.DISCORD_WEBHOOK_URL) {
      return providerNotConfigured("discord");
    }

    const content = truncate(`${message.title}\n\n${formatMarkdown(message)}`, DISCORD_LIMIT);
    const response = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        allowed_mentions: { parse: [] },
      }),
    });

    if (response.status === 204 || response.ok) {
      return { provider: "discord", ok: true, status: response.status || 204, message: "ok" };
    }

    return jsonApiResponseToResult("discord", response, () => false);
  },
};

function truncate(value: string, limit: number): string {
  return value.length <= limit ? value : `${value.slice(0, limit - 1)}…`;
}
