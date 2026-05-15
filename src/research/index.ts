import type { PulseSchedule } from "../config";
import type { Env } from "../env";
import type { TopicItem } from "../sources";
import { dedupeSymbols, normalizeTicker } from "./normalize/ticker";
import { buildStructuredResearchReport } from "./llm/provider";
import { persistResearchRun } from "./persistence/d1";
import { renderResearchMarkdown } from "./render/markdown";
import { fetchMarketData } from "./sources/market";
import { resolveTradingSession } from "./sources/marketCalendar";
import { buildEvidenceItems } from "./sources/news";
import { evaluateDataQuality } from "./validate/dataQuality";
import { buildStockInputs } from "./scoring/signals";
import { capConfidence, hasPrimarySource } from "./scoring/confidence";
import type { StockPacket } from "./types/packet";
import type { ResearchReportJson } from "./types/report";
import { defaultDecisionPolicy } from "./types/common";

const MIN_PUSH_COMPLETENESS_SCORE = 85;

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
  const evidence = buildEvidenceItems(items, schedule.reportType, symbols);
  const dataQuality = evaluateDataQuality({
    indices: marketData.indices,
    universe: marketData.universe,
    evidence,
    usages: marketData.usages,
    requiredFields: [],
  });
  const tradingSession = await resolveTradingSession(env, schedule, now);
  const leaders = marketData.universe.slice().sort((a, b) => b.change_pct - a.change_pct).slice(0, 8);
  const losers = marketData.universe.slice().sort((a, b) => a.change_pct - b.change_pct).slice(0, 8);
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
    macro: {
      rates: {},
      calendar: [],
      notes: buildMacroNotes(schedule.reportType, items),
    },
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
    api_usage: marketData.usages,
    decision_policy: defaultDecisionPolicy,
    risk_profile: {
      max_position_pct: 0.1,
      max_loss_per_trade_pct: 0.005,
      max_daily_drawdown_pct: 0.02,
    },
  };

  assertEnoughDataQualityForPush(packet);

  const llm = await buildStructuredResearchReport(env, packet);
  const report = enforceConfidenceCaps(packet, llm.report, llm.fallbackUsed);
  const body = renderResearchMarkdown(packet, report);
  await persistResearchRun(env, packet, report, llm, marketData.usages);
  return { title: extractMarkdownTitle(body), body, packet, report };
}

function assertEnoughDataQualityForPush(packet: StockPacket): void {
  const score = packet.data_quality.completeness_score;
  if (score >= MIN_PUSH_COMPLETENESS_SCORE) {
    return;
  }

  const successfulApis = packet.api_usage?.filter((entry) => entry.success).length ?? 0;
  const totalApis = packet.api_usage?.length ?? 0;
  const failedApis = packet.api_usage
    ?.filter((entry) => !entry.success)
    .map((entry) => `${entry.provider}/${entry.endpoint}${entry.message || entry.error ? `: ${entry.message ?? entry.error}` : ""}`)
    .join("; ") || "无";
  const missing = packet.data_quality.missing_fields.join("、") || "无";

  throw new Error(
    `数据完整度 ${score}% 低于 ${MIN_PUSH_COMPLETENESS_SCORE}% 推送门槛，已取消推送。缺失字段：${missing}。API 成功 ${successfulApis}/${totalApis}，失败接口：${failedApis}`,
  );
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

function buildMacroNotes(reportType: PulseSchedule["reportType"], items: TopicItem[]): string[] {
  const text = items.map((item) => `${item.title}\n${item.summary ?? ""}`).join("\n").toLowerCase();
  const notes: string[] = [];
  if (/fed|fomc|powell|美联储|降息|利率/.test(text)) notes.push("利率与央行预期仍是主要宏观变量。");
  if (/cpi|ppi|pce|通胀/.test(text)) notes.push("通胀数据可能影响风险资产估值。");
  if (reportType === "a_share") notes.push("A股需额外关注涨跌停、T+1、北向资金、龙虎榜和交易所公告。");
  if (reportType === "crypto") notes.push("加密市场需额外关注 funding rate、open interest、清算和 BTC dominance。");
  return notes.length > 0 ? notes : ["宏观字段未完整接入，当前以市场与新闻证据为主。"];
}

function buildMarketSentiment(rows: Array<{ change_pct: number }>, reportType: PulseSchedule["reportType"]): Record<string, number | string> {
  const avg = rows.length > 0 ? rows.reduce((sum, row) => sum + row.change_pct, 0) / rows.length : 0;
  const up = rows.filter((row) => row.change_pct > 0).length;
  const down = rows.filter((row) => row.change_pct < 0).length;
  return {
    average_change_pct: Number(avg.toFixed(2)),
    breadth: rows.length > 0 ? Number(((up - down) / rows.length).toFixed(2)) : 0,
    sentiment_basis: reportType === "crypto" ? "crypto-specific indicators only" : "equity market breadth and evidence quality",
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
