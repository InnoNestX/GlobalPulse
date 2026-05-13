import type { Env } from "../env";
import type { Provider } from "./types";
import { formatPlainText } from "./format";
import { jsonApiResponseToResult, providerNotConfigured } from "./shared";

export const feishuProvider: Provider = {
  name: "feishu",
  isConfigured(env) {
    return Boolean(env.FEISHU_WEBHOOK_URL);
  },
  async send(message, env) {
    if (!env.FEISHU_WEBHOOK_URL) {
      return providerNotConfigured("feishu");
    }

    const body: Record<string, unknown> = {
      msg_type: "text",
      content: {
        text: formatPlainText(message),
      },
    };

    if (env.FEISHU_SIGNING_SECRET) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      body.timestamp = timestamp;
      body.sign = await createFeishuSign(env.FEISHU_SIGNING_SECRET, timestamp);
    }

    const response = await fetch(env.FEISHU_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    return jsonApiResponseToResult("feishu", response, (responseBody) => {
      const code = responseBody.code ?? responseBody.StatusCode;

      return code === 0 || code === "0";
    });
  },
};

async function createFeishuSign(secret: string, timestamp: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(`${timestamp}\n${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new Uint8Array());

  return base64Encode(signature);
}

function base64Encode(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}
