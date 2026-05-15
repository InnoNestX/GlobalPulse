import type { StockPacket } from "../types/packet";
import type { ResearchReportJson, ResearchStockCard } from "../types/report";
import { buildFallbackReportJson } from "./fallback";

export function normalizeResearchReportJson(value: unknown, packet: StockPacket): ResearchReportJson {
  if (!isRecord(value)) return buildFallbackReportJson(packet);
  const fallback = buildFallbackReportJson(packet);
  return {
    executive_summary: readString(value.executive_summary, fallback.executive_summary),
    market_view: normalizeMarketView(value.market_view, fallback.market_view),
    stock_cards: normalizeStockCards(value.stock_cards, fallback.stock_cards),
    news_review: normalizeNewsReview(value.news_review, fallback.news_review),
    risk_actions: normalizeRiskActions(value.risk_actions, fallback.risk_actions),
  };
}

function normalizeMarketView(value: unknown, fallback: ResearchReportJson["market_view"]): ResearchReportJson["market_view"] {
  if (!isRecord(value)) return fallback;
  const bias = value.bias === "偏多" || value.bias === "中性" || value.bias === "偏空" ? value.bias : fallback.bias;
  return {
    bias,
    confidence: readNumber(value.confidence, fallback.confidence),
    drivers: readStringArray(value.drivers, fallback.drivers),
    macro_risks: readStringArray(value.macro_risks, fallback.macro_risks),
  };
}

function normalizeStockCards(value: unknown, fallback: ResearchStockCard[]): ResearchStockCard[] {
  if (!Array.isArray(value)) return fallback;
  return value.flatMap((entry, index): ResearchStockCard[] => {
    if (!isRecord(entry)) return [];
    const fallbackCard = fallback[index] ?? fallback[0];
    if (!fallbackCard) return [];
    return [{
      ticker: readString(entry.ticker, fallbackCard.ticker),
      score_total: readNumber(entry.score_total, fallbackCard.score_total),
      professional_view: entry.professional_view === "看多" || entry.professional_view === "观察" || entry.professional_view === "看空" ? entry.professional_view : fallbackCard.professional_view,
      short_term_bias: entry.short_term_bias === "偏上" || entry.short_term_bias === "震荡" || entry.short_term_bias === "偏下" ? entry.short_term_bias : fallbackCard.short_term_bias,
      action_level: entry.action_level === "no_action" || entry.action_level === "watch" || entry.action_level === "prepare" || entry.action_level === "trade_candidate" ? entry.action_level : fallbackCard.action_level,
      confidence: readNumber(entry.confidence, fallbackCard.confidence),
      timeframe: readString(entry.timeframe, fallbackCard.timeframe),
      key_drivers: readStringArray(entry.key_drivers, fallbackCard.key_drivers),
      valuation_note: readString(entry.valuation_note, fallbackCard.valuation_note),
      technical_note: readString(entry.technical_note, fallbackCard.technical_note),
      news_note: readString(entry.news_note, fallbackCard.news_note),
      entry_rule: readString(entry.entry_rule, fallbackCard.entry_rule),
      stop_rule: readString(entry.stop_rule, fallbackCard.stop_rule),
      invalidation_rule: readString(entry.invalidation_rule, fallbackCard.invalidation_rule),
      risk_note: readString(entry.risk_note, fallbackCard.risk_note),
      evidence_count: readNumber(entry.evidence_count, fallbackCard.evidence_count),
      source_grade_max: entry.source_grade_max === "S" || entry.source_grade_max === "A" || entry.source_grade_max === "B" || entry.source_grade_max === "C" ? entry.source_grade_max : fallbackCard.source_grade_max,
    }];
  });
}

function normalizeNewsReview(value: unknown, fallback: ResearchReportJson["news_review"]): ResearchReportJson["news_review"] {
  if (!Array.isArray(value)) return fallback;
  return value.flatMap((entry): ResearchReportJson["news_review"] => {
    if (!isRecord(entry)) return [];
    return [{
      title: readString(entry.title, "未指定"),
      source: readString(entry.source, "Unknown"),
      source_grade: entry.source_grade === "S" || entry.source_grade === "A" || entry.source_grade === "B" || entry.source_grade === "C" ? entry.source_grade : "C",
      used_in_conclusion: typeof entry.used_in_conclusion === "boolean" ? entry.used_in_conclusion : false,
      why: readString(entry.why, "未说明"),
    }];
  }).slice(0, 10);
}

function normalizeRiskActions(value: unknown, fallback: ResearchReportJson["risk_actions"]): ResearchReportJson["risk_actions"] {
  if (!isRecord(value)) return fallback;
  return {
    positioning: readString(value.positioning, fallback.positioning),
    hedge_note: readString(value.hedge_note, fallback.hedge_note),
    watch_items_next_session: readStringArray(value.watch_items_next_session, fallback.watch_items_next_session),
  };
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 1200) : fallback;
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readStringArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).slice(0, 8) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

