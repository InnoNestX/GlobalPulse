import type { Env } from "../env";
import type { AppSettings } from "../config";
import { fetchTopicItems, type TopicItem } from "../sources";
import { getPulseSnapshot } from "../continuity";
import { ensureChineseTopicItems } from "../report";
import type { AutopilotRule, AutopilotRuleKind, AutopilotTrigger } from "./types";

interface QuoteRow {
  symbol: string;
  changePct: number;
}

const RULE_NAME_ZH: Record<AutopilotRuleKind, string> = {
  symbol_move: "持仓异动",
  fear_greed_extreme: "恐慌贪婪极端值",
  news_burst: "新闻爆发",
  bias_flip: "情绪翻转",
};

const LEGACY_NAME_ZH: Record<string, string> = {
  "News burst": "新闻爆发",
  "Position move ±3%": "持仓异动 ±3%",
  "Fear & Greed extreme": "恐慌贪婪极端值",
  "Bias flip": "情绪翻转",
};

export async function evaluateAutopilotRule(
  env: Env,
  settings: AppSettings,
  rule: AutopilotRule,
  now = new Date(),
): Promise<AutopilotTrigger | null> {
  switch (rule.kind) {
    case "symbol_move":
      return evaluateSymbolMove(env, settings, rule);
    case "fear_greed_extreme":
      return evaluateFearGreed(env, settings, rule);
    case "news_burst":
      return evaluateNewsBurst(env, settings, rule, now);
    case "bias_flip":
      return evaluateBiasFlip(env, settings, rule);
    default:
      return null;
  }
}

/** Autopilot pushes are Chinese unless content language is explicitly English. */
function useZh(settings: AppSettings): boolean {
  return (settings.language || "zh") !== "en";
}

export function localizeAutopilotRuleName(rule: AutopilotRule, zh = true): string {
  if (!zh) return rule.name;
  if (LEGACY_NAME_ZH[rule.name]) return LEGACY_NAME_ZH[rule.name]!;
  const kindName = RULE_NAME_ZH[rule.kind];
  if (/[A-Za-z]{3,}/.test(rule.name) && kindName) {
    // Keep numeric suffix like ±3% when present on Chinese default.
    if (rule.kind === "symbol_move" && /±\s*\d/.test(rule.name)) {
      const match = rule.name.match(/±\s*\d+(?:\.\d+)?%?/);
      return match ? `持仓异动 ${match[0].replace(/\s+/g, "")}` : kindName;
    }
    return kindName;
  }
  return rule.name || kindName || "自动雷达";
}

async function evaluateSymbolMove(env: Env, settings: AppSettings, rule: AutopilotRule): Promise<AutopilotTrigger | null> {
  const threshold = Number(rule.params.thresholdPct ?? 3);
  const symbols = collectWatchSymbols(settings, Boolean(rule.params.usePositions));
  if (!symbols.length) return null;

  const quotes = await fetchYahooQuotes(symbols.slice(0, 12));
  const hits = quotes.filter((row) => Math.abs(row.changePct) >= threshold);
  if (!hits.length) return null;

  const lines = hits
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, 6)
    .map((row) => `- ${row.symbol}: ${row.changePct > 0 ? "+" : ""}${row.changePct.toFixed(2)}%`);

  const zh = useZh(settings);
  const name = localizeAutopilotRuleName(rule, zh);
  return {
    rule,
    title: zh ? `自动雷达 · ${name}` : `Autopilot · ${rule.name}`,
    reason: `symbol_move>=${threshold}%`,
    body: zh
      ? [
          `# ${name}`,
          "",
          `触发阈值：±${threshold}%`,
          "",
          ...lines,
          "",
          "> GlobalPulse 自动雷达",
        ].join("\n")
      : [
          `# ${rule.name}`,
          "",
          `Threshold: ±${threshold}%`,
          "",
          ...lines,
          "",
          "> GlobalPulse Autopilot Radar",
        ].join("\n"),
  };
}

async function evaluateFearGreed(env: Env, settings: AppSettings, rule: AutopilotRule): Promise<AutopilotTrigger | null> {
  const low = Number(rule.params.low ?? 20);
  const high = Number(rule.params.high ?? 80);
  const value = await fetchFearGreedIndex();
  if (value === null) return null;
  if (value > low && value < high) return null;

  const zh = useZh(settings);
  const name = localizeAutopilotRuleName(rule, zh);
  return {
    rule,
    title: zh ? `自动雷达 · ${name}` : `Autopilot · ${rule.name}`,
    reason: `fear_greed=${value}`,
    body: zh
      ? [
          `# ${name}`,
          "",
          `恐慌贪婪指数：**${value}**`,
          value <= low ? `已低于极度恐慌阈值（${low}）。` : `已高于极度贪婪阈值（${high}）。`,
          "",
          "> 来源：alternative.me · GlobalPulse 自动雷达",
        ].join("\n")
      : [
          `# ${rule.name}`,
          "",
          `Fear & Greed Index: **${value}**`,
          value <= low ? `Below extreme-fear threshold (${low}).` : `Above extreme-greed threshold (${high}).`,
          "",
          "> Source: alternative.me · GlobalPulse Autopilot",
        ].join("\n"),
  };
}

async function evaluateNewsBurst(
  env: Env,
  settings: AppSettings,
  rule: AutopilotRule,
  now: Date,
): Promise<AutopilotTrigger | null> {
  const minItems = Number(rule.params.minItems ?? 5);
  const windowMinutes = Number(rule.params.windowMinutes ?? 90);
  const zh = useZh(settings);
  const language = zh ? "zh" : "en";
  const query = settings.topicFocus || (zh ? "市场 金融 地缘政治" : "markets OR finance OR geopolitics");
  const topic = await fetchTopicItems(query, language, undefined, { mode: "daily_hot", newsApiKey: env.NEWSAPI_API_KEY });
  const cutoff = now.getTime() - windowMinutes * 60 * 1000;
  const recent = topic.items.filter((item) => {
    if (!item.publishedAt) return true;
    const ts = Date.parse(item.publishedAt);
    return Number.isFinite(ts) ? ts >= cutoff : true;
  });
  if (recent.length < minItems) return null;

  const topItems = recent.slice(0, 6);
  const displayItems = zh
    ? await ensureChineseTopicItems(env, topItems, { maxItems: 6, preferBatchAi: true, concurrency: 3 })
    : topItems;

  const name = localizeAutopilotRuleName(rule, zh);
  return {
    rule,
    title: zh ? `自动雷达 · ${name}` : `Autopilot · ${rule.name}`,
    reason: `news_burst=${recent.length}`,
    body: zh
      ? [
          `# ${name}`,
          "",
          `约 ${windowMinutes} 分钟内出现 ${recent.length} 条相关新闻`,
          "",
          ...displayItems.map((item) => formatNewsLine(item)),
          "",
          "> GlobalPulse 自动雷达",
        ].join("\n")
      : [
          `# ${rule.name}`,
          "",
          `${recent.length} headlines in ~${windowMinutes}m window`,
          "",
          ...displayItems.map((item) => `- ${item.title}`),
          "",
          "> GlobalPulse Autopilot Radar",
        ].join("\n"),
  };
}

async function evaluateBiasFlip(env: Env, settings: AppSettings, rule: AutopilotRule): Promise<AutopilotTrigger | null> {
  const schedule = settings.schedules.find((entry) => entry.enabled && entry.reportMode === "market");
  if (!schedule) return null;
  const snapshot = await getPulseSnapshot(env, schedule.id);
  if (!snapshot?.bias) return null;
  const expected = String(rule.params.expectBias || "").trim();
  if (!expected || snapshot.bias === expected) return null;

  const zh = useZh(settings);
  const name = localizeAutopilotRuleName(rule, zh);
  return {
    rule,
    title: zh ? `自动雷达 · ${name}` : `Autopilot · ${rule.name}`,
    reason: `bias=${snapshot.bias}`,
    body: zh
      ? [
          `# ${name}`,
          "",
          `最新连续性偏向为 **${snapshot.bias}**（观察阈值：${expected}）。`,
          `时间表：${schedule.name}`,
          "",
          "> GlobalPulse 自动雷达",
        ].join("\n")
      : [
          `# ${rule.name}`,
          "",
          `Latest continuity bias is **${snapshot.bias}** (watch threshold: ${expected}).`,
          `Schedule: ${schedule.name}`,
          "",
          "> GlobalPulse Autopilot Radar",
        ].join("\n"),
  };
}

function formatNewsLine(item: TopicItem): string {
  const title = item.title.trim();
  return item.url ? `- [${title}](${item.url})` : `- ${title}`;
}

function collectWatchSymbols(settings: AppSettings, usePositions: boolean): string[] {
  const symbols = new Set<string>();
  for (const schedule of settings.schedules) {
    for (const symbol of schedule.focusSymbols) symbols.add(symbol.toUpperCase());
    if (usePositions) {
      for (const symbol of schedule.positionSymbols) symbols.add(symbol.toUpperCase());
    }
  }
  return Array.from(symbols);
}

async function fetchYahooQuotes(symbols: string[]): Promise<QuoteRow[]> {
  if (!symbols.length) return [];
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(","))}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "GlobalPulse/1.0" },
    });
    if (!response.ok) return [];
    const payload = await response.json() as {
      quoteResponse?: { result?: Array<{ symbol?: string; regularMarketChangePercent?: number }> };
    };
    return (payload.quoteResponse?.result ?? [])
      .map((row) => ({
        symbol: String(row.symbol || "").toUpperCase(),
        changePct: Number(row.regularMarketChangePercent ?? Number.NaN),
      }))
      .filter((row) => row.symbol && Number.isFinite(row.changePct));
  } catch {
    return [];
  }
}

async function fetchFearGreedIndex(): Promise<number | null> {
  try {
    const response = await fetch("https://api.alternative.me/fng/?limit=1");
    if (!response.ok) return null;
    const payload = await response.json() as { data?: Array<{ value?: string }> };
    const value = Number(payload.data?.[0]?.value);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}
