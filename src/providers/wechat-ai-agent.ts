import type { Env } from "../env";
import type { Provider } from "./types";
import { formatMarkdown } from "./format";
import { jsonApiResponseToResult, providerNotConfigured } from "./shared";

export const wechatAiAgentProvider: Provider = {
  name: "wechat_ai_agent",
  isConfigured(env) {
    return Boolean(env.WECHAT_AI_AGENT_WEBHOOK_URL || env.WECHAT_AI_AGENT_WEBHOOK_KEY);
  },
  async send(message, env) {
    const webhookUrl = getWebhookUrl(env);

    if (!webhookUrl) {
      return providerNotConfigured("wechat_ai_agent");
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        msgtype: "markdown",
        markdown: {
          content: formatMarkdown(message).slice(0, 4000),
        },
      }),
    });

    return jsonApiResponseToResult("wechat_ai_agent", response, (responseBody) => responseBody.errcode === 0);
  },
};

function getWebhookUrl(env: Env): string | undefined {
  if (env.WECHAT_AI_AGENT_WEBHOOK_URL) {
    return env.WECHAT_AI_AGENT_WEBHOOK_URL;
  }

  if (env.WECHAT_AI_AGENT_WEBHOOK_KEY) {
    const url = new URL("https://qyapi.weixin.qq.com/cgi-bin/webhook/send");
    url.searchParams.set("key", env.WECHAT_AI_AGENT_WEBHOOK_KEY);

    return url.toString();
  }

  return undefined;
}
