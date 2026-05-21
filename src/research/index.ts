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

export interface ResearchMarketReportResult {
  title: string;
  body: string;
  packet: StockPacket;
  report: ResearchReportJson;
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
  const report = enforceConfidenceCaps(packet, llm.report, llm.fallbackUsed);
  const body = renderResearchMarkdown(packet, report);
  await persistResearchRun(env, packet, report, llm, apiUsages);
  return { title: extractMarkdownTitle(body), body, packet, report };
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
