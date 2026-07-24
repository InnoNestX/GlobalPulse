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

export type IntentConfidence = "high" | "low" | "none";

export interface IntentResult {
  intent: BotIntent;
  reply?: string;
  model?: string;
  /** How the intent was resolved. */
  source?: "heuristic" | "heuristic-fallback" | "openrouter" | "none";
  /** True when free AI models were consulted. */
  usedAi?: boolean;
}

export interface HeuristicMatch {
  intent: BotIntent;
  confidence: IntentConfidence;
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

/**
 * Auto intent classification:
 * 1) high-confidence local keywords → instant
 * 2) otherwise call OpenRouter free models with automatic failover
 * 3) if AI fails, fall back to low-confidence heuristic when available
 */
export async function classifyTelegramIntent(env: Env, text: string): Promise<IntentResult> {
  const cleaned = text.trim();
  if (!cleaned) {
    return {
      intent: "unknown",
      reply: "请发送内容，或点菜单选择命令。",
      source: "none",
      usedAi: false,
    };
  }

  const heuristic = matchHeuristicIntent(cleaned);
  if (heuristic.confidence === "high") {
    return { intent: heuristic.intent, source: "heuristic", usedAi: false };
  }

  const apiKey = env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    if (heuristic.confidence === "low") {
      return { intent: heuristic.intent, source: "heuristic-fallback", usedAi: false };
    }
    return {
      intent: "unknown",
      reply: "可以说「给我看美股」「A股怎么样」「今天热点」，或发送 /help。",
      source: "none",
      usedAi: false,
    };
  }

  const ai = await classifyWithFreeModels(env, apiKey, cleaned);
  if (ai.intent !== "unknown") {
    return { ...ai, source: "openrouter", usedAi: true };
  }

  // AI did not understand — keep a useful Chinese hint, or use weak local guess.
  if (heuristic.confidence === "low") {
    return {
      intent: heuristic.intent,
      source: "heuristic-fallback",
      usedAi: true,
      model: ai.model,
    };
  }

  return {
    intent: "unknown",
    reply: ai.reply || "我没太听懂。可以直接说「给我看美股」「A股怎么样」「加密行情」「今日热点」，或点菜单。",
    source: "openrouter",
    usedAi: true,
    model: ai.model,
  };
}

async function classifyWithFreeModels(env: Env, apiKey: string, text: string): Promise<IntentResult> {
  const liveFree = await listOpenRouterFreeModels(env, apiKey);
  const models = resolveOpenRouterModelCandidates(env.OPENROUTER_MODEL, liveFree);
  const errors: string[] = [];
  let lastUnknown: IntentResult | undefined;

  for (const model of models.slice(0, 8)) {
    try {
      const content = await callOpenRouterChat(env, apiKey, model, text);
      if (!content) {
        errors.push(`${model}: empty`);
        continue;
      }
      const parsed = parseIntentResult(content);
      if (parsed.intent === "unknown") {
        lastUnknown = { ...parsed, model };
        // Keep trying other free models — one may understand better.
        errors.push(`${model}: unknown`);
        continue;
      }
      return { ...parsed, model };
    } catch (error) {
      errors.push(`${model}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.warn("OpenRouter free-model failover exhausted", errors.slice(0, 6).join(" | "));
  return lastUnknown || {
    intent: "unknown",
    reply: "暂时无法理解这句话。请换个说法，或点菜单选择命令。",
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
      messages: [
        {
          role: "system",
          content: [
            "你是 GlobalPulse 财经简报机器人的意图分析器。",
            "用户可能说得很口语、省略、打错字，请尽量理解真实需求。",
            "只输出一行 JSON，不要 Markdown，不要解释：",
            '{"intent":"ashare|us|crypto|hot|brief|status|help|start|unknown","reply":"可选中文短回复"}',
            "intent 含义：",
            "- ashare: 要 A股 / 沪深 / 上证 / 深证 / 创业板 相关简报",
            "- us: 要美股 / 纳指 / 标普 / 道指 / 美盘 相关简报",
            "- crypto: 要加密货币 / BTC / ETH / 币圈 相关简报",
            "- hot: 要热点 / 热搜 / 新闻 / 头条",
            "- brief: 只要一份通用简报，未指定市场",
            "- status: 问推送状态 / 下次什么时候发",
            "- help: 问怎么用 / 有哪些命令",
            "- start: 打招呼开场",
            "- unknown: 确实无法判断",
            "示例：",
            "「美股咋样了」→ {\"intent\":\"us\"}",
            "「帮我看看盘」→ {\"intent\":\"brief\"}",
            "「午饭吃什么」→ {\"intent\":\"unknown\",\"reply\":\"我只能帮你看财经简报，试试 /us 或 /ashare\"}",
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

/** Backward-compatible helper used by tests. */
export function heuristicIntent(text: string): BotIntent {
  return matchHeuristicIntent(text).intent;
}

export function matchHeuristicIntent(text: string): HeuristicMatch {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, "");
  if (!normalized) return { intent: "unknown", confidence: "none" };

  // High confidence: clear help / status.
  if (/^(帮助|求助|怎么用|如何使用|命令|菜单|help)$/i.test(normalized) || /帮助|怎么用|命令列表|有哪些命令/.test(normalized)) {
    return { intent: "help", confidence: "high" };
  }
  if (/状态|下次推送|什么时候推|何时推|推送时间|schedule|status/.test(normalized)) {
    return { intent: "status", confidence: "high" };
  }

  // High confidence: explicit market.
  if (/a股|沪深|上证|深证|创业板|科创板|a\s*share|china\s*stock/.test(normalized)) {
    return { intent: "ashare", confidence: "high" };
  }
  if (/美股|美盘|纳斯达克|纳指|标普|道琼斯|道指|标普500|spy|qqq|nasdaq|s&p|us\s*stock/.test(normalized)) {
    return { intent: "us", confidence: "high" };
  }
  if (/加密|比特币|以太坊|币圈|数字货币|btc|eth|crypto|solana|sol\b/.test(normalized)) {
    return { intent: "crypto", confidence: "high" };
  }
  if (/热点|热搜|头条|要闻|国际新闻|今日新闻|今天新闻|daily\s*hot/.test(normalized)) {
    return { intent: "hot", confidence: "high" };
  }

  // Low confidence: vague briefing verbs — prefer AI confirmation.
  if (/简报|报告|行情|盘前|盘后|复盘|给我看|发一份|发一下|看一下|看看|怎么样|如何|拉一下|来一份|更新一下|看看盘|帮我看/.test(normalized)) {
    return { intent: "brief", confidence: "low" };
  }

  return { intent: "unknown", confidence: "none" };
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

function parseIntentResult(content: string): IntentResult {
  try {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    const raw = start >= 0 && end > start ? content.slice(start, end + 1) : content;
    const parsed = JSON.parse(raw) as { intent?: string; reply?: string };
    return {
      intent: normalizeIntent(parsed.intent),
      reply: typeof parsed.reply === "string" ? parsed.reply.slice(0, 300) : undefined,
    };
  } catch {
    // Free models sometimes reply in prose: "intent: us" / "美股".
    const prose = content.toLowerCase();
    const fromProse =
      prose.match(/\bintent["'\s:=]+(ashare|us|crypto|hot|brief|status|help|start|unknown)\b/)?.[1]
      || undefined;
    if (fromProse) {
      return { intent: normalizeIntent(fromProse) };
    }
    const fallback = matchHeuristicIntent(content);
    if (fallback.confidence !== "none") {
      return { intent: fallback.intent };
    }
    return {
      intent: "unknown",
      reply: "我没太听懂。可以说「给我看美股」或发送 /help。",
    };
  }
}

function normalizeIntent(value: unknown): BotIntent {
  const allowed: BotIntent[] = ["start", "help", "brief", "ashare", "us", "crypto", "hot", "status", "unknown"];
  return typeof value === "string" && allowed.includes(value as BotIntent)
    ? value as BotIntent
    : "unknown";
}
