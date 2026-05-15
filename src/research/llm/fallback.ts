import type { StockPacket } from "../types/packet";
import type { ResearchReportJson, ResearchStockCard } from "../types/report";
import { capConfidence, hasPrimarySource, maxSourceGrade } from "../scoring/confidence";

export function buildFallbackReportJson(packet: StockPacket): ResearchReportJson {
  const average = averageChange(packet.market.indices);
  const marketBias = average > 0.35 ? "偏多" : average < -0.35 ? "偏空" : "中性";
  const stockCards = packet.stocks.map((stock): ResearchStockCard => {
    const sourceGradeMax = maxSourceGrade(stock.evidence.map((item) => item.source_grade));
    const score = Math.round(stock.signals.total);
    const professionalView = score >= 68 && stock.evidence.length >= packet.decision_policy.min_evidence_for_trade_view
      ? "看多"
      : score <= 38 && stock.evidence.length >= packet.decision_policy.min_evidence_for_trade_view
        ? "看空"
        : "观察";
    const shortTermBias = score >= 56 ? "偏上" : score <= 44 ? "偏下" : "震荡";
    const confidence = capConfidence({
      confidence: 45 + Math.abs(score - 50) + stock.evidence.length * 5,
      evidenceCount: stock.evidence.length,
      sourceGradeMax,
      hasPrimarySource: hasPrimarySource(sourceGradeMax),
      dataQuality: packet.data_quality,
      llmFailed: true,
      policy: packet.decision_policy,
    });
    return {
      ticker: stock.ticker,
      score_total: score,
      professional_view: professionalView,
      short_term_bias: shortTermBias,
      action_level: confidence >= 70 && professionalView !== "观察" ? "prepare" : "watch",
      confidence,
      timeframe: stock.timeframe,
      key_drivers: buildDrivers(stock.ticker, stock.signals.total, stock.evidence.length),
      valuation_note: "估值数据未完整接入，暂不输出低估/高估判断。",
      technical_note: `动量分 ${stock.signals.momentum.toFixed(1)}，技术分 ${stock.signals.technical.toFixed(1)}。`,
      news_note: stock.evidence.length > 0 ? `关联证据 ${stock.evidence.length} 条。` : "关联证据不足，观点降级。",
      entry_rule: shortTermBias === "偏上" ? "放量突破或回踩不破关键均线后再考虑。" : "等待止跌和量能确认。",
      stop_rule: "若跌破当日低点或关键支撑，控制单笔风险。",
      invalidation_rule: "若核心驱动未兑现、放量反向突破或出现更高等级反向证据，则观点失效。",
      risk_note: stock.evidence.length < 2 ? "证据不足，不能作为高置信度交易建议。" : "仍需控制仓位并跟踪后续证据。",
      evidence_count: stock.evidence.length,
      source_grade_max: sourceGradeMax,
    };
  });

  return {
    executive_summary: `本次报告按结构化研究引擎生成，市场整体${marketBias}。数据完整度 ${packet.data_quality.completeness_score}%，降级状态 ${packet.data_quality.degrade_level}。`,
    market_view: {
      bias: marketBias,
      confidence: Math.min(70, Math.max(45, Math.round(packet.data_quality.completeness_score * 0.65))),
      drivers: packet.market.leaders.slice(0, 3).map((row) => `${row.symbol} 领涨 ${row.change_pct.toFixed(2)}%`),
      macro_risks: packet.macro.notes.length ? packet.macro.notes : ["宏观字段未完整接入，需观察后续数据。"],
    },
    stock_cards: stockCards,
    news_review: packet.news.slice(0, 8).map((item) => ({
      title: item.title,
      source: item.source,
      source_grade: item.source_grade,
      used_in_conclusion: item.used_in_conclusion,
      why: item.used_reason ?? "未说明",
    })),
    risk_actions: {
      positioning: "证据强的标的可进入观察或准备清单，证据不足的标的不直接升级为交易候选。",
      hedge_note: packet.meta.market === "crypto" ? "加密资产波动更高，优先控制杠杆和单笔风险。" : "若指数转弱，可降低仓位或使用指数工具对冲。",
      watch_items_next_session: ["关注高等级证据是否补齐", "跟踪领涨领跌是否延续", "观察失效条件是否触发"],
    },
  };
}

function averageChange(rows: Array<{ change_pct: number }>): number {
  if (rows.length === 0) return 0;
  return rows.reduce((sum, row) => sum + row.change_pct, 0) / rows.length;
}

function buildDrivers(ticker: string, score: number, evidenceCount: number): string[] {
  return [
    `${ticker} 综合评分 ${Math.round(score)} / 100`,
    `关联证据 ${evidenceCount} 条`,
    score >= 50 ? "价格/新闻组合偏正向" : "价格/新闻组合偏谨慎",
  ];
}
