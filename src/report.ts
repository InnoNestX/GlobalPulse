import type { Env } from "./env";
import type { PulseSchedule } from "./config";
import { buildGoogleNewsRssUrl, fetchTopicItems, type TopicItem } from "./sources";
import { renderDigest } from "./template";
import { getLocalTimeParts } from "./time";

interface TranslationResult {
  title?: string;
  summary?: string;
}

export interface ReportBuildResult {
  title: string;
  body: string;
  generatedAt: string;
  sourceUrl: string;
  sourceStatus: "live" | "fallback";
  sourceMessage: string;
  items: TopicItem[];
  actions: Array<{ label: string; url: string }>;
}

export async function buildScheduleReport(env: Env, schedule: PulseSchedule, now = new Date()): Promise<ReportBuildResult> {
  const local = getLocalTimeParts(now, schedule.timezone, schedule.language);
  const fetched = await fetchItemsWithFallback(schedule);
  const translatedItems = await maybeTranslateItems(env, fetched.items, schedule.language);
  const catalystItems = selectCatalystItems(schedule, translatedItems, now);
  const enrichedBody = await buildEnrichedBody(schedule, translatedItems, catalystItems, local.label, fetched.sourceUrl);
  const actions = buildActions(catalystItems, schedule.language);

  return {
    title: enrichedBody.title,
    body: enrichedBody.body,
    generatedAt: local.label,
    sourceUrl: fetched.sourceUrl,
    sourceStatus: fetched.status,
    sourceMessage: fetched.message,
    items: catalystItems,
    actions,
  };
}

async function fetchItemsWithFallback(schedule: PulseSchedule): Promise<{
  status: "live" | "fallback";
  message: string;
  sourceUrl: string;
  items: TopicItem[];
}> {
  try {
    const topicData = await fetchTopicItems(schedule.topicQuery, schedule.language, schedule.sourceUrl);

    if (!topicData.items.length) {
      throw new Error("all live sources returned empty items");
    }

    return {
      status: "live",
      message: schedule.language === "zh" ? "实时抓取成功" : "Live fetch succeeded",
      sourceUrl: topicData.sourceUrl,
      items: topicData.items,
    };
  } catch (error) {
    const fallbackSource = schedule.sourceUrl || "Google News, Sina Finance, Hacker News, GitHub Search, alternative.me";
    const fallbackItems = getSampleItems(schedule.language);

    return {
      status: "fallback",
      message: schedule.language === "zh"
        ? `实时抓取失败，已回退示例数据：${error instanceof Error ? error.message : "unknown error"}`
        : `Live fetch failed, fallback sample data is used: ${error instanceof Error ? error.message : "unknown error"}`,
      sourceUrl: fallbackSource,
      items: fallbackItems,
    };
  }
}

async function maybeTranslateItems(env: Env, items: TopicItem[], language: PulseSchedule["language"]): Promise<TopicItem[]> {
  if (language !== "zh" || items.length === 0) {
    return items;
  }

  return Promise.all(items.map(async (item) => {
    if (!needsTranslation(item.title) && !needsTranslation(item.summary)) {
      return item;
    }

    const translated = await translateToChinese(env, item.title, item.summary);
    const translatedTitle = translated.title?.trim() || item.title;
    const translatedSummary = translated.summary?.trim()
      || (needsTranslation(item.summary) ? appendTranslationFallbackHint(item.summary) : item.summary);

    return withOptionalSummary({
      ...item,
      title: translatedTitle,
    }, translatedSummary);
  }));
}

async function translateToChinese(env: Env, title: string, summary?: string): Promise<TranslationResult> {
  const translatedByGoogle = await translateViaGoogleFree(title, summary);

  if (translatedByGoogle.title || translatedByGoogle.summary) {
    return translatedByGoogle;
  }

  const ai = env.AI;

  if (!ai || typeof ai !== "object" || !("run" in ai) || typeof ai.run !== "function") {
    return {};
  }

  const prompt = [
    "你是金融新闻翻译助手。将下面 JSON 字段翻译成简体中文，只输出 JSON，不要额外解释。",
    "保留原有事实与公司代码，不要改写链接，不要新增字段。",
    `输入：${JSON.stringify({ title, summary: summary ?? "" })}`,
    "输出格式：{\"title\":\"...\",\"summary\":\"...\"}",
  ].join("\n");

  try {
    const inference = await ai.run("@cf/meta/llama-3.1-8b-instruct", { prompt }) as unknown;
    const content = extractAiText(inference);

    if (!content) {
      return {};
    }

    const parsed = safeParseJson(extractJson(content));

    if (!parsed) {
      return {};
    }

    const translation: TranslationResult = {};

    if (typeof parsed.title === "string") {
      translation.title = parsed.title;
    }

    if (typeof parsed.summary === "string") {
      translation.summary = parsed.summary;
    }

    return translation;
  } catch (error) {
    console.warn("Workers AI translation failed", error);
    return {};
  }
}

async function translateViaGoogleFree(title: string, summary?: string): Promise<TranslationResult> {
  const titleTranslation = needsTranslation(title)
    ? await translateSingleViaGoogleFree(title)
    : undefined;
  const summaryTranslation = needsTranslation(summary)
    ? await translateSingleViaGoogleFree(summary ?? "")
    : undefined;
  const translation: TranslationResult = {};

  if (titleTranslation) {
    translation.title = titleTranslation;
  }

  if (summaryTranslation) {
    translation.summary = summaryTranslation;
  }

  return translation;
}

async function translateSingleViaGoogleFree(input: string): Promise<string | undefined> {
  if (!input.trim()) {
    return undefined;
  }

  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", "zh-CN");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", input);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "globalpulse-worker/0.1",
        "Accept": "application/json,text/plain,*/*",
      },
    });

    if (!response.ok) {
      return undefined;
    }

    const payload = await response.json() as unknown;
    const translated = extractGoogleTranslation(payload);

    return translated?.trim() || undefined;
  } catch (error) {
    console.warn("Google free translation failed", error);
    return undefined;
  }
}

function extractGoogleTranslation(payload: unknown): string | undefined {
  if (!Array.isArray(payload)) {
    return undefined;
  }

  const sentences = payload[0];

  if (!Array.isArray(sentences)) {
    return undefined;
  }

  const translated = sentences.flatMap((segment) => {
    if (!Array.isArray(segment)) {
      return [];
    }

    const value = segment[0];

    return typeof value === "string" ? [value] : [];
  }).join("");

  return translated || undefined;
}

function extractAiText(result: unknown): string | undefined {
  if (typeof result === "string") {
    return result;
  }

  if (!result || typeof result !== "object") {
    return undefined;
  }

  if (typeof (result as { response?: unknown }).response === "string") {
    return (result as { response: string }).response;
  }

  if (typeof (result as { output_text?: unknown }).output_text === "string") {
    return (result as { output_text: string }).output_text;
  }

  const response = (result as { response?: unknown }).response;
  if (Array.isArray(response)) {
    const combined = response
      .map((entry) => typeof entry === "string" ? entry : "")
      .filter(Boolean)
      .join("\n")
      .trim();

    return combined || undefined;
  }

  return undefined;
}

function extractJson(input: string): string {
  const start = input.indexOf("{");
  const end = input.lastIndexOf("}");

  if (start < 0 || end < 0 || end <= start) {
    return input;
  }

  return input.slice(start, end + 1);
}

function safeParseJson(input: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(input) as unknown;

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function needsTranslation(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return /[A-Za-z]{4,}/.test(value);
}

function appendTranslationFallbackHint(summary: string | undefined): string | undefined {
  if (!summary) {
    return undefined;
  }

  if (summary.includes("（翻译回退原文）")) {
    return summary;
  }

  return `${summary}（翻译回退原文）`;
}

function withOptionalSummary(item: TopicItem, summary: string | undefined): TopicItem {
  if (!summary) {
    if (!item.summary) {
      return item;
    }

    const { summary: _oldSummary, ...rest } = item;
    return rest;
  }

  return {
    ...item,
    summary,
  };
}

async function buildEnrichedBody(
  schedule: PulseSchedule,
  items: TopicItem[],
  displayItems: TopicItem[],
  generatedAt: string,
  sourceUrl: string,
): Promise<{
  title: string;
  body: string;
}> {
  const marketReport = schedule.reportMode === "market"
    ? await buildMarketReportSection(schedule, items, generatedAt)
    : "";
  const rendered = renderDigest(schedule, {
    generatedAt,
    timezone: schedule.timezone,
    topicQuery: schedule.topicQuery,
    sourceUrl,
    items: displayItems,
    format: schedule.outputFormat,
    marketReport,
  });
  const analysisSection = buildAnalysisSection(schedule, items);
  const bodyWithMarketReport = marketReport && !schedule.template.includes("{{marketReport}}")
    ? `${rendered.body}\n\n${marketReport}`
    : rendered.body;

  return {
    title: rendered.title,
    body: analysisSection ? `${bodyWithMarketReport}\n\n${analysisSection}` : bodyWithMarketReport,
  };
}

function selectCatalystItems(schedule: PulseSchedule, items: TopicItem[], now: Date): TopicItem[] {
  if (items.length <= 6) {
    return items;
  }

  const focus = dedupeSymbols([...schedule.focusSymbols, ...schedule.positionSymbols]);
  const primarySymbols = focus.slice(0, 20);
  const marketKeywords = keywordsByReportType(schedule.reportType, schedule.language);
  const nowMs = now.getTime();

  const scored = items.map((item, index) => {
    const text = `${item.title}\n${item.summary ?? ""}`.toUpperCase();
    const titleText = item.title.toUpperCase();
    let score = 0;

    const symbolHits = primarySymbols.filter((symbol) => text.includes(symbol)).length;
    const titleSymbolHits = primarySymbols.filter((symbol) => titleText.includes(symbol)).length;
    score += symbolHits * 8;
    score += titleSymbolHits * 6;

    const keywordHits = marketKeywords.filter((keyword) => text.includes(keyword)).length;
    score += Math.min(keywordHits, 5) * 2;

    if (item.category === "finance" || item.category === "macro" || item.category === "crypto-sentiment") {
      score += 4;
    } else if (item.category === "news") {
      score += 3;
    } else if (item.category === "international-tech" || item.category === "developer-trend") {
      score -= symbolHits > 0 ? 1 : 8;
    }

    const source = (item.source ?? "").toLowerCase();
    if (source.includes("reuters") || source.includes("bloomberg") || source.includes("sina") || source.includes("investing")) {
      score += 3;
    }

    const publishedAtMs = item.publishedAt ? Date.parse(item.publishedAt) : NaN;
    if (Number.isFinite(publishedAtMs)) {
      const ageHours = (nowMs - publishedAtMs) / (1000 * 60 * 60);
      if (ageHours <= 24) score += 4;
      else if (ageHours <= 72) score += 2;
      else if (ageHours > 168) score -= 2;
    }

    const url = normalizeHttpUrl(item.url);
    if (!url) {
      score -= 4;
    }

    return { item, score, index, publishedAtMs };
  });

  const sorted = scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aTime = Number.isFinite(a.publishedAtMs) ? a.publishedAtMs : 0;
    const bTime = Number.isFinite(b.publishedAtMs) ? b.publishedAtMs : 0;
    if (bTime !== aTime) return bTime - aTime;
    return a.index - b.index;
  });

  const top = sorted.filter((row) => row.score > -2).slice(0, 6).map((row) => row.item);

  if (top.length >= 4) {
    return top;
  }

  return sorted.slice(0, 6).map((row) => row.item);
}

function keywordsByReportType(reportType: PulseSchedule["reportType"], language: PulseSchedule["language"]): string[] {
  const zh: Record<PulseSchedule["reportType"], string[]> = {
    us_stock: ["美股", "纳指", "标普", "道指", "美联储", "通胀", "非农", "财报", "收益率", "美元", "期权"],
    a_share: ["A股", "上证", "深证", "沪深300", "北向资金", "央行", "政策", "地产", "消费", "券商"],
    crypto: ["比特币", "以太坊", "加密", "稳定币", "ETF", "链上", "监管", "矿工", "质押", "交易所"],
    daily_hot: ["宏观", "地缘", "政策", "市场", "通胀", "利率", "财报"],
    custom: ["市场", "宏观", "政策", "热点", "风险", "行情"],
  };
  const en: Record<PulseSchedule["reportType"], string[]> = {
    us_stock: ["NASDAQ", "S&P", "DOW", "FED", "CPI", "EARNINGS", "YIELD", "FOMC", "RATE CUT", "GUIDANCE"],
    a_share: ["A-SHARE", "SHANGHAI", "SHENZHEN", "CSI300", "PBOC", "POLICY", "PROPERTY", "LIQUIDITY"],
    crypto: ["BITCOIN", "ETHEREUM", "CRYPTO", "ETF", "ON-CHAIN", "REGULATION", "STABLECOIN", "LIQUIDITY"],
    daily_hot: ["MACRO", "GEOPOLITICS", "INFLATION", "RATES", "EARNINGS", "RISK"],
    custom: ["MARKET", "MACRO", "POLICY", "RISK", "TREND"],
  };
  const dict = language === "zh" ? zh : en;
  return dict[reportType].map((entry) => entry.toUpperCase());
}

interface QuoteRow {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

async function buildMarketReportSection(schedule: PulseSchedule, items: TopicItem[], generatedAt: string): Promise<string> {
  if (schedule.language !== "zh") {
    return "";
  }

  if (schedule.reportType === "us_stock") {
    return buildUsStockReport(schedule, items, generatedAt);
  }

  if (schedule.reportType === "crypto") {
    return buildCryptoReport(schedule, items, generatedAt);
  }

  if (schedule.reportType === "a_share") {
    return buildAShareReport(schedule, items, generatedAt);
  }

  return "";
}

async function buildUsStockReport(schedule: PulseSchedule, items: TopicItem[], generatedAt: string): Promise<string> {
  const benchmarks = await fetchTencentUsQuotes(["SPY", "QQQ", "DIA", "IWM"]);
  const watchSymbols = dedupeSymbols([
    ...schedule.focusSymbols,
    ...schedule.positionSymbols,
    "TSLA",
    "NVDA",
    "MSFT",
    "AAPL",
    "GOOGL",
  ]).slice(0, 12);
  const watchQuotes = await fetchTencentUsQuotes(watchSymbols);
  const xSentiment = schedule.moduleSwitches?.x_sentiment
    ? await fetchXSentimentSummary(schedule, watchSymbols)
    : [];
  const topWinners = watchQuotes.filter((row) => Number.isFinite(row.changePercent)).sort((a, b) => b.changePercent - a.changePercent).slice(0, 3);
  const topLosers = watchQuotes.filter((row) => Number.isFinite(row.changePercent)).sort((a, b) => a.changePercent - b.changePercent).slice(0, 2);

  const lines = [
    "**美股市场报告生成并推送成功**",
    "",
    `📊 **报告摘要 (${generatedAt})**`,
    "",
    "| 指数/ETF | 价格 | 涨跌 |",
    "|---------|------|------|",
    ...benchmarks.map((row) => `| ${row.symbol} | ${formatUsd(row.price)} | ${formatPctCell(row.changePercent)} |`),
    "",
    `**涨幅领先:** ${formatLeaders(topWinners)}`,
    `**跌幅较大:** ${formatLeaders(topLosers)}`,
    "",
    "**技术信号:**",
    ...buildSimpleTechnicalSignals(benchmarks),
  ];

  if (schedule.moduleSwitches?.fear_greed) {
    const fearGreed = readFearGreedItem(items);
    if (fearGreed) {
      lines.push(`**📊 恐惧贪婪指数**: ${fearGreed}`);
    }
  }

  if (schedule.moduleSwitches?.sentiment) {
    lines.push(`**💡 综合情绪**: ${buildNewsSentimentLabel(items)}`);
  }

  if (schedule.moduleSwitches?.macro) {
    lines.push(`**宏观背景:** ${buildMacroHint(items)}`);
  }

  lines.push(...buildSessionSection(schedule, generatedAt, watchQuotes, items));

  if (xSentiment.length > 0) {
    lines.push("", "### X 情绪跟踪", ...xSentiment.map((entry) => `- ${entry}`));
  }

  return lines.join("\n");
}

async function buildCryptoReport(schedule: PulseSchedule, items: TopicItem[], generatedAt: string): Promise<string> {
  const baseSymbols = dedupeSymbols([
    ...schedule.focusSymbols.map(toCryptoPair),
    ...schedule.positionSymbols.map(toCryptoPair),
    "BTCUSDT",
    "ETHUSDT",
    "SOLUSDT",
    "DOGEUSDT",
  ]).slice(0, 14);
  const quotes = await fetchBinanceQuotes(baseSymbols);
  const topWinners = quotes.slice().sort((a, b) => b.changePercent - a.changePercent).slice(0, 3);
  const topLosers = quotes.slice().sort((a, b) => a.changePercent - b.changePercent).slice(0, 3);
  const xSentiment = schedule.moduleSwitches?.x_sentiment
    ? await fetchXSentimentSummary(schedule, baseSymbols.map((symbol) => symbol.replace("USDT", "")))
    : [];

  const lines = [
    "**加密货币市场报告生成并推送成功**",
    "",
    `📊 **报告摘要 (${generatedAt})**`,
    "",
    "| 币种 | 价格 | 24h涨跌 |",
    "|------|------|---------|",
    ...quotes.slice(0, 6).map((row) => `| ${row.symbol.replace("USDT", "")} | ${formatUsd(row.price)} | ${formatPctCell(row.changePercent)} |`),
    "",
    `**涨幅领先:** ${formatLeaders(topWinners)}`,
    `**跌幅较大:** ${formatLeaders(topLosers)}`,
  ];

  if (schedule.moduleSwitches?.fear_greed) {
    const fearGreed = readFearGreedItem(items);
    if (fearGreed) {
      lines.push(`**📊 恐惧贪婪指数**: ${fearGreed}`);
    }
  }

  lines.push(...buildSessionSection(schedule, generatedAt, quotes, items));

  if (xSentiment.length > 0) {
    lines.push("", "### X 情绪跟踪", ...xSentiment.map((entry) => `- ${entry}`));
  }

  return lines.join("\n");
}

async function buildAShareReport(schedule: PulseSchedule, items: TopicItem[], generatedAt: string): Promise<string> {
  const indices = await fetchTencentIndexQuotes(["sh000001", "sz399001", "sh000300"]);
  const watchCodes = dedupeSymbols([
    ...schedule.focusSymbols,
    ...schedule.positionSymbols,
  ]).slice(0, 10).map(normalizeAShareCode).filter(Boolean) as string[];
  const watchQuotes = watchCodes.length > 0 ? await fetchTencentIndexQuotes(watchCodes) : [];

  const lines = [
    "**A股市场报告生成并推送成功**",
    "",
    `📊 **报告摘要 (${generatedAt})**`,
    "",
    "| 指数 | 点位 | 涨跌 |",
    "|------|------|------|",
    ...indices.map((row) => `| ${row.name || row.symbol} | ${row.price.toFixed(2)} | ${formatPctCell(row.changePercent)} |`),
  ];

  if (watchQuotes.length > 0) {
    lines.push(
      "",
      "**关注/持仓跟踪:**",
      ...watchQuotes.slice(0, 6).map((row) => `- ${row.symbol}: ${row.price.toFixed(2)} (${formatSignedPct(row.changePercent)})`)
    );
  }

  lines.push(...buildSessionSection(schedule, generatedAt, watchQuotes, items));
  return lines.join("\n");
}

async function fetchTencentUsQuotes(symbols: string[]): Promise<QuoteRow[]> {
  if (symbols.length === 0) return [];
  try {
    const query = symbols.map((symbol) => `us${symbol.toUpperCase()}`).join(",");
    const raw = await fetch(`https://qt.gtimg.cn/q=${query}`, {
      headers: { "User-Agent": "globalpulse-worker/0.1" },
    }).then((res) => res.text());
    return parseTencentQuoteLines(raw).map((row) => ({
      symbol: normalizeUsSymbol(row.code),
      name: row.name,
      price: row.price,
      change: row.change,
      changePercent: row.changePercent,
    })).filter((row) => Number.isFinite(row.price));
  } catch {
    return [];
  }
}

async function fetchTencentIndexQuotes(symbols: string[]): Promise<QuoteRow[]> {
  if (symbols.length === 0) return [];
  try {
    const query = symbols.join(",");
    const raw = await fetch(`https://qt.gtimg.cn/q=${query}`, {
      headers: { "User-Agent": "globalpulse-worker/0.1" },
    }).then((res) => res.text());
    return parseTencentQuoteLines(raw).map((row) => ({
      symbol: row.code,
      name: row.name,
      price: row.price,
      change: row.change,
      changePercent: row.changePercent,
    })).filter((row) => Number.isFinite(row.price));
  } catch {
    return [];
  }
}

interface BinanceQuote {
  symbol: string;
  price: number;
  changePercent: number;
}

async function fetchBinanceQuotes(symbols: string[]): Promise<BinanceQuote[]> {
  if (symbols.length === 0) return [];
  try {
    const url = new URL("https://api.binance.com/api/v3/ticker/24hr");
    url.searchParams.set("symbols", JSON.stringify(symbols));
    const response = await fetch(url.toString(), {
      headers: { "User-Agent": "globalpulse-worker/0.1" },
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json() as Array<{ symbol?: string; lastPrice?: string; priceChangePercent?: string }>;
    const parsed = payload.flatMap((entry) => {
      const symbol = entry.symbol?.toUpperCase();
      const price = Number(entry.lastPrice);
      const changePercent = Number(entry.priceChangePercent);
      if (!symbol || !Number.isFinite(price) || !Number.isFinite(changePercent)) {
        return [];
      }
      return [{ symbol, price, changePercent }];
    });

    if (parsed.length > 0) {
      return parsed;
    }

    const cg = await fetchCoinGeckoQuotes(symbols);
    if (cg.length > 0) return cg;
    return fetchAlternativeTickerQuotes(symbols);
  } catch {
    const cg = await fetchCoinGeckoQuotes(symbols);
    if (cg.length > 0) return cg;
    return fetchAlternativeTickerQuotes(symbols);
  }
}

async function fetchCoinGeckoQuotes(symbols: string[]): Promise<BinanceQuote[]> {
  const map: Record<string, string> = {
    BTCUSDT: "bitcoin",
    ETHUSDT: "ethereum",
    SOLUSDT: "solana",
    DOGEUSDT: "dogecoin",
    XRPUSDT: "ripple",
    BNBUSDT: "binancecoin",
    ADAUSDT: "cardano",
  };
  const ids = symbols.map((symbol) => map[symbol]).filter(Boolean);
  if (ids.length === 0) return [];

  try {
    const url = new URL("https://api.coingecko.com/api/v3/simple/price");
    url.searchParams.set("ids", ids.join(","));
    url.searchParams.set("vs_currencies", "usd");
    url.searchParams.set("include_24hr_change", "true");
    const response = await fetch(url.toString(), {
      headers: { "User-Agent": "globalpulse-worker/0.1" },
    });
    if (!response.ok) return [];
    const payload = await response.json() as Record<string, { usd?: number; usd_24h_change?: number }>;

    return Object.entries(map).flatMap(([symbol, id]) => {
      const record = payload[id];
      if (!record || !Number.isFinite(record.usd) || !Number.isFinite(record.usd_24h_change)) {
        return [];
      }
      return [{
        symbol,
        price: Number(record.usd),
        changePercent: Number(record.usd_24h_change),
      }];
    }).filter((row) => symbols.includes(row.symbol));
  } catch {
    return [];
  }
}

async function fetchAlternativeTickerQuotes(symbols: string[]): Promise<BinanceQuote[]> {
  try {
    const response = await fetch("https://api.alternative.me/v2/ticker/?limit=200&convert=USD", {
      headers: { "User-Agent": "globalpulse-worker/0.1" },
    });
    if (!response.ok) return [];
    const payload = await response.json() as {
      data?: Record<string, {
        symbol?: string;
        quotes?: {
          USD?: {
            price?: number;
            percentage_change_24h?: number;
          };
        };
      }>;
    };

    if (!payload.data) return [];
    const lookup = new Map<string, { price: number; changePercent: number }>();

    for (const entry of Object.values(payload.data)) {
      const symbol = entry.symbol?.toUpperCase();
      const usd = entry.quotes?.USD;
      if (!symbol || !usd || !Number.isFinite(usd.price) || !Number.isFinite(usd.percentage_change_24h)) {
        continue;
      }
      lookup.set(`${symbol}USDT`, {
        price: Number(usd.price),
        changePercent: Number(usd.percentage_change_24h),
      });
    }

    return symbols.flatMap((symbol) => {
      const row = lookup.get(symbol);
      if (!row) return [];
      return [{
        symbol,
        price: row.price,
        changePercent: row.changePercent,
      }];
    });
  } catch {
    return [];
  }
}

async function fetchXSentimentSummary(schedule: PulseSchedule, symbols: string[]): Promise<string[]> {
  const top = dedupeSymbols(symbols).slice(0, 4);
  const summaries: string[] = [];

  for (const symbol of top) {
    try {
      const rss = buildGoogleNewsRssUrl(`site:x.com ${symbol} (stock OR crypto OR market)`, schedule.language);
      const scoped = await fetchTopicItems(schedule.topicQuery, schedule.language, rss);
      const texts = scoped.items.slice(0, 6).map((item) => `${item.title}\n${item.summary ?? ""}`).join("\n").toUpperCase();
      if (!texts.trim()) continue;
      const score = classifySentiment(texts);
      const label = score > 0 ? "偏多" : score < 0 ? "偏空" : "中性";
      summaries.push(`${symbol}: ${label}（样本${scoped.items.length}条）`);
    } catch {
      // ignore per-symbol sentiment fetch failures
    }
  }

  return summaries;
}

function parseTencentQuoteLines(raw: string): Array<{ code: string; name: string; price: number; change: number; changePercent: number }> {
  return raw.split(";").flatMap((line) => {
    const match = /v_([^=]+)=\"([^\"]*)\"/.exec(line.trim());
    if (!match) return [];
    const code = match[1] || "";
    const fields = (match[2] || "").split("~");
    const name = fields[1] ?? code;
    const price = Number(fields[3]);
    const change = Number(fields[31]);
    const changePercent = Number(fields[32]);
    if (!Number.isFinite(price)) return [];
    return [{ code, name, price, change: Number.isFinite(change) ? change : 0, changePercent: Number.isFinite(changePercent) ? changePercent : 0 }];
  });
}

function normalizeUsSymbol(code: string): string {
  if (!code.startsWith("us")) return code.toUpperCase();
  const body = code.slice(2).toUpperCase();
  return body.split(".")[0] ?? body;
}

function normalizeAShareCode(code: string): string | undefined {
  const cleaned = code.trim().toLowerCase();
  if (!cleaned) return undefined;
  if (cleaned.startsWith("sh") || cleaned.startsWith("sz")) return cleaned;
  if (/^\d{6}$/.test(cleaned)) {
    return cleaned.startsWith("6") ? `sh${cleaned}` : `sz${cleaned}`;
  }
  return undefined;
}

function toCryptoPair(symbol: string): string {
  const normalized = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!normalized) return "BTCUSDT";
  if (normalized.endsWith("USDT")) return normalized;
  return `${normalized}USDT`;
}

function dedupeSymbols(symbols: string[]): string[] {
  return Array.from(new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)));
}

function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return "N/A";
  return `$${value.toFixed(value >= 100 ? 2 : 4)}`;
}

function formatSignedPct(value: number): string {
  if (!Number.isFinite(value)) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatPctCell(value: number): string {
  if (!Number.isFinite(value)) return "N/A";
  return `${formatSignedPct(value)} ${value >= 0 ? "🟢" : "🔴"}`;
}

function formatLeaders(rows: Array<{ symbol: string; changePercent: number }>): string {
  if (rows.length === 0) return "暂无";
  return rows.map((row) => `${row.symbol} ${formatSignedPct(row.changePercent)}`).join(", ");
}

function buildSimpleTechnicalSignals(rows: Array<{ symbol: string; changePercent: number }>): string[] {
  if (rows.length === 0) {
    return ["- 数据不足，暂无法判断技术信号"];
  }

  return rows.map((row) => {
    const abs = Math.abs(row.changePercent);
    const signal = abs >= 1.8 ? "HOLD" : row.changePercent >= 0 ? "BUY" : "SELL";
    return `- ${row.symbol} 波动 ${formatSignedPct(row.changePercent)}，${signal} 信号`;
  });
}

function readFearGreedItem(items: TopicItem[]): string | undefined {
  const fearGreed = items.find((item) => item.category === "crypto-sentiment");
  if (!fearGreed) return undefined;
  const score = typeof fearGreed.score === "number" ? fearGreed.score : undefined;
  const text = fearGreed.title.replace(/^Crypto Fear & Greed Index:\s*/i, "");
  return score !== undefined ? `${score} — ${text}` : text;
}

function buildNewsSentimentLabel(items: TopicItem[]): string {
  const allText = items.map((item) => `${item.title}\n${item.summary ?? ""}`).join("\n").toUpperCase();
  const positive = countKeywordHits(allText, ["BEAT", "SURGE", "RALLY", "突破", "利好", "超预期", "增长"]);
  const negative = countKeywordHits(allText, ["MISS", "DROP", "CRASH", "回撤", "利空", "低于预期", "衰退"]);
  const total = positive + negative + Math.max(items.length - positive - negative, 0);
  const score = total > 0 ? ((positive - negative) / total) * 100 : 0;
  const label = score >= 15 ? "🟢 偏多" : score <= -15 ? "🔴 偏空" : "🟡 中性";
  return `${label} (score=${score.toFixed(1)})`;
}

function buildMacroHint(items: TopicItem[]): string {
  const text = items.map((item) => `${item.title}\n${item.summary ?? ""}`).join("\n").toLowerCase();
  const fed = text.includes("fed") || text.includes("powell") || text.includes("美联储");
  const cpi = text.includes("cpi") || text.includes("inflation") || text.includes("通胀");
  const earnings = text.includes("earnings") || text.includes("财报");
  const parts: string[] = [];
  if (fed) parts.push("美联储政策仍是核心变量");
  if (cpi) parts.push("通胀数据主导降息预期");
  if (earnings) parts.push("财报分化加剧板块轮动");
  if (parts.length === 0) parts.push("宏观信号中性，等待新数据驱动");
  return parts.join("，");
}

function buildSessionSection(schedule: PulseSchedule, generatedAt: string, rows: Array<{ symbol: string; changePercent: number }>, items: TopicItem[]): string[] {
  const session = resolveMarketSession(schedule, generatedAt);
  const direction = rows.length > 0
    ? rows.reduce((sum, row) => sum + row.changePercent, 0) / rows.length
    : 0;
  const headline = direction >= 0 ? "偏强震荡" : "偏弱震荡";

  if (session === "pre_open") {
    return [
      "",
      "### 开盘前预期",
      `- 关注组合预期：${headline}，建议先看量价确认再加仓。`,
      "- 重点检查：隔夜宏观、期货方向、重点股新闻催化剂。",
    ];
  }

  if (session === "post_close") {
    const risk = classifySentiment(items.map((item) => item.title).join("\n").toUpperCase()) < 0 ? "风险偏高" : "风险可控";
    return [
      "",
      "### 盘后总结",
      `- 市场节奏：${headline}，${risk}。`,
      "- 次日计划：保留核心仓位，围绕强势主线做跟踪与回撤应对。",
    ];
  }

  return [
    "",
    "### 盘中跟踪",
    `- 当前节奏：${headline}，关注高波动标的分时量能变化。`,
    "- 执行建议：强势延续看突破，弱势回落看防守位与止损纪律。",
  ];
}

function resolveMarketSession(schedule: PulseSchedule, generatedAt: string): PulseSchedule["marketSession"] {
  if (schedule.marketSession !== "intraday") {
    return schedule.marketSession;
  }

  const hhmm = /(\d{1,2}):(\d{2})/.exec(generatedAt);
  const hour = hhmm ? Number(hhmm[1]) : NaN;
  if (!Number.isFinite(hour)) {
    return schedule.marketSession;
  }

  if (schedule.reportType === "us_stock") {
    if (hour <= 8) return "post_close";
    if (hour >= 20 && hour <= 22) return "pre_open";
    return "intraday";
  }

  if (schedule.reportType === "a_share") {
    if (hour <= 10) return "pre_open";
    if (hour >= 15) return "post_close";
    return "intraday";
  }

  return schedule.marketSession;
}

function buildAnalysisSection(schedule: PulseSchedule, items: TopicItem[]): string {
  const focusSymbols = schedule.focusSymbols ?? [];
  const positionSymbols = schedule.positionSymbols ?? [];
  const allText = items.map((item) => `${item.title}\n${item.summary ?? ""}`.toUpperCase()).join("\n");
  const positiveHitCount = countKeywordHits(allText, ["BEAT", "SURGE", "RISE", "突破", "增长", "利好", "反弹", "创新高"]);
  const negativeHitCount = countKeywordHits(allText, ["MISS", "FALL", "DROP", "CRASH", "下跌", "利空", "回撤", "风险"]);
  const neutralHitCount = Math.max(items.length - positiveHitCount - negativeHitCount, 0);

  if (schedule.language === "zh") {
    const focusSummary = buildSymbolSummary(items, focusSymbols, "focus");
    const positionSummary = buildSymbolSummary(items, positionSymbols, "position");
    const base = positiveHitCount >= negativeHitCount
      ? "基准场景：情绪偏中性偏多，关注量能延续与政策边际变化。"
      : "基准场景：情绪偏谨慎，优先关注回撤与波动放大风险。";
    const optimistic = "乐观场景：若宏观与业绩共振，相关资产可能出现趋势延续。";
    const risk = "风险场景：若流动性收紧或事件冲击，短期波动可能快速抬升。";
    const portfolioLayer = [
      positiveHitCount > negativeHitCount ? "情绪面：风险偏好小幅回升。" : "情绪面：市场防御情绪抬头。",
      negativeHitCount > 0 ? "事件面：出现潜在冲击事件，需跟踪后续发酵。" : "事件面：暂未出现高强度黑天鹅事件。",
      items.length >= 12 ? "波动面：样本新闻较密集，短线波动概率偏高。" : "波动面：信息密度一般，维持常规波动预期。",
    ];

    return [
      "## 特别关注与持仓分析",
      ...focusSummary,
      ...positionSummary,
      `- 异动统计：利多线索 ${positiveHitCount}，利空线索 ${negativeHitCount}，中性线索 ${neutralHitCount}`,
      `- 组合层：${portfolioLayer.join(" ")}`,
      "",
      "## 深度预测（场景推演）",
      `- ${base}`,
      `- ${optimistic}`,
      `- ${risk}`,
    ].join("\n");
  }

  const focusSummary = focusSymbols.length
    ? focusSymbols.map((symbol) => `${symbol}${allText.includes(symbol.toUpperCase()) ? " (hit)" : " (watch)"}`).join(", ")
    : "not set";
  const positionSummary = positionSymbols.length
    ? positionSymbols.map((symbol) => `${symbol}${allText.includes(symbol.toUpperCase()) ? " (related news)" : " (quiet)"}`).join(", ")
    : "not set";
  const base = positiveHitCount >= negativeHitCount
    ? "Base case: sentiment is mildly constructive with selective risk-on rotation."
    : "Base case: sentiment remains defensive with downside volatility risk.";

  return [
    "## Focus & Position Insights",
    `- Focus symbols: ${focusSummary}`,
    `- Position symbols: ${positionSummary}`,
    `- Signal counts: positive ${positiveHitCount}, negative ${negativeHitCount}, neutral ${neutralHitCount}`,
    "",
    "## Forecast Scenarios",
    `- ${base}`,
    "- Upside: policy support and earnings resilience extend the trend.",
    "- Risk: liquidity shocks or geopolitical headlines trigger fast drawdowns.",
  ].join("\n");
}

function countKeywordHits(input: string, keywords: string[]): number {
  return keywords.reduce((count, keyword) => count + (input.includes(keyword) ? 1 : 0), 0);
}

function buildActions(items: TopicItem[], language: PulseSchedule["language"]): Array<{ label: string; url: string }> {
  const actions: Array<{ label: string; url: string }> = [];
  const seen = new Set<string>();

  for (const item of items) {
    const url = normalizeHttpUrl(item.url);

    if (!url || seen.has(url)) {
      continue;
    }

    seen.add(url);
    actions.push({
      label: language === "zh" ? `查看原文${actions.length + 1}` : `Source ${actions.length + 1}`,
      url,
    });

    if (actions.length >= 6) {
      break;
    }
  }

  return actions;
}

function normalizeHttpUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = new URL(value.trim());

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }

    return parsed.toString();
  } catch {
    return undefined;
  }
}

function buildSymbolSummary(items: TopicItem[], symbols: string[], mode: "focus" | "position"): string[] {
  const prefix = mode === "focus" ? "- 特别关注" : "- 持仓";

  if (symbols.length === 0) {
    return [`${prefix}：未设置`];
  }

  return symbols.map((symbol) => {
    const upper = symbol.toUpperCase();
    const refs: number[] = [];
    let positive = 0;
    let negative = 0;

    items.forEach((item, index) => {
      const text = `${item.title}\n${item.summary ?? ""}`.toUpperCase();

      if (!text.includes(upper)) {
        return;
      }

      refs.push(index + 1);
      const score = classifySentiment(text);

      if (score > 0) positive += 1;
      if (score < 0) negative += 1;
    });

    const hitCount = refs.length;
    const refsText = hitCount > 0 ? refs.map((ref) => `#${ref}`).join(" ") : "无";
    const narrative = hitCount === 0
      ? "待观察"
      : positive > negative
        ? "偏利多"
        : negative > positive
          ? "偏利空"
          : "中性";
    const opportunity = hitCount === 0 ? "机会信号弱" : (positive >= negative ? "机会信号中等" : "机会信号偏弱");
    const risk = hitCount === 0 ? "风险未知" : (negative > 0 ? "风险因子偏高" : "风险因子可控");
    const correlation = hitCount >= 3 ? "高" : hitCount >= 1 ? "中" : "低";

    return `${prefix} ${symbol}：命中 ${hitCount} 条（${refsText}），主叙事 ${narrative}，机会 ${opportunity}，风险 ${risk}，相关性 ${correlation}`;
  });
}

function classifySentiment(input: string): number {
  const positive = countKeywordHits(input, ["BEAT", "SURGE", "RISE", "突破", "增长", "利好", "反弹", "创新高"]);
  const negative = countKeywordHits(input, ["MISS", "FALL", "DROP", "CRASH", "下跌", "利空", "回撤", "风险"]);

  if (positive > negative) return 1;
  if (negative > positive) return -1;
  return 0;
}

function getSampleItems(language: PulseSchedule["language"]): TopicItem[] {
  if (language === "en") {
    return [
      {
        title: "Fed officials signal patience as markets price a slower easing path",
        url: "https://example.com/fed-market-preview",
        source: "Global Markets Daily",
        category: "macro",
        score: 92,
        summary: "Treasury yields and the dollar moved together as investors reassessed the next policy window.",
      },
      {
        title: "AI infrastructure demand lifts chip and cloud supply-chain names",
        url: "https://example.com/ai-infrastructure",
        source: "Tech Finance Wire",
        category: "equities",
        score: 88,
        summary: "Semiconductor, power, and data-center operators led the risk-on segment of the session.",
      },
    ];
  }

  return [
    {
      title: "美联储官员释放耐心信号，市场重新定价降息节奏",
      url: "https://example.com/fed-market-preview",
      source: "Global Markets Daily",
      category: "macro",
      score: 92,
      summary: "美债收益率与美元同步波动，投资者重新评估下一轮政策窗口。",
    },
    {
      title: "AI 基础设施需求延续，芯片与云计算供应链表现活跃",
      url: "https://example.com/ai-infrastructure",
      source: "Tech Finance Wire",
      category: "equities",
      score: 88,
      summary: "半导体、电力和数据中心相关资产领涨风险偏好板块。",
    },
  ];
}
