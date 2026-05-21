import type { ReportType } from "../../config";
import type { StockPacket, MarketQuote } from "../types/packet";
import type { ResearchReportJson, ResearchStockCard } from "../types/report";

const MISSING = "暂无 ⚠️";

export function renderResearchMarkdown(packet: StockPacket, report: ResearchReportJson): string {
  if (packet.meta.market === "a_share") return renderAShareReport(packet, report);
  if (packet.meta.market === "crypto") return renderCryptoReport(packet, report);
  return renderUSStockReport(packet, report);
}

export function renderUSStockReport(packet: StockPacket, report: ResearchReportJson): string {
  return renderMarketReport(packet, report, {
    marketName: "美股",
    titleMarketName: "美股",
    assetHeader: "指数/ETF",
    priceHeader: "价格",
    changeHeader: "涨跌",
    requiredSymbols: ["SPY", "QQQ", "DIA", "IWM"],
    formatPrice: (quote) => formatCurrency(quote?.price),
    summaryFallback: "美股主要指数分化，科技股与小盘股强弱决定短线风险偏好，当前以观察为主。",
    forbiddenPattern: /\b(BTC|ETH|SOL|DOGE|XRP|USDT|Crypto Fear|funding rate|liquidation|open interest|BTC Dominance|GitHub Trending|Hacker News)\b/i,
  });
}

export function renderAShareReport(packet: StockPacket, report: ResearchReportJson): string {
  return renderMarketReport(packet, report, {
    marketName: "A股",
    titleMarketName: "A股",
    assetHeader: "指数",
    priceHeader: "点位",
    changeHeader: "涨跌",
    requiredSymbols: ["SH000001", "SZ399001", "SH000300", "SZ399006"],
    requiredDisplayNames: {
      SH000001: "上证指数",
      SZ399001: "深证成指",
      SH000300: "沪深300",
      SZ399006: "创业板指",
    },
    formatPrice: (quote) => formatNumber(quote?.price),
    summaryFallback: "A股主要指数震荡分化，成交额与板块轮动决定短线风险偏好，当前以观察为主。",
    forbiddenPattern: /\b(GitHub Trending|Hacker News|RAV4|RTX|MacBook|BTC|ETH|SPY|QQQ|Nasdaq|S&P|DOGE|XRP)\b/i,
  });
}

export function renderCryptoReport(packet: StockPacket, report: ResearchReportJson): string {
  return renderMarketReport(packet, report, {
    marketName: "加密",
    titleMarketName: "加密",
    assetHeader: "资产",
    priceHeader: "价格",
    changeHeader: "24H涨跌",
    requiredSymbols: ["BTC", "ETH"],
    minRows: 3,
    formatPrice: (quote) => formatCurrency(quote?.price),
    summaryFallback: "加密市场短线震荡，BTC 主导与杠杆资金状态决定波动方向，需观察资金费率和爆仓数据。",
    forbiddenPattern: /\b(SH000001|SZ399001|上证指数|深证成指|SPY|QQQ|DIA|IWM|GitHub Trending|Hacker News)\b/i,
  });
}

interface MarketTemplateOptions {
  marketName: string;
  titleMarketName: string;
  assetHeader: string;
  priceHeader: string;
  changeHeader: string;
  requiredSymbols: string[];
  requiredDisplayNames?: Record<string, string>;
  minRows?: number;
  formatPrice: (quote: MarketQuote | undefined) => string;
  summaryFallback: string;
  forbiddenPattern: RegExp;
}

function renderMarketReport(packet: StockPacket, report: ResearchReportJson, options: MarketTemplateOptions): string {
  const title = buildReportTitle(packet, options.titleMarketName);
  const rows = buildSummaryRows(packet, options);
  const summary = sanitizeLine(report.executive_summary, options.forbiddenPattern) || buildMarketSummary(packet, report, options.summaryFallback);
  const catalysts = buildCatalysts(packet, report, options.forbiddenPattern);
  const stockSection = renderConfiguredStockCards(packet, report, options.forbiddenPattern);
  const moverSpotlight = renderMoverSpotlight(packet.market.leaders, packet.market.losers, options.forbiddenPattern);
  const watchItems = report.risk_actions.watch_items_next_session
    .map((item) => sanitizeLine(item, options.forbiddenPattern))
    .filter(Boolean)
    .slice(0, 4);
  const observationItems = padList(watchItems, buildDefaultWatchItems(packet.meta.market), 4);

  const lines = [
    `📊 **${title} (${formatBeijingTime(packet.meta.asof_local)})**`,
    "",
    summary,
    "",
    `| ${options.assetHeader} | ${options.priceHeader} | ${options.changeHeader} | 状态 |`,
    "|---------|------|------|------|",
    ...rows.map((row) => `| ${row.asset} | ${row.price} | ${row.change} | ${row.status} |`),
    "",
    ...moverSpotlight,
    "",
    "### 💡 市场状态判断",
    `- **综合情绪**：${renderBias(report.market_view.bias)}（评分=${marketScore(packet)}，置信度=${boundedPercent(report.market_view.confidence)}%）`,
    `- **趋势状态**：${buildTrendLine(rows)}`,
    `- **风险偏好**：${buildRiskPreference(packet, report)}`,
    `- **当前信号**：${buildCurrentSignal(packet, report)}`,
    `- **解释**：${buildMarketExplanation(packet, report, options.forbiddenPattern)}`,
    "",
    "### 📈 技术与量能",
    ...rows.slice(0, 4).map((row) => `- **${row.asset}**：${buildTechnicalLine(row.quote)}`),
    "",
    "### 🌐 宏观与资金背景",
    `- **宏观主线**：${formatMacroLine(packet, options.forbiddenPattern)}`,
    `- **资金状态**：${formatCapitalLine(packet)}`,
    `- **关键变量**：${formatKeyVariableLine(packet.meta.market)}`,
    "",
    "### 🌐 关键新闻催化剂",
    ...catalysts,
    "",
    "### 📌 关注/持仓标的",
    "",
    ...stockSection,
    "",
    "### 🧭 下一交易时段观察",
    ...observationItems.map((item) => `- ${item}`),
    "",
    "### 📝 小结",
    buildConclusion(packet, report, rows, options.forbiddenPattern),
    "",
    "### 🧪 数据质量与自动化诊断",
    `- 数据完整度：${boundedPercent(packet.data_quality.completeness_score)}%`,
    `- 新鲜度：${boundedPercent(packet.data_quality.freshness_score)}%`,
    `- 来源质量：${boundedPercent(packet.data_quality.source_score)}%`,
    `- 一致性：${boundedPercent(packet.data_quality.consistency_score)}%`,
    `- 降级状态：${formatDegradeLevel(packet.data_quality.degrade_level)}`,
    `- 缺失字段：${formatMissingFields(packet.data_quality.missing_fields)}`,
    `- 失败接口：${formatFailedEndpoints(packet)}`,
    `- 接口状态：${formatApiUsage(packet)}`,
  ];

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function buildReportTitle(packet: StockPacket, marketName: string): string {
  const intent = packet.meta.report_type;
  if (marketName === "加密") {
    if (intent === "pre_open" || intent === "forecast") return "加密日内预判";
    if (intent === "intraday" || intent === "monitor") return "加密市场监控";
    if (intent === "post_close" || intent === "review") return "加密日度复盘";
    if (intent === "weekly_review") return "加密周度复盘";
    if (intent === "late_risk_check") return "加密盘尾风险检查";
    return "加密市场报告摘要";
  }
  if (intent === "pre_open" || intent === "forecast") return `${marketName}开盘前预判`;
  if (intent === "intraday" || intent === "monitor") return `${marketName}盘中监控`;
  if (intent === "late_risk_check") return `${marketName}盘尾风险检查`;
  if (intent === "post_close" || intent === "review") return `${marketName}收盘复盘`;
  if (intent === "weekly_review") return `${marketName}周度复盘`;
  return `${marketName}报告摘要`;
}

function buildSummaryRows(packet: StockPacket, options: MarketTemplateOptions): Array<{
  asset: string;
  price: string;
  change: string;
  status: string;
  quote?: MarketQuote;
}> {
  const bySymbol = new Map(packet.market.indices.map((quote) => [quote.symbol.toUpperCase(), quote]));
  const rows = options.requiredSymbols.map((symbol) => {
    const quote = bySymbol.get(symbol.toUpperCase());
    return buildSummaryRow(symbol, quote, options);
  });
  const needed = Math.max(options.minRows ?? options.requiredSymbols.length, rows.length);
  const used = new Set(options.requiredSymbols.map((symbol) => symbol.toUpperCase()));
  const extras = packet.market.indices
    .filter((quote) => !used.has(quote.symbol.toUpperCase()))
    .slice(0, Math.max(0, needed - rows.length))
    .map((quote) => buildSummaryRow(quote.symbol, quote, options));
  const padded = [...rows, ...extras];
  while (padded.length < needed) {
    padded.push({ asset: MISSING, price: MISSING, change: MISSING, status: "数据不足" });
  }
  return padded;
}

function buildSummaryRow(symbol: string, quote: MarketQuote | undefined, options: MarketTemplateOptions): {
  asset: string;
  price: string;
  change: string;
  status: string;
  quote?: MarketQuote;
} {
  const key = symbol.toUpperCase();
  const asset = options.requiredDisplayNames?.[key] ?? quote?.name ?? key;
  if (!quote) return { asset, price: MISSING, change: MISSING, status: "数据不足" };
  return {
    asset,
    price: options.formatPrice(quote),
    change: `${formatSignedPercent(quote.change_pct)} ${quote.change_pct >= 0 ? "🟢" : "🔴"}`,
    status: statusFromChange(quote.change_pct),
    quote,
  };
}

function buildMarketSummary(packet: StockPacket, report: ResearchReportJson, fallback: string): string {
  if (packet.data_quality.degrade_level === "market_data_failed" || packet.market.indices.length === 0) {
    return `⚠️ ${marketLabel(packet.meta.market)}行情接口降级，未获取到完整指数数据。本次仅保留市场观察，不生成高置信度交易判断。`;
  }
  const avg = averageChange(packet.market.indices);
  const direction = avg > 0.2 ? "整体偏强" : avg < -0.2 ? "整体承压" : "震荡分化";
  return `${marketLabel(packet.meta.market)}主要资产${direction}，${renderBias(report.market_view.bias)}信号置信度 ${boundedPercent(report.market_view.confidence)}%，短线以${buildCurrentSignal(packet, report)}为主。` || fallback;
}

function renderConfiguredStockCards(packet: StockPacket, report: ResearchReportJson, forbiddenPattern: RegExp): string[] {
  const configured = new Set(packet.stocks.map((stock) => stock.ticker.toUpperCase()));
  const cards = report.stock_cards.filter((card) => configured.has(card.ticker.toUpperCase()));
  if (configured.size === 0 || cards.length === 0) {
    return [
      "暂无配置，已跳过个股/个币分析。",
      "如需分析具体标的，请在后台配置关注列表或持仓列表。",
    ];
  }
  return cards.flatMap((card) => renderStockCard(card, forbiddenPattern));
}

function renderStockCard(card: ResearchStockCard, forbiddenPattern: RegExp): string[] {
  return [
    `- **${card.ticker}**：${card.professional_view}，短线${card.short_term_bias}，动作等级 ${renderActionLevel(card.action_level)}，置信度 ${boundedPercent(card.confidence)}%。`,
    `  证据 ${card.evidence_count} 条，最高信源 ${card.source_grade_max}；${sanitizeLine(card.news_note, forbiddenPattern) || "新闻证据不足。"} ${sanitizeLine(card.technical_note, forbiddenPattern) || ""}`,
    `  入场规则：${sanitizeLine(card.entry_rule, forbiddenPattern) || "等待量价确认。"} 止损规则：${sanitizeLine(card.stop_rule, forbiddenPattern) || "控制单笔风险。"} 失效条件：${sanitizeLine(card.invalidation_rule, forbiddenPattern) || "若出现反向高等级证据则失效。"}`,
  ];
}

function buildCatalysts(packet: StockPacket, report: ResearchReportJson, forbiddenPattern: RegExp): string[] {
  const byTitle = new Map(packet.news.map((item) => [item.title, item]));
  const rows = report.news_review
    .map((item) => ({ review: item, evidence: byTitle.get(item.title) }))
    .filter(({ review, evidence }) => {
      const text = `${review.title}\n${review.source}\n${evidence?.source ?? ""}`;
      if (forbiddenPattern.test(text)) return false;
      if (isCommunityOrCodeSource(review.source) || isCommunityOrCodeSource(evidence?.source)) {
        return Boolean(review.used_in_conclusion && evidence?.related_tickers?.length);
      }
      if (review.source_grade === "C") return Boolean(review.used_in_conclusion && evidence?.related_tickers?.length);
      return review.used_in_conclusion || review.source_grade === "S" || review.source_grade === "A" || review.source_grade === "B";
    })
    .slice(0, 6);

  if (rows.length === 0) return ["1. 暂无与当前市场或关注列表高度相关的新闻催化剂。"];
  return rows.map(({ review, evidence }, index) => {
    const url = normalizeHttpUrl(evidence?.url);
    const link = url ? `[🔗](${url})` : "🔗";
    const why = sanitizeLine(review.why, forbiddenPattern) || "作为市场背景观察。";
    return `${index + 1}. ${sanitizeLine(review.title, forbiddenPattern) || "未命名新闻"}：${why}${link}`;
  });
}

function buildTrendLine(rows: Array<{ quote?: MarketQuote }>): string {
  const valid = rows.filter((row) => row.quote);
  if (valid.length === 0) return "数据不足，暂不判断趋势。";
  const strong = valid.filter((row) => row.quote && row.quote.change_pct > 0.3).length;
  const weak = valid.filter((row) => row.quote && row.quote.change_pct < -0.3).length;
  if (strong > weak) return "核心资产多数走强，趋势偏震荡上行，继续看成交量是否同步放大。";
  if (weak > strong) return "核心资产多数走弱，趋势偏防御，重点观察是否放量下破。";
  return "核心资产涨跌互现，短线以结构分化和区间震荡看待。";
}

function buildRiskPreference(packet: StockPacket, report: ResearchReportJson): string {
  const breadth = Number(packet.market.sentiment.breadth ?? 0);
  if (report.market_view.bias === "偏多" && breadth >= 0) return "风险偏好回升，但不追高，优先观察强势资产能否延续。";
  if (report.market_view.bias === "偏空" || breadth < -0.2) return "风险偏好下降，仓位与杠杆需要收缩。";
  return "风险偏好中性，市场仍在等待更明确的方向信号。";
}

function buildCurrentSignal(packet: StockPacket, report: ResearchReportJson): string {
  if (packet.data_quality.degrade_level === "market_data_failed" || packet.market.indices.length === 0) return "数据不足";
  if (report.market_view.bias === "偏多" && report.market_view.confidence >= 60) return "持有 / 观察";
  if (report.market_view.bias === "偏空") return "偏谨慎";
  return "观察";
}

function buildMarketExplanation(packet: StockPacket, report: ResearchReportJson, forbiddenPattern: RegExp): string {
  const driver = report.market_view.drivers.map((item) => sanitizeLine(item, forbiddenPattern)).find(Boolean);
  const risk = report.market_view.macro_risks.map((item) => sanitizeLine(item, forbiddenPattern)).find(Boolean);
  if (driver && risk) return `${driver}；同时需要跟踪 ${risk}`;
  if (driver) return `${driver}，但仍需要价格与成交量继续确认。`;
  return "当前证据主要来自行情广度、领涨领跌与新闻复核，未满足高置信度交易结论条件。";
}

function buildTechnicalLine(quote: MarketQuote | undefined): string {
  if (!quote) return "价格和成交量都没有拿全，暂时不做技术判断。";
  const status = statusFromChange(quote.change_pct);
  const momentum = quote.change_pct > 0
    ? "近期价格走势向上，说明短线买盘更主动"
    : quote.change_pct < 0
      ? "近期价格走势回落，说明短线卖压更明显"
      : "近期价格基本横盘，说明多空暂时没有明显胜负";
  return `${momentum}；当前表现${status}；${formatVolumeSignal(quote)}。`;
}

function formatVolumeSignal(quote: MarketQuote): string {
  const ratio = Number(quote.volume_ratio);
  if (!Number.isFinite(ratio) || ratio <= 0) return "本次行情源未返回可用成交量，先按价格走势观察，不单独判断量价配合";
  if (ratio >= 1.5 && quote.change_pct >= 0) return `成交量约为平常的 ${ratio.toFixed(2)} 倍，属于放量上涨，资金参与度较高`;
  if (ratio >= 1.5 && quote.change_pct < 0) return `成交量约为平常的 ${ratio.toFixed(2)} 倍，属于放量下跌，卖压需要重点留意`;
  if (ratio <= 0.7 && quote.change_pct >= 0) return `成交量约为平常的 ${ratio.toFixed(2)} 倍，属于缩量上涨，上涨持续性还需要继续确认`;
  if (ratio <= 0.7 && quote.change_pct < 0) return `成交量约为平常的 ${ratio.toFixed(2)} 倍，属于缩量回落，暂时更像观望或轻度调整`;
  return `成交量约为平常的 ${ratio.toFixed(2)} 倍，量能处于正常区间，价格信号可信度中等`;
}

function formatMacroLine(packet: StockPacket, forbiddenPattern: RegExp): string {
  const note = packet.macro.notes.map((item) => sanitizeLine(item, forbiddenPattern)).find(Boolean);
  return note || defaultMacroObservation(packet.meta.market);
}

function defaultMacroObservation(market: ReportType): string {
  if (market === "a_share") return "宏观观察：关注国内政策预期、人民币汇率、海外利率、成交额和北向资金。政策预期改善且成交额放大时，风险偏好更容易修复。";
  if (market === "crypto") return "宏观观察：关注美元流动性、美债收益率、ETF资金流、资金费率和未平仓合约。流动性改善且杠杆不过热时，加密资产更容易延续反弹。";
  return "宏观观察：关注美债收益率、美元指数、通胀、就业和美联储政策预期。利率下行通常改善科技成长股风险偏好，利率上行则增加估值压力。";
}

function formatCapitalLine(packet: StockPacket): string {
  const breadth = Number(packet.market.sentiment.breadth ?? 0);
  if (!Number.isFinite(breadth)) return "资金广度数据不足，暂不输出强判断。";
  if (breadth > 0.25) return "上涨资产数量占优，资金风险偏好有所改善。";
  if (breadth < -0.25) return "下跌资产数量占优，资金偏防御。";
  return "涨跌家数接近平衡，资金更多体现为结构轮动。";
}

function formatKeyVariableLine(market: ReportType): string {
  if (market === "a_share") return "成交额、北向资金、板块轮动、涨跌停扩散与交易所公告。";
  if (market === "crypto") return "BTC Dominance、资金费率、open interest、ETF资金流、稳定币流动性与交易所净流入。";
  return "美债收益率、美元、通胀、就业、财报预期与核心板块成交量。";
}

function buildConclusion(
  packet: StockPacket,
  report: ResearchReportJson,
  rows: Array<{ quote?: MarketQuote }>,
  forbiddenPattern: RegExp,
): string {
  const validRows = rows.filter((row) => row.quote);
  const market = marketLabel(packet.meta.market);
  if (validRows.length === 0) {
    return `${market}本次行情数据不完整，报告保留固定模板但不输出高置信度交易判断。最大风险是数据缺失导致方向误判，下一步应优先确认核心指数、领涨领跌和新闻证据是否恢复。`;
  }
  const bias = renderBias(report.market_view.bias);
  const risk = report.market_view.macro_risks.map((item) => sanitizeLine(item, forbiddenPattern)).find(Boolean) || "宏观与事件风险仍需跟踪";
  return `${market}当前呈现${buildTrendLine(rows)} 综合判断为${bias}，置信度 ${boundedPercent(report.market_view.confidence)}%。最大风险在于${risk}。下一步重点观察领涨资产能否延续、弱势资产是否止跌，以及关注/持仓标的是否出现新的高等级证据。`;
}

function buildDefaultWatchItems(market: ReportType): string[] {
  if (market === "a_share") {
    return ["核心指数能否站稳盘中均线", "成交额是否放大", "北向资金与主线板块是否共振", "跌停与高位股亏钱效应是否扩散"];
  }
  if (market === "crypto") {
    return ["BTC 是否维持相对强势", "资金费率是否过热", "open interest 是否异常扩张", "爆仓数据是否提示杠杆去化"];
  }
  return ["SPY/QQQ 能否延续相对强势", "DIA/IWM 是否补涨或继续拖累广度", "美债收益率与美元是否压制估值", "财报与宏观数据是否改变风险偏好"];
}

function renderMoverSpotlight(leaders: MarketQuote[], losers: MarketQuote[], forbiddenPattern: RegExp): string[] {
  const leaderRows = filterMovers(leaders, forbiddenPattern)
    .filter((row) => row.change_pct > 0)
    .slice(0, 5);
  const loserRows = filterMovers(losers, forbiddenPattern)
    .filter((row) => row.change_pct < 0)
    .slice(0, 5);
  const size = Math.max(leaderRows.length, loserRows.length, 1);
  const lines = [
    "### 🚦 领涨 / 领跌速览",
    "| 🚀 领涨资产 | 涨幅 | 🔻 领跌资产 | 跌幅 |",
    "|---|---:|---|---:|",
  ];
  for (let index = 0; index < size; index += 1) {
    const leader = leaderRows[index];
    const loser = loserRows[index];
    lines.push(`| ${formatMoverName(leader)} | ${leader ? formatSignedPercent(leader.change_pct) : MISSING} | ${formatMoverName(loser)} | ${loser ? formatSignedPercent(loser.change_pct) : MISSING} |`);
  }
  return lines;
}

function filterMovers(rows: MarketQuote[], forbiddenPattern: RegExp): MarketQuote[] {
  return rows.filter((row) => !forbiddenPattern.test(row.symbol) && !forbiddenPattern.test(row.name ?? ""));
}

function formatMoverName(row: MarketQuote | undefined): string {
  if (!row) return MISSING;
  return row.name && row.name !== row.symbol ? row.name : row.symbol;
}

function isCommunityOrCodeSource(source: string | undefined): boolean {
  return /github|hacker news|reddit|x\.com|twitter|stocktwits|forum|社区|论坛/i.test(source ?? "");
}

function marketScore(packet: StockPacket): number {
  const avg = averageChange(packet.market.indices.length ? packet.market.indices : packet.market.leaders);
  return Math.max(0, Math.min(100, Math.round(50 + avg * 8)));
}

function averageChange(rows: Array<{ change_pct: number }>): number {
  if (rows.length === 0) return 0;
  return rows.reduce((sum, row) => sum + row.change_pct, 0) / rows.length;
}

function statusFromChange(change: number): string {
  if (change >= 0.5) return "偏强";
  if (change > 0) return "震荡偏强";
  if (change <= -0.5) return "偏弱";
  if (change < 0) return "震荡偏弱";
  return "震荡";
}

function renderBias(value: string): string {
  if (value === "偏多") return "看多";
  if (value === "偏空") return "看空";
  return "中性";
}

function renderActionLevel(value: string): string {
  if (value === "trade_candidate") return "交易候选";
  if (value === "prepare") return "准备";
  if (value === "watch") return "观察";
  return "不行动";
}

function boundedPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
}

function formatCurrency(value: number | undefined): string {
  if (!Number.isFinite(value)) return MISSING;
  const number = value as number;
  const digits = Math.abs(number) >= 100 ? 2 : 4;
  return `$${number.toLocaleString("en-US", { maximumFractionDigits: digits })}`;
}

function formatNumber(value: number | undefined): string {
  if (!Number.isFinite(value)) return MISSING;
  return (value as number).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

function formatSignedPercent(value: number): string {
  if (!Number.isFinite(value)) return MISSING;
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatBeijingTime(value: string): string {
  return value.includes("北京时间") ? value : `${value} 北京时间`;
}

function marketLabel(reportType: ReportType): string {
  if (reportType === "us_stock") return "美股";
  if (reportType === "a_share") return "A股";
  if (reportType === "crypto") return "加密市场";
  return "市场";
}

function sanitizeLine(value: string | undefined, forbiddenPattern: RegExp): string {
  const trimmed = (value ?? "").replace(/\s+/g, " ").trim();
  if (!trimmed || forbiddenPattern.test(trimmed)) return "";
  return trimmed;
}

function padList(values: string[], fallback: string[], size: number): string[] {
  const result = [...values];
  for (const item of fallback) {
    if (result.length >= size) break;
    if (!result.includes(item)) result.push(item);
  }
  return result.slice(0, size);
}

function normalizeHttpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function formatDegradeLevel(value: string | undefined): string {
  if (!value || value === "none") return "无降级";
  const labels: Record<string, string> = {
    minor_missing_data: "轻微数据缺失",
    major_missing_data: "主要数据缺失",
    market_data_failed: "行情数据获取失败",
    news_data_failed: "新闻数据获取失败",
    macro_data_failed: "宏观数据获取失败",
    source_rate_limited: "数据源限流",
    api_rate_limited: "接口限流",
    partial_provider_failure: "部分数据源失败",
    insufficient_evidence: "证据不足",
  };
  return labels[value] ?? value.replace(/_/g, " ");
}

function formatMissingFields(values: string[]): string {
  if (!values.length) return "无";
  const labels: Record<string, string> = {
    indices: "核心指数",
    universe: "市场样本",
    evidence: "新闻证据",
    macro: "宏观数据",
    rates: "利率数据",
    calendar: "宏观日历",
    volume_ratio: "量能比例",
    price: "价格",
    change_pct: "涨跌幅",
    leaders: "领涨资产",
    losers: "领跌资产",
  };
  return values.map((value) => labels[value] ?? value.replace(/_/g, " ")).join("、");
}

function formatFailedEndpoints(packet: StockPacket): string {
  const failed = (packet.api_usage ?? [])
    .filter((entry) => !entry.success)
    .map((entry) => `${entry.provider}/${entry.endpoint}${entry.rate_limited ? "（限流）" : ""}`);
  return failed.length > 0 ? failed.join("、") : "无";
}

function formatApiUsage(packet: StockPacket): string {
  const usages = packet.api_usage ?? [];
  if (usages.length === 0) return "暂无接口调用记录";
  const ok = usages.filter((entry) => entry.success).length;
  const limited = usages.filter((entry) => entry.rate_limited).length;
  return `成功 ${ok}/${usages.length}，限流 ${limited}`;
}
