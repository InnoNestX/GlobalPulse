import type { TopicItem } from "../sources";
import type { ResearchReportJson } from "../research/types/report";
import type { PulseSnapshot, StockScoreFingerprint } from "./types";

export function hashText(input: string): string {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, " ");
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildMarketSnapshot(input: {
  scheduleId: string;
  asOf: string;
  language: "zh" | "en";
  title: string;
  report: ResearchReportJson;
}): PulseSnapshot {
  const stocks: StockScoreFingerprint[] = input.report.stock_cards.slice(0, 16).map((card) => ({
    ticker: card.ticker,
    score: Number(card.score_total.toFixed(2)),
    view: card.professional_view,
    bias: card.short_term_bias,
    action: card.action_level,
  }));

  const headlines = input.report.news_review.slice(0, 16).map((item) => item.title);
  return {
    scheduleId: input.scheduleId,
    asOf: input.asOf,
    language: input.language,
    mode: "market",
    bias: input.report.market_view.bias,
    confidence: input.report.market_view.confidence,
    drivers: input.report.market_view.drivers.slice(0, 8),
    macroRisks: input.report.market_view.macro_risks.slice(0, 8),
    stocks,
    newsFingerprints: headlines.map((title) => hashText(title)),
    headlineHashes: headlines.map((title) => `${hashText(title)}::${title.slice(0, 120)}`),
    title: input.title,
  };
}

export function buildDigestSnapshot(input: {
  scheduleId: string;
  asOf: string;
  language: "zh" | "en";
  title: string;
  items: TopicItem[];
}): PulseSnapshot {
  const headlines = input.items.slice(0, 20).map((item) => item.title);
  return {
    scheduleId: input.scheduleId,
    asOf: input.asOf,
    language: input.language,
    mode: "digest",
    drivers: [],
    macroRisks: [],
    stocks: [],
    newsFingerprints: headlines.map((title) => hashText(title)),
    headlineHashes: headlines.map((title) => `${hashText(title)}::${title.slice(0, 120)}`),
    title: input.title,
  };
}
