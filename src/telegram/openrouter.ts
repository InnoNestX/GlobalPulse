/** OpenRouter free-model client (OpenAI-compatible). */

import type { Env } from "../env";

export const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
/** Auto-picks an available free model. */
export const DEFAULT_OPENROUTER_MODEL = "openrouter/free";

export type BotIntent =
  | "start"
  | "help"
  | "brief"
  | "ashare"
  | "us"
  | "crypto"
  | "hot"
  | "status"
  | "unknown";

export interface IntentResult {
  intent: BotIntent;
  reply?: string;
}

export function resolveOpenRouterModel(envModel?: string): string {
  const trimmed = envModel?.trim();
  return trimmed || DEFAULT_OPENROUTER_MODEL;
}

export function resolveOpenRouterBaseUrl(envUrl?: string): string {
  return (envUrl?.trim() || DEFAULT_OPENROUTER_BASE_URL).replace(/\/$/, "");
}

export async function classifyTelegramIntent(env: Env, text: string): Promise<IntentResult> {
  const apiKey = env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return { intent: "unknown", reply: "还没配置 OpenRouter，请先用菜单里的命令，例如 /help" };
  }

  const heuristic = heuristicIntent(text);
  if (heuristic !== "unknown") {
    return { intent: heuristic };
  }

  try {
    const response = await fetch(`${resolveOpenRouterBaseUrl(env.OPENROUTER_BASE_URL)}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://globalpulse.xuxuclassmate.workers.dev",
        "X-Title": "GlobalPulse Telegram Bot",
      },
      body: JSON.stringify({
        model: resolveOpenRouterModel(env.OPENROUTER_MODEL),
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "你是 GlobalPulse 财经简报机器人的意图分类器。",
              "只输出 JSON：{\"intent\":\"...\",\"reply\":\"可选中文短回复\"}",
              "intent 只能是: start, help, brief, ashare, us, crypto, hot, status, unknown",
              "ashare=A股, us=美股, crypto=加密货币, hot=热点, brief=通用简报, status=状态, help=帮助",
              "无法判断时 intent=unknown，并给一句简短中文引导用户使用 /help",
            ].join("\n"),
          },
          { role: "user", content: text.slice(0, 500) },
        ],
      }),
    });

    if (!response.ok) {
      console.warn("OpenRouter intent failed", response.status);
      return { intent: "unknown", reply: "我没太听懂。可以点输入框旁的菜单，或发送 /help 查看命令。" };
    }

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content ?? "";
    return parseIntentJson(content);
  } catch (error) {
    console.warn("OpenRouter intent error", error);
    return { intent: "unknown", reply: "暂时无法理解这句话。请试试 /ashare /us /crypto /hot" };
  }
}

function heuristicIntent(text: string): BotIntent {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return "unknown";
  if (/帮助|怎么用|命令|菜单/.test(normalized)) return "help";
  if (/状态|下次|何时|什么时候推/.test(normalized)) return "status";
  if (/a股|沪深|上证|深证|创业板/.test(normalized)) return "ashare";
  if (/美股|纳斯达克|标普|道琼斯|spy|qqq/.test(normalized)) return "us";
  if (/加密|比特币|btc|eth|币圈/.test(normalized)) return "crypto";
  if (/热点|新闻|热搜|头条/.test(normalized)) return "hot";
  if (/简报|报告|行情|盘前|盘后|给我看|发一份/.test(normalized)) return "brief";
  return "unknown";
}

function parseIntentJson(content: string): IntentResult {
  try {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    const raw = start >= 0 && end > start ? content.slice(start, end + 1) : content;
    const parsed = JSON.parse(raw) as { intent?: string; reply?: string };
    const intent = normalizeIntent(parsed.intent);
    return {
      intent,
      reply: typeof parsed.reply === "string" ? parsed.reply.slice(0, 300) : undefined,
    };
  } catch {
    return { intent: "unknown", reply: "我没太听懂。发送 /help 查看可用命令。" };
  }
}

function normalizeIntent(value: unknown): BotIntent {
  const allowed: BotIntent[] = ["start", "help", "brief", "ashare", "us", "crypto", "hot", "status", "unknown"];
  return typeof value === "string" && allowed.includes(value as BotIntent)
    ? value as BotIntent
    : "unknown";
}
