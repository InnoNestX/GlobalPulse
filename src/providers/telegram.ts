import type { Provider } from "./types";
import { formatPlainText } from "./format";
import { jsonApiResponseToResult, providerNotConfigured } from "./shared";

export const telegramProvider: Provider = {
  name: "telegram",
  isConfigured(env) {
    return Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);
  },
  async send(message, env) {
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
      return providerNotConfigured("telegram");
    }

    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: formatPlainText(message).slice(0, 4096),
        disable_web_page_preview: true,
        ...(message.actions.length > 0
          ? {
              reply_markup: {
                inline_keyboard: toInlineKeyboard(message.actions),
              },
            }
          : {}),
      }),
    });

    return jsonApiResponseToResult("telegram", response, (responseBody) => responseBody.ok === true);
  },
};

function toInlineKeyboard(actions: Array<{ label: string; url: string }>): Array<Array<{ text: string; url: string }>> {
  const rows: Array<Array<{ text: string; url: string }>> = [];
  const sliced = actions.slice(0, 10);

  for (let index = 0; index < sliced.length; index += 2) {
    const row = sliced.slice(index, index + 2).map((action) => ({
      text: action.label,
      url: action.url,
    }));
    rows.push(row);
  }

  return rows;
}
