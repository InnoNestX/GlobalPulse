import type { PulseSchedule } from "../config";
import type { Env } from "../env";
import type { TopicItem } from "../sources";
import { dedupeSymbols, normalizeTicker } from "./normalize/ticker";
import { buildStructuredResearchReport } from "./llm/provider";
import { persistResearchRun } from "./persistence/d1";
import { renderResearchMarkdown } from "./render/markdown";
import { fetchMarketData } from "./sources/market";
import { fetchMacroData } from "./sources/macro";
import { resolveTradingSession } from "./sources/marketCalendar";
import { buildEvidenceItems } from "./sources/news";
import { evaluateDataQuality } from "./validate/dataQuality";
import { buildStockInputs } from "./scoring/signals";
import { capConfidence, hasPrimarySource } from "./scoring/confidence";
import type { StockPacket } from "./types/packet";
import type { ResearchReportJson } from "./types/report";
import { defaultDecisionPolicy } from "./types/common";
import {
  appendContinuitySection,
  buildMarketSnapshot,
  diffPulseSnapshots,
  getPulseSnapshot,
  type ContinuityDelta,
  type PulseSnapshot,
} from "../continuity";

export {
  builtinWindows,
  sessionAt,
  exchangeOffsetMinutes,
  usEasternOffsetMinutes,
  type MarketId as SessionMarketId,
  type QuoteSession,
  type TradingWindows,
} from "./sources/session";

export {
  computeFactors,
  scoreFromFactors,
  stanceFromFactors,
  reasonFromFactors,
  type DailyBar,
  type FactorScores,
  type Stance,
} from "./scoring/factors";

export {
  minTurnover,
  passesHardFilters,
  stage1Score,
  type LiquidityRow,
} from "./universe/liquidity";

export interface ResearchMarketReportResult {
  title: string;
  body: string;
  packet: StockPacket;
  report: ResearchReportJson;
  continuitySnapshot?: PulseSnapshot;
  continuityDelta?: ContinuityDelta;
}

export function shouldUseResearchEngine(schedule: PulseSchedule): boolean {
  return schedule.reportMode === "market" && (
    schedule.reportType === "us_stock"
    || schedule.reportType === "a_share"
    || schedule.reportType === "crypto"
  );
}

export async function buildResearchMarketReport(
  env: Env,
  schedule: PulseSchedule,
  items: TopicItem[],
  generatedAt: string,
  now = new Date(),
): Promise<ResearchMarketReportResult> {
  const symbols = resolveResearchSymbols(schedule);
  const marketData = await fetchMarketData(env, schedule.reportType, schedule.focusSymbols, schedule.positionSymbols);
  const macroData = await fetchMacroData(env, schedule.reportType, items);
  const apiUsages = [...marketData.usages, ...macroData.usages];
  const evidence = buildEvidenceItems(items, schedule.reportType, symbols);
  const dataQuality = evaluateDataQuality({
    indices: marketData.indices,
    universe: marketData.universe,
    evidence,
    usages: apiUsages,
    requiredFields: [],
  });
  const tradingSession = await resolveTradingSession(env, schedule, now);
  const leaders = marketData.universe
    .filter((row) => row.change_pct > 0)
    .sort((a, b) => b.change_pct - a.change_pct)
    .slice(0, 8);
  const losers = marketData.universe
    .filter((row) => row.change_pct < 0)
    .sort((a, b) => a.change_pct - b.change_pct)
    .slice(0, 8);
  const stockInputs = buildStockInputs(symbols, marketData.universe, evidence, schedule.reportType);
  const packet: StockPacket = {
    meta: {
      run_id: `${schedule.id}:${Date.now()}`,
      asof_local: generatedAt,
      market: schedule.reportType,
      report_type: schedule.marketSession,
      trading_session: tradingSession,
      timezone_local: schedule.timezone,
    },
    macro: macroData.snapshot,
    market: {
      report_type: schedule.reportType,
      indices: marketData.indices,
      leaders,
      losers,
      sentiment: buildMarketSentiment(marketData.universe, schedule.reportType),
    },
    stocks: stockInputs,
    news: evidence,
    data_quality: dataQuality,
    api_usage: apiUsages,
    decision_policy: defaultDecisionPolicy,
    risk_profile: {
      max_position_pct: 0.1,
      max_loss_per_trade_pct: 0.005,
      max_daily_drawdown_pct: 0.02,
    },
  };

  const llm = await buildStructuredResearchReport(env, packet);
  let report = enforceConfidenceCaps(packet, llm.report, llm.fallbackUsed);
  if (schedule.language === "zh") {
    report = await localizeResearchReportChinese(env, report);
  }
  let body = renderResearchMarkdown(packet, report);
  let continuitySnapshot: PulseSnapshot | undefined;
  let continuityDelta: ContinuityDelta | undefined;

  if (schedule.continuityEnabled !== false) {
    continuitySnapshot = buildMarketSnapshot({
      scheduleId: schedule.id,
      asOf: generatedAt,
      language: schedule.language,
      title: extractMarkdownTitle(body),
      report,
    });
    const previous = await getPulseSnapshot(env, schedule.id);
    continuityDelta = diffPulseSnapshots(previous, continuitySnapshot);
    body = appendContinuitySection(body, continuityDelta, schedule.language);
  }

  await persistResearchRun(env, packet, report, llm, apiUsages);
  return {
    title: extractMarkdownTitle(body),
    body,
    packet,
    report,
    continuitySnapshot,
    continuityDelta,
  };
}

function resolveResearchSymbols(schedule: PulseSchedule): string[] {
  const configured = dedupeSymbols([...schedule.focusSymbols, ...schedule.positionSymbols])
    .map((symbol) => normalizeTicker(symbol, schedule.reportType))
    .filter(Boolean);
  if (configured.length > 0) return configured.slice(0, 16);
  return [];
}

function extractMarkdownTitle(body: string): string {
  const firstLine = body.split("\n").find((line) => line.trim())?.trim() ?? "GlobalPulse 市场报告";
  return firstLine
    .replace(/^📊\s*/, "")
    .replace(/\*\*/g, "")
    .trim() || "GlobalPulse 市场报告";
}

function buildMarketSentiment(rows: Array<{ change_pct: number }>, reportType: PulseSchedule["reportType"]): Record<string, number | string> {
  const avg = rows.length > 0 ? rows.reduce((sum, row) => sum + row.change_pct, 0) / rows.length : 0;
  const up = rows.filter((row) => row.change_pct > 0).length;
  const down = rows.filter((row) => row.change_pct < 0).length;
  return {
    average_change_pct: Number(avg.toFixed(2)),
    breadth: rows.length > 0 ? Number(((up - down) / rows.length).toFixed(2)) : 0,
    sentiment_basis: reportType === "crypto" ? "crypto market breadth, macro liquidity and evidence quality" : "equity market breadth, macro context and evidence quality",
  };
}

function enforceConfidenceCaps(packet: StockPacket, report: ResearchReportJson, llmFailed: boolean): ResearchReportJson {
  const cappedCards = report.stock_cards.map((card) => {
    const stock = packet.stocks.find((entry) => entry.ticker === card.ticker);
    const grade = card.source_grade_max;
    const confidence = capConfidence({
      confidence: card.confidence,
      evidenceCount: card.evidence_count,
      sourceGradeMax: grade,
      hasPrimarySource: hasPrimarySource(grade),
      dataQuality: packet.data_quality,
      llmFailed,
      policy: packet.decision_policy,
    });
    const action_level = confidence < 60 || card.evidence_count < packet.decision_policy.min_evidence_for_trade_view
      ? "watch"
      : card.action_level;
    return {
      ...card,
      confidence,
      action_level,
      evidence_count: stock ? stock.evidence.length : card.evidence_count,
    };
  });
  return { ...report, stock_cards: cappedCards };
}

/** Translate leftover English prose in research reports before rendering. */
async function localizeResearchReportChinese(env: Env, report: ResearchReportJson): Promise<ResearchReportJson> {
  // Dynamic import avoids a circular dependency with report.ts → research.
  const { ensureChineseTopicItems } = await import("../report");

  const newsItems = report.news_review.map((item) => ({
    title: item.title,
    summary: item.why || "",
    url: "",
    source: item.source,
  }));
  const proseItems = [
    { title: report.executive_summary, summary: report.market_view.drivers.join("；"), url: "", source: "summary" },
    { title: report.market_view.macro_risks.join("；"), summary: report.risk_actions.positioning, url: "", source: "macro" },
    { title: report.risk_actions.hedge_note, summary: report.risk_actions.watch_items_next_session.join("；"), url: "", source: "risk" },
    ...report.stock_cards.flatMap((card) => ([
      { title: card.valuation_note, summary: card.technical_note, url: "", source: card.ticker },
      { title: card.news_note, summary: card.risk_note, url: "", source: card.ticker },
      { title: card.entry_rule, summary: card.stop_rule, url: "", source: card.ticker },
      { title: card.invalidation_rule, summary: card.key_drivers.join("；"), url: "", source: card.ticker },
    ])),
  ];

  const [translatedNews, translatedProse] = await Promise.all([
    newsItems.length
      ? ensureChineseTopicItems(env, newsItems, {
        maxItems: newsItems.length,
        preferBatchAi: true,
        allowAiFallback: true,
        concurrency: 3,
      })
      : Promise.resolve([]),
    ensureChineseTopicItems(env, proseItems, {
      maxItems: proseItems.length,
      preferBatchAi: true,
      allowAiFallback: true,
      concurrency: 3,
    }),
  ]);

  const prose = translatedProse;
  let proseIndex = 0;
  const nextProse = () => prose[proseIndex++] || { title: "", summary: "" };

  const summaryBlock = nextProse();
  const macroBlock = nextProse();
  const riskBlock = nextProse();

  const stock_cards = report.stock_cards.map((card) => {
    const valuation = nextProse();
    const news = nextProse();
    const entry = nextProse();
    const invalidation = nextProse();
    return {
      ...card,
      valuation_note: valuation.title || card.valuation_note,
      technical_note: valuation.summary || card.technical_note,
      news_note: news.title || card.news_note,
      risk_note: news.summary || card.risk_note,
      entry_rule: entry.title || card.entry_rule,
      stop_rule: entry.summary || card.stop_rule,
      invalidation_rule: invalidation.title || card.invalidation_rule,
      key_drivers: splitChineseList(invalidation.summary || card.key_drivers.join("；"), card.key_drivers),
    };
  });

  return {
    ...report,
    executive_summary: summaryBlock.title || report.executive_summary,
    market_view: {
      ...report.market_view,
      drivers: splitChineseList(summaryBlock.summary || report.market_view.drivers.join("；"), report.market_view.drivers),
      macro_risks: splitChineseList(macroBlock.title || report.market_view.macro_risks.join("；"), report.market_view.macro_risks),
    },
    risk_actions: {
      positioning: macroBlock.summary || report.risk_actions.positioning,
      hedge_note: riskBlock.title || report.risk_actions.hedge_note,
      watch_items_next_session: splitChineseList(
        riskBlock.summary || report.risk_actions.watch_items_next_session.join("；"),
        report.risk_actions.watch_items_next_session,
      ),
    },
    stock_cards,
    news_review: report.news_review.map((item, index) => ({
      ...item,
      title: translatedNews[index]?.title || item.title,
      why: translatedNews[index]?.summary || item.why,
    })),
  };
}

function splitChineseList(value: string, fallback: string[]): string[] {
  const parts = value
    .split(/[；;|]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : fallback;
}
