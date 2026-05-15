import type { StockPacket } from "../types/packet";
import type { ResearchReportJson } from "../types/report";

export function renderResearchMarkdown(packet: StockPacket, report: ResearchReportJson): string {
  const lines = [
    `# GlobalPulse 研究报告：${marketLabel(packet.meta.market)}`,
    "",
    "## 执行摘要",
    report.executive_summary,
    "",
    "## 数据质量",
    `- 数据完整度：${packet.data_quality.completeness_score}%`,
    `- 新鲜度：${packet.data_quality.freshness_score}%`,
    `- 来源质量：${packet.data_quality.source_score}%`,
    `- 一致性：${packet.data_quality.consistency_score}%`,
    `- 降级状态：${packet.data_quality.degrade_level}`,
    packet.data_quality.degraded_reason ? `- 影响：${packet.data_quality.degraded_reason}` : "- 影响：无明显降级",
    "",
    "## 市场与宏观",
    `- 我对大盘的判断：${report.market_view.bias}（置信度 ${report.market_view.confidence}%）`,
    `- 当前交易时段：${packet.meta.trading_session}`,
    "- 核心驱动：",
    ...renderList(report.market_view.drivers),
    "- 宏观风险：",
    ...renderList(report.market_view.macro_risks),
    "",
    "## 市场领涨领跌",
    `- 领涨：${formatQuotes(packet.market.leaders)}`,
    `- 领跌：${formatQuotes(packet.market.losers)}`,
    "",
    "## 重点个股",
    ...report.stock_cards.flatMap((card) => [
      `### ${card.ticker}`,
      `- 综合评分：${card.score_total} / 100`,
      `- 专业结论：${card.professional_view}（置信度 ${card.confidence}%）`,
      `- 短线倾向：${card.short_term_bias}`,
      `- 动作等级：${renderActionLevel(card.action_level)}`,
      `- 时间框架：${card.timeframe}`,
      `- 核心驱动：${card.key_drivers.join("；") || "未指定"}`,
      `- 估值判断：${card.valuation_note}`,
      `- 技术判断：${card.technical_note}`,
      `- 新闻判断：${card.news_note}`,
      `- 入场规则：${card.entry_rule}`,
      `- 止损规则：${card.stop_rule}`,
      `- 失效条件：${card.invalidation_rule}`,
      `- 风险提示：${card.risk_note}`,
      `- 证据数量：${card.evidence_count}`,
      `- 最高信源等级：${card.source_grade_max}`,
      "",
    ]),
    "## 新闻复核",
    ...report.news_review.map((item, index) => {
      const url = packet.news.find((evidence) => evidence.title === item.title)?.url;
      const link = url ? ` [🔗](${url})` : "";
      return `${index + 1}. ${item.title}${link} — ${item.source} · ${item.source_grade}\n   ${item.used_in_conclusion ? "进入结论" : "未进入结论"}：${item.why}`;
    }),
    "",
    "## 交易与风险管理",
    `- 仓位建议：${report.risk_actions.positioning}`,
    `- 对冲建议：${report.risk_actions.hedge_note}`,
    "- 下一时段重点观察：",
    ...renderList(report.risk_actions.watch_items_next_session),
    "",
    "## 自动化字段",
    `- 生成时间：${packet.meta.asof_local}`,
    `- 本地时区：${packet.meta.timezone_local}`,
    `- 报告类型：${packet.meta.report_type}`,
    `- 数据缺失字段：${packet.data_quality.missing_fields.length ? packet.data_quality.missing_fields.join("、") : "无"}`,
  ];

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function renderList(values: string[]): string[] {
  return values.length > 0 ? values.map((value) => `  - ${value}`) : ["  - 未指定"];
}

function formatQuotes(rows: Array<{ symbol: string; change_pct: number }>): string {
  if (rows.length === 0) return "暂无";
  return rows.slice(0, 5).map((row) => `${row.symbol} ${row.change_pct >= 0 ? "+" : ""}${row.change_pct.toFixed(2)}%`).join("、");
}

function renderActionLevel(value: string): string {
  if (value === "trade_candidate") return "交易候选";
  if (value === "prepare") return "准备";
  if (value === "watch") return "观察";
  return "不行动";
}

function marketLabel(reportType: string): string {
  if (reportType === "us_stock") return "美股";
  if (reportType === "a_share") return "A股";
  if (reportType === "crypto") return "加密货币";
  return "市场";
}
