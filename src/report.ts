import type { Env } from "./env";
import type { PulseSchedule } from "./config";
import { fetchTopicItems, fetchStockQuotes, fetchAShareIndices, type TopicItem, type StockQuote, type MoverGroup, type SentimentResult, type Catalyst } from "./sources";
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
  const enrichedBody = buildEnrichedBody(schedule, translatedItems, local.label, fetched.sourceUrl);
  const actions = buildActions(translatedItems, schedule.language);

  return {
    title: enrichedBody.title,
    body: enrichedBody.body,
    generatedAt: local.label,
    sourceUrl: fetched.sourceUrl,
    sourceStatus: fetched.status,
    sourceMessage: fetched.message,
    items: translatedItems,
    actions,
  };
}

/**
 * Modular market report builder — fetches live quotes, computes movers & sentiment,
 * and returns a structured market report. Keeps focusSymbols / positionSymbols
 * from the schedule config as the watched universe.
 */
export async function buildMarketReport(
  env: Env,
  schedule: PulseSchedule,
  now = new Date(),
): Promise<ReportBuildResult> {
  const local = getLocalTimeParts(now, schedule.timezone, schedule.language);
  const focusSymbols = schedule.focusSymbols ?? [];
  const positionSymbols = schedule.positionSymbols ?? [];
  const allSymbols = [...new Set([...focusSymbols, ...positionSymbols])];

  // Parallel fetch: US quotes + A-share indices + news items
  const [usQuotes, aShareIndices, topicData] = await Promise.all([
    allSymbols.length > 0 ? fetchStockQuotes(allSymbols) : Promise.resolve([]),
    schedule.reportType === "a_share" ? fetchAShareIndices() : Promise.resolve([]),
    fetchTopicItems(schedule.topicQuery, schedule.language, schedule.sourceUrl).catch(() => ({
      sourceUrl: schedule.sourceUrl ?? "",
      items: [] as TopicItem[],
    })),
  ]);

  const items = topicData.items;
  const sourceUrl = topicData.sourceUrl ?? schedule.sourceUrl ?? "";

  // Compute movers from the watched universe
  const movers = computeMovers(usQuotes, focusSymbols, positionSymbols);

  // Sentiment and catalyst analysis from news items
  const sentiment = scoreNewsSentiment(items, schedule.language);
  const catalysts = extractCatalysts(items, schedule.language);

  // Build market-specific body
  const body = buildMarketBody(schedule, local.label, usQuotes, aShareIndices, movers, sentiment, catalysts);
  const title = buildMarketTitle(schedule, local.label);
  const actions = buildActions(items, schedule.language);

  return {
    title,
    body,
    generatedAt: local.label,
    sourceUrl,
    sourceStatus: items.length > 0 ? "live" : "fallback",
    sourceMessage: items.length > 0
      ? (schedule.language === "zh" ? "实时市场数据获取成功" : "Live market data fetched")
      : (schedule.language === "zh" ? "实时数据获取失败，使用本地缓存" : "Live fetch failed, using cached data"),
    items,
    actions,
  };
}

function buildMarketTitle(schedule: PulseSchedule, generatedAt: string): string {
  const reportTypeLabel = schedule.reportType === "a_share"
    ? (schedule.language === "zh" ? "A股" : "A-Share")
    : schedule.reportType === "us_stock"
      ? (schedule.language === "zh" ? "美股" : "US Stocks")
      : schedule.reportType === "crypto"
        ? "Crypto"
        : (schedule.language === "zh" ? "市场日报" : "Market Daily");

  return `${reportTypeLabel} ${generatedAt}`;
}

function buildMarketBody(
  schedule: PulseSchedule,
  generatedAt: string,
  usQuotes: StockQuote[],
  aShareIndices: Array<{ symbol: string; name: string; price: number; change: number; changePercent: number }>,
  movers: MoverGroup,
  sentiment: SentimentResult,
  catalysts: Catalyst[],
): string {
  const isZh = schedule.language === "zh";
  const sections: string[] = [];

  // ── Market Overview ──────────────────────────────────────────────────────────
  if (isZh) {
    sections.push("## 市场概况");
  } else {
    sections.push("## Market Overview");
  }

  // A-share indices
  if (aShareIndices.length > 0) {
    const lines = aShareIndices.map((idx) => {
      const sign = idx.change >= 0 ? "+" : "";
      return `- ${idx.name}: ${idx.price.toFixed(2)} (${sign}${idx.changePercent.toFixed(2)}%)`;
    });
    if (isZh) {
      sections.push("**A股指数**");
    } else {
      sections.push("**A-Share Indices**");
    }
    sections.push(...lines);
    sections.push("");
  }

  // US ETF trackers
  if (usQuotes.length > 0) {
    const lines = usQuotes.map((q) => {
      const sign = q.change >= 0 ? "+" : "";
      return `- ${q.symbol}: $${q.price.toFixed(2)} (${sign}${q.changePercent.toFixed(2)}%)`;
    });
    if (isZh) {
      sections.push("**美股/ETF**");
    } else {
      sections.push("**US Equities / ETFs**");
    }
    sections.push(...lines);
    sections.push("");
  }

  // ── Movers ──────────────────────────────────────────────────────────────────
  if (movers.gainers.length > 0 || movers.losers.length > 0) {
    if (isZh) {
      sections.push("## 重点关注标的");
    } else {
      sections.push("## Focus Movers");
    }

    if (movers.gainers.length > 0) {
      if (isZh) {
        sections.push("**涨幅榜**");
      } else {
        sections.push("**Top Gainers**");
      }
      for (const g of movers.gainers) {
        sections.push(`- ${g.symbol}: +${g.changePercent.toFixed(2)}% @ $${g.price.toFixed(2)}`);
      }
    }

    if (movers.losers.length > 0) {
      if (isZh) {
        sections.push("**跌幅榜**");
      } else {
        sections.push("**Top Losers**");
      }
      for (const l of movers.losers) {
        sections.push(`- ${l.symbol}: ${l.changePercent.toFixed(2)}% @ $${l.price.toFixed(2)}`);
      }
    }
    sections.push("");
  }

  // ── Sentiment ────────────────────────────────────────────────────────────────
  if (isZh) {
    sections.push("## 市场情绪");
    sections.push(`- 情绪评分：${sentiment.score}/100（${sentiment.label}）`);
    sections.push(`- 正面线索 ${sentiment.positive}，负面线索 ${sentiment.negative}，中性线索 ${sentiment.neutral}`);
    sections.push(`- 预判：${sentiment.prediction}`);
    sections.push("");
  } else {
    sections.push("## Sentiment");
    sections.push(`- Score: ${sentiment.score}/100 (${sentiment.label})`);
    sections.push(`- Positive ${sentiment.positive}, Negative ${sentiment.negative}, Neutral ${sentiment.neutral}`);
    sections.push(`- Forecast: ${sentiment.prediction}`);
    sections.push("");
  }

  // ── Catalysts ───────────────────────────────────────────────────────────────
  if (catalysts.length > 0) {
    if (isZh) {
      sections.push("## 催化事件");
    } else {
      sections.push("## Catalysts");
    }
    for (const c of catalysts) {
      const impactIcon = c.impact === "利好" ? "📈" : c.impact === "利空" ? "📉" : "➡️";
      sections.push(`- ${impactIcon} [${c.impact}] ${c.title}`);
      sections.push(`  - 关键词: ${c.summary}`);
    }
    sections.push("");
  }

  return sections.join("\n");
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

function buildEnrichedBody(schedule: PulseSchedule, items: TopicItem[], generatedAt: string, sourceUrl: string): {
  title: string;
  body: string;
} {
  const rendered = renderDigest(schedule, {
    generatedAt,
    timezone: schedule.timezone,
    topicQuery: schedule.topicQuery,
    sourceUrl,
    items,
    format: schedule.outputFormat,
  });
  const analysisSection = buildAnalysisSection(schedule, items);

  return {
    title: rendered.title,
    body: analysisSection ? `${rendered.body}\n\n${analysisSection}` : rendered.body,
  };
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
