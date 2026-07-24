/** OpenRouter free-model client with automatic failover. */

import type { Env } from "../env";

export const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
/** Router that picks a free model when available. */
export const DEFAULT_OPENROUTER_MODEL = "openrouter/free";

/** Static fallbacks if the live /models catalog cannot be fetched. */
export const OPENROUTER_FREE_FALLBACKS = [
  "openrouter/free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "openai/gpt-oss-20b:free",
  "inclusionai/ling-3.0-flash:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "poolside/laguna-m.1:free",
  "poolside/laguna-s-2.1:free",
] as const;

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
  model?: string;
}

interface FreeModelCache {
  at: number;
  models: string[];
}

let freeModelCache: FreeModelCache | null = null;
const FREE_MODEL_CACHE_MS = 30 * 60 * 1000;

export function resolveOpenRouterModel(envModel?: string): string {
  const trimmed = envModel?.trim();
  return trimmed || DEFAULT_OPENROUTER_MODEL;
}

export function resolveOpenRouterBaseUrl(envUrl?: string): string {
  return (envUrl?.trim() || DEFAULT_OPENROUTER_BASE_URL).replace(/\/$/, "");
}

export function resolveOpenRouterModelCandidates(envModel?: string, liveFreeModels: string[] = []): string[] {
  const preferred = resolveOpenRouterModel(envModel);
  const freeOnly = [...liveFreeModels, ...OPENROUTER_FREE_FALLBACKS].filter((model) => isUsableFreeChatModel(model));
  return Array.from(new Set([preferred, ...freeOnly]));
}

export async function classifyTelegramIntent(env: Env, text: string): Promise<IntentResult> {
  const cleaned = text.trim();
  if (!cleaned) {
    return { intent: "unknown", reply: "请发送内容，或点菜单选择命令。" };
  }

  // Fast path: Chinese/English keyword matching — no LLM needed.
  const heuristic = heuristicIntent(cleaned);
  if (heuristic !== "unknown") {
    return { intent: heuristic };
  }

  const apiKey = env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return {
      intent: "unknown",
      reply: "可以说「给我看美股」「A股怎么样」「今天热点」，或发送 /help。",
    };
  }

  const liveFree = await listOpenRouterFreeModels(env, apiKey);
  const models = resolveOpenRouterModelCandidates(env.OPENROUTER_MODEL, liveFree);
  const errors: string[] = [];

  for (const model of models.slice(0, 8)) {
    try {
      const content = await callOpenRouterChat(env, apiKey, model, cleaned);
      if (!content) {
        errors.push(`${model}: empty`);
        continue;
      }
      const parsed = parseIntentJson(content);
      if (parsed.intent === "unknown" && !parsed.reply) {
        // Model answered but poorly — try next free model.
        errors.push(`${model}: unknown`);
        continue;
      }
      return { ...parsed, model };
    } catch (error) {
      errors.push(`${model}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.warn("OpenRouter free-model failover exhausted", errors.slice(0, 6).join(" | "));
  return {
    intent: "unknown",
    reply: "我没太听懂。可以直接说「给我看美股」「A股怎么样」「加密行情」「今日热点」，或点菜单。",
  };
}

export async function listOpenRouterFreeModels(env: Env, apiKey: string): Promise<string[]> {
  if (freeModelCache && Date.now() - freeModelCache.at < FREE_MODEL_CACHE_MS) {
    return freeModelCache.models;
  }

  try {
    const response = await fetch(`${resolveOpenRouterBaseUrl(env.OPENROUTER_BASE_URL)}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!response.ok) return [...OPENROUTER_FREE_FALLBACKS];

    const payload = await response.json() as {
      data?: Array<{ id?: string; pricing?: { prompt?: string | number; completion?: string | number } }>;
    };

    const models = (payload.data ?? [])
      .map((entry) => String(entry.id || "").trim())
      .filter((id) => id && isFreePricingModel(id, payload.data?.find((entry) => entry.id === id)?.pricing))
      .filter((id) => isUsableFreeChatModel(id));

    // Prefer the free router and general chat models first.
    models.sort((a, b) => freeModelRank(a) - freeModelRank(b));
    freeModelCache = { at: Date.now(), models };
    return models;
  } catch (error) {
    console.warn("Failed to list OpenRouter free models", error);
    return [...OPENROUTER_FREE_FALLBACKS];
  }
}

async function callOpenRouterChat(env: Env, apiKey: string, model: string, text: string): Promise<string> {
  const response = await fetch(`${resolveOpenRouterBaseUrl(env.OPENROUTER_BASE_URL)}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://globalpulse.xuxuclassmate.workers.dev",
      "X-Title": "GlobalPulse Telegram Bot",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      // Many free models reject response_format; ask for JSON in the prompt instead.
      messages: [
        {
          role: "system",
          content: [
            "你是 GlobalPulse 财经简报机器人的意图分类器。",
            "用户会用中文口语提问，例如：给我看美股、A股怎么样、加密行情如何、今天有什么热点。",
            "只输出一行 JSON，不要 Markdown，不要解释：",
            '{"intent":"ashare|us|crypto|hot|brief|status|help|start|unknown","reply":"可选中文短回复"}',
            "映射规则：",
            "- A股/沪深/上证/深证/创业板 → ashare",
            "- 美股/纳指/标普/道指/美盘 → us",
            "- 加密/比特币/BTC/ETH/币圈 → crypto",
            "- 热点/热搜/新闻/头条 → hot",
            "- 简报/行情/盘前/盘后/给我看看（未指市场） → brief",
            "- 状态/下次推送 → status",
            "- 帮助/怎么用 → help",
            "无法判断时 intent=unknown，reply 用中文引导用户换一种说法。",
          ].join("\n"),
        },
        { role: "user", content: text.slice(0, 500) },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} ${detail.slice(0, 120)}`);
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (payload.error?.message) {
    throw new Error(payload.error.message);
  }
  return payload.choices?.[0]?.message?.content?.trim() || "";
}

export function heuristicIntent(text: string): BotIntent {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, "");
  if (!normalized) return "unknown";

  // Help / status first — avoid being swallowed by generic "看".
  if (/^(帮助|求助|怎么用|如何使用|命令|菜单|help)$/i.test(normalized) || /帮助|怎么用|命令列表|有哪些命令/.test(normalized)) {
    return "help";
  }
  if (/状态|下次推送|什么时候推|何时推|推送时间|schedule|status/.test(normalized)) {
    return "status";
  }

  // Market-specific phrases (more specific before generic).
  if (/a股|沪深|上证|深证|创业板|科创板|a\s*share|china\s*stock/.test(normalized)) {
    return "ashare";
  }
  if (/美股|美盘|纳斯达克|纳指|标普|道琼斯|道指|标普500|spy|qqq|nasdaq|s&p|us\s*stock/.test(normalized)) {
    return "us";
  }
  if (/加密|比特币|以太坊|币圈|数字货币|btc|eth|crypto|solana|sol\b/.test(normalized)) {
    return "crypto";
  }
  if (/热点|热搜|头条|要闻|国际新闻|今日新闻|今天新闻|daily\s*hot/.test(normalized)) {
    return "hot";
  }

  // Generic briefing asks.
  if (/简报|报告|行情|盘前|盘后|复盘|给我看|发一份|发一下|看一下|看看|怎么样|如何|拉一下|来一份|更新一下/.test(normalized)) {
    return "brief";
  }

  return "unknown";
}

function isFreePricingModel(
  id: string,
  pricing?: { prompt?: string | number; completion?: string | number },
): boolean {
  if (id === "openrouter/free" || id.endsWith(":free")) return true;
  if (!pricing) return false;
  const prompt = Number(pricing.prompt);
  const completion = Number(pricing.completion);
  return prompt === 0 && completion === 0;
}

function isUsableFreeChatModel(id: string): boolean {
  const lower = id.toLowerCase();
  if (!lower) return false;
  // Skip non-chat / specialized free endpoints.
  if (/(content-safety|lyria|tts|whisper|embed|moderation|image|video)/i.test(lower)) return false;
  if (lower.includes("-vl:") || lower.endsWith("-vl") || lower.includes("vision")) return false;
  return lower === "openrouter/free" || lower.endsWith(":free") || lower.includes("/");
}

function freeModelRank(id: string): number {
  if (id === "openrouter/free") return 0;
  if (id.includes("gemma")) return 1;
  if (id.includes("gpt-oss")) return 2;
  if (id.includes("ling-3.0-flash")) return 3;
  if (id.includes("nemotron-3-nano")) return 4;
  if (id.includes("nemotron-3-super")) return 5;
  return 10;
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
    // Model returned prose — try heuristic on the model text itself.
    const fallback = heuristicIntent(content);
    if (fallback !== "unknown") return { intent: fallback };
    return { intent: "unknown", reply: "我没太听懂。可以说「给我看美股」或发送 /help。" };
  }
}

function normalizeIntent(value: unknown): BotIntent {
  const allowed: BotIntent[] = ["start", "help", "brief", "ashare", "us", "crypto", "hot", "status", "unknown"];
  return typeof value === "string" && allowed.includes(value as BotIntent)
    ? value as BotIntent
    : "unknown";
}
