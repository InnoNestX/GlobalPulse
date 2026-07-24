import type { Env } from "../env";
import type { AppSettings } from "../config";
import { fetchTopicItems } from "../sources";
import { getPulseSnapshot } from "../continuity";
import type { AutopilotRule, AutopilotTrigger } from "./types";

interface QuoteRow {
  symbol: string;
  changePct: number;
}

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

function useZh(settings: AppSettings): boolean {
  return (settings.language || "zh") !== "en";
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
  return {
    rule,
    title: zh ? `自动雷达 · ${rule.name}` : `Autopilot · ${rule.name}`,
    reason: `symbol_move>=${threshold}%`,
    body: zh
      ? [
          `# ${rule.name}`,
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
  return {
    rule,
    title: zh ? `自动雷达 · ${rule.name}` : `Autopilot · ${rule.name}`,
    reason: `fear_greed=${value}`,
    body: zh
      ? [
          `# ${rule.name}`,
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
  const query = settings.topicFocus || (useZh(settings) ? "市场 金融 地缘政治" : "markets OR finance OR geopolitics");
  const topic = await fetchTopicItems(query, settings.language, undefined, { mode: "daily_hot", newsApiKey: env.NEWSAPI_API_KEY });
  const cutoff = now.getTime() - windowMinutes * 60 * 1000;
  const recent = topic.items.filter((item) => {
    if (!item.publishedAt) return true;
    const ts = Date.parse(item.publishedAt);
    return Number.isFinite(ts) ? ts >= cutoff : true;
  });
  if (recent.length < minItems) return null;

  const zh = useZh(settings);
  return {
    rule,
    title: zh ? `自动雷达 · ${rule.name}` : `Autopilot · ${rule.name}`,
    reason: `news_burst=${recent.length}`,
    body: zh
      ? [
          `# ${rule.name}`,
          "",
          `约 ${windowMinutes} 分钟内出现 ${recent.length} 条相关新闻`,
          "",
          ...recent.slice(0, 6).map((item) => `- ${item.title}`),
          "",
          "> GlobalPulse 自动雷达",
        ].join("\n")
      : [
          `# ${rule.name}`,
          "",
          `${recent.length} headlines in ~${windowMinutes}m window`,
          "",
          ...recent.slice(0, 6).map((item) => `- ${item.title}`),
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
  return {
    rule,
    title: zh ? `自动雷达 · ${rule.name}` : `Autopilot · ${rule.name}`,
    reason: `bias=${snapshot.bias}`,
    body: zh
      ? [
          `# ${rule.name}`,
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
