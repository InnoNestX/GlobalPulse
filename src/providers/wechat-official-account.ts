import type { Env } from "../env";
import type { PushMessage } from "../messages";
import { formatPlainText } from "./format";
import { jsonApiResponseToResult, providerNotConfigured } from "./shared";
import type { Provider } from "./types";

interface WeChatAccessTokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

export const wechatOfficialAccountProvider: Provider = {
  name: "wechat_official_account",
  isConfigured(env) {
    return Boolean(env.WECHAT_OFFICIAL_APP_ID && env.WECHAT_OFFICIAL_APP_SECRET && env.WECHAT_OFFICIAL_OPENID);
  },
  async send(message, env) {
    if (!env.WECHAT_OFFICIAL_APP_ID || !env.WECHAT_OFFICIAL_APP_SECRET || !env.WECHAT_OFFICIAL_OPENID) {
      return providerNotConfigured("wechat_official_account");
    }

    const accessTokenResult = await getAccessToken(env.WECHAT_OFFICIAL_APP_ID, env.WECHAT_OFFICIAL_APP_SECRET);

    if (!accessTokenResult.ok) {
      return {
        provider: "wechat_official_account",
        ok: false,
        status: 502,
        message: accessTokenResult.message,
      };
    }

    const response = await fetch(`https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${accessTokenResult.accessToken}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createCustomerServiceTextPayload(message, env.WECHAT_OFFICIAL_OPENID)),
    });

    return jsonApiResponseToResult("wechat_official_account", response, (responseBody) => responseBody.errcode === 0);
  },
};

async function getAccessToken(appId: string, appSecret: string): Promise<
  | { ok: true; accessToken: string }
  | { ok: false; message: string }
> {
  const url = new URL("https://api.weixin.qq.com/cgi-bin/token");
  url.searchParams.set("grant_type", "client_credential");
  url.searchParams.set("appid", appId);
  url.searchParams.set("secret", appSecret);

  const response = await fetch(url.toString());
  const body = await response.json() as WeChatAccessTokenResponse;

  if (!response.ok || !body.access_token) {
    return {
      ok: false,
      message: `Failed to get WeChat Official Account access_token: ${body.errmsg ?? response.statusText}`,
    };
  }

  return {
    ok: true,
    accessToken: body.access_token,
  };
}

function createCustomerServiceTextPayload(message: PushMessage, openId: string) {
  return {
    touser: openId,
    msgtype: "text",
    text: {
      content: formatPlainText(message).slice(0, 1900),
    },
  };
}
