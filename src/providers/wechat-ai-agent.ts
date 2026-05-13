import type { Env } from "../env";
import type { Provider } from "./types";
import { formatMarkdown } from "./format";
import { jsonApiResponseToResult, providerNotConfigured } from "./shared";

export const wechatClawbotProvider: Provider = {
  name: "wechat_clawbot",
  isConfigured(env) {
    return Boolean(
      env.WECHAT_CLAWBOT_WEBHOOK_URL
      || env.WECHAT_CLAWBOT_WEBHOOK_KEY
      || env.WECHAT_AI_AGENT_WEBHOOK_URL
      || env.WECHAT_AI_AGENT_WEBHOOK_KEY,
    );
  },
  async send(message, env) {
    const webhookUrl = getWebhookUrl(env);

    if (!webhookUrl) {
      return providerNotConfigured("wechat_clawbot");
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

    return jsonApiResponseToResult("wechat_clawbot", response, (responseBody) => responseBody.errcode === 0);
  },
};

function getWebhookUrl(env: Env): string | undefined {
  if (env.WECHAT_CLAWBOT_WEBHOOK_URL || env.WECHAT_AI_AGENT_WEBHOOK_URL) {
    return env.WECHAT_CLAWBOT_WEBHOOK_URL || env.WECHAT_AI_AGENT_WEBHOOK_URL;
  }

  const webhookKey = env.WECHAT_CLAWBOT_WEBHOOK_KEY || env.WECHAT_AI_AGENT_WEBHOOK_KEY;

  if (webhookKey) {
    const url = new URL("https://qyapi.weixin.qq.com/cgi-bin/webhook/send");
    url.searchParams.set("key", webhookKey);

    return url.toString();
  }

  return undefined;
}
