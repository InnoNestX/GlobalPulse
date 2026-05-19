import type { Env } from "./env";
import type { PulseSchedule } from "./config";
import { fetchTopicItems, type TopicItem } from "./sources";
import { renderDigest } from "./template";
import { getLocalTimeParts } from "./time";
import { buildResearchMarketReport, shouldUseResearchEngine } from "./research";

interface TranslationResult {
  title?: string;
  summary?: string;
}

interface TranslationOptions {
  maxItems?: number;
  concurrency?: number;
  allowAiFallback?: boolean;
}

const DAILY_HOT_TRANSLATION_LIMIT = 12;
const DAILY_HOT_TRANSLATION_CONCURRENCY = 3;
const DEFAULT_TRANSLATION_CONCURRENCY = 4;
const DAILY_HOT_DISPLAY_LIMIT = 20;
const GOOGLE_TRANSLATION_SEPARATOR = "1234567890GLOBALPULSE9876543210";

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
  const fetched = await fetchItemsWithFallback(env, schedule);

  if (shouldUseResearchEngine(schedule)) {
    const translatedItems = await maybeTranslateItems(env, fetched.items, schedule.language);
    const research = await buildResearchMarketReport(env, schedule, translatedItems, local.label, now);
    return {
      title: research.title,
      body: research.body,
      generatedAt: local.label,
      sourceUrl: fetched.sourceUrl,
      sourceStatus: fetched.status,
      sourceMessage: fetched.message,
      items: translatedItems,
      actions: buildActions(translatedItems, schedule.language),
    };
  }

  const selectedItems = selectDigestItems(schedule, fetched.items, now);
  const displayItems = await maybeTranslateItems(env, selectedItems, schedule.language, translationOptionsForSchedule(schedule));
  const rendered = renderDigest(schedule, {
    generatedAt: local.label,
    timezone: schedule.timezone,
    topicQuery: schedule.topicQuery,
    sourceUrl: fetched.sourceUrl,
    items: displayItems,
    format: schedule.outputFormat,
    marketReport: "",
  });

  return {
    title: rendered.title,
    body: rendered.body,
    generatedAt: local.label,
    sourceUrl: fetched.sourceUrl,
    sourceStatus: fetched.status,
    sourceMessage: fetched.message,
    items: displayItems,
    actions: buildActions(displayItems, schedule.language),
  };
}

function translationOptionsForSchedule(schedule: PulseSchedule): TranslationOptions {
  if (schedule.reportType === "daily_hot") {
    return {
      maxItems: DAILY_HOT_TRANSLATION_LIMIT,
      concurrency: DAILY_HOT_TRANSLATION_CONCURRENCY,
      allowAiFallback: false,
    };
  }

  return { concurrency: DEFAULT_TRANSLATION_CONCURRENCY };
}

async function fetchItemsWithFallback(env: Env, schedule: PulseSchedule): Promise<{
  status: "live" | "fallback";
  message: string;
  sourceUrl: string;
  items: TopicItem[];
}> {
  const effectiveQuery = buildEffectiveQuery(schedule);
  const isDailyHot = schedule.reportType === "daily_hot";
  try {
    const topicData = await fetchTopicItems(effectiveQuery, schedule.language, isDailyHot ? undefined : schedule.sourceUrl, {
      mode: schedule.reportType,
      newsApiKey: env.NEWSAPI_API_KEY,
    });

    if (!topicData.items.length) {
      throw new Error("all live sources returned empty items");
    }

    const dailyHotSourceHint = isDailyHot
      ? `每日热点实际来源：${topicData.sourceUrl}`
      : topicData.sourceUrl;

    return {
      status: "live",
      message: schedule.language === "zh" ? `实时抓取成功。${dailyHotSourceHint}` : `Live fetch succeeded. ${dailyHotSourceHint}`,
      sourceUrl: topicData.sourceUrl,
      items: topicData.items,
    };
  } catch (error) {
    const emergencyDailyHotItems = isDailyHot
      ? await fetchEmergencyDailyHotItems(effectiveQuery, schedule.language)
      : [];
    const fallbackItems = emergencyDailyHotItems.length > 0
      ? emergencyDailyHotItems
      : getSampleItems(schedule.language, schedule.reportType);
    const fallbackSource = isDailyHot
      ? emergencyDailyHotItems.length > 0
        ? "备用综合来源"
        : schedule.language === "zh" ? "备用示例数据" : "Sample fallback"
      : schedule.sourceUrl || "Google News, Sina Finance, Hacker News, GitHub Search, alternative.me";
    const errorMessage = error instanceof Error ? error.message : "unknown error";

    return {
      status: "fallback",
      message: schedule.language === "zh"
        ? isDailyHot
          ? emergencyDailyHotItems.length > 0
            ? `主热点源抓取失败，已启用备用综合来源：${errorMessage}`
            : `实时抓取失败，请稍后重试或检查数据源配置：${errorMessage}`
          : `实时抓取失败，已回退示例数据：${errorMessage}`
        : isDailyHot
          ? emergencyDailyHotItems.length > 0
            ? `Primary hot-news sources failed; emergency composite sources were used: ${errorMessage}`
            : `Live fetch failed. Please retry later or check source settings: ${errorMessage}`
          : `Live fetch failed, fallback sample data is used: ${errorMessage}`,
      sourceUrl: fallbackSource,
      items: fallbackItems,
    };
  }
}

async function fetchEmergencyDailyHotItems(query: string, language: PulseSchedule["language"]): Promise<TopicItem[]> {
  try {
    const fallback = await fetchTopicItems(query, language, undefined, { mode: "daily_hot" });
    return fallback.items
      .filter((item) => normalizeHttpUrl(item.url))
      .map((item, index) => ({
        ...item,
        section: item.section ?? inferSectionFromText(`${item.title}\n${item.summary ?? ""}`, item.source),
        score: Math.max((item.score ?? 0) + 50, 500 - index),
      }))
      .slice(0, 28);
  } catch {
    return [];
  }
}

function buildEffectiveQuery(schedule: PulseSchedule): string {
  const base = schedule.topicQuery.trim();
  if (schedule.reportType === "daily_hot") {
    return (base || "全球热点 国际新闻 地缘政治 宏观政策 产业趋势 国际关系").slice(0, 300);
  }

  const symbols = dedupeSymbols([...schedule.focusSymbols, ...schedule.positionSymbols]).slice(0, 5);
  const symbolQuery = symbols.join(" OR ");

  let marketQuery = "global market OR macro OR policy";
  if (schedule.reportType === "us_stock") {
    marketQuery = "US stock OR Nasdaq OR S&P 500 OR Dow OR Fed OR earnings";
  } else if (schedule.reportType === "a_share") {
    marketQuery = "A股 OR 上证 OR 深证 OR 沪深300 OR 北向资金 OR 央行 OR 证监会 OR 板块轮动 OR 中国市场";
  } else if (schedule.reportType === "crypto") {
    marketQuery = "Bitcoin OR Ethereum OR crypto OR ETF OR regulation OR stablecoin";
  }

  const merged = symbolQuery ? `${base} (${marketQuery}) (${symbolQuery})` : `${base} (${marketQuery})`;
  return merged.slice(0, 300);
}

function selectDigestItems(schedule: PulseSchedule, items: TopicItem[], now: Date): TopicItem[] {
  if (schedule.reportType === "daily_hot") {
    return selectDailyHotItems(items, now);
  }
  return selectRelevantItems(schedule, items, now).slice(0, 6);
}

function selectDailyHotItems(items: TopicItem[], now: Date): TopicItem[] {
  const nowMs = now.getTime();
  const filtered = items.filter((item) => !isDeveloperOnlyItem(item) && !isSingleCompanyFinanceItem(item) && !isLowInformationDailyHotItem(item, now) && !isLowSignalInvestmentBriefItem(item) && (() => {
    if (!item.publishedAt) return true;
    const pubMs = Date.parse(item.publishedAt);
    if (!Number.isFinite(pubMs)) return true;
    const ageHours = (nowMs - pubMs) / (1000 * 60 * 60);
    return ageHours <= 72;
  })());

  const scored = filtered.map((item, index) => {
    const text = `${item.title}\n${item.summary ?? ""}`.toLowerCase();
    let score = item.score ?? 0;
    if (/war|military|nato|russia|ukraine|israel|gaza|geopolitic|国防|军事|战争|俄乌|中东|地缘/.test(text)) score += 12;
    if (/policy|government|regulation|tariff|election|央行|政策|监管|关税|选举|财政/.test(text)) score += 11;
    if (/inflation|rate|fed|central bank|cpi|gdp|通胀|利率|美联储|宏观|经济/.test(text)) score += 10;
    if (/industry|supply chain|ai|energy|chip|产业|供应链|能源|芯片|科技/.test(text)) score += 8;
    if (/earthquake|flood|wildfire|disaster|outbreak|地震|洪水|山火|灾害|疫情|事故|公共卫生/.test(text)) score += 8;
    if (item.category === "geopolitics" || item.category === "policy" || item.category === "macro" || item.category === "risk-event") score += 8;
    if (item.category === "industry" || item.category === "global-news") score += 4;
    if (item.source && /newsapi|reuters|ap news|bbc|bloomberg|financial times|associated press|路透|新华社|央视|联合早报/i.test(item.source)) score += 4;
    const publishedAtMs = item.publishedAt ? Date.parse(item.publishedAt) : NaN;
    if (Number.isFinite(publishedAtMs)) {
      const ageHours = (nowMs - publishedAtMs) / (1000 * 60 * 60);
      if (ageHours <= 12) score += 8;
      else if (ageHours <= 24) score += 5;
      else if (ageHours <= 72) score += 2;
      else score -= 4;
    }
    return { item, index, score, publishedAtMs: Number.isFinite(publishedAtMs) ? publishedAtMs : 0 };
  });

  const usedKeys = new Set<string>();
  const result: TopicItem[] = [];

  const bySection = { global: [] as typeof scored, domestic: [] as typeof scored, platform: [] as typeof scored };
  for (const entry of scored) {
    const section = entry.item.section ?? inferSectionFromText(`${entry.item.title}\n${entry.item.summary ?? ""}`, entry.item.source);
    if (section === "domestic") bySection.domestic.push(entry);
    else if (section === "platform") bySection.platform.push(entry);
    else bySection.global.push(entry);
  }

  const sortEntries = (candidates: typeof scored): typeof scored =>
    [...candidates].sort((a, b) => b.score - a.score || b.publishedAtMs - a.publishedAtMs || a.index - b.index);
  const itemKeys = (item: TopicItem): string[] => {
    const keys = [normalizeUrlKey(item.url)];
    const titleKey = normalizeTitleKey(item.title);
    if (titleKey) keys.push(`title:${titleKey}`);
    return keys;
  };
  const hasUsedItem = (item: TopicItem): boolean => itemKeys(item).some((key) => usedKeys.has(key));
  const markItem = (item: TopicItem): void => {
    for (const key of itemKeys(item)) usedKeys.add(key);
  };

  const topPlatformItem = sortEntries(bySection.platform)[0]?.item;
  if (topPlatformItem) {
    markItem(topPlatformItem);
  }

  const pickFrom = (candidates: typeof scored, max: number): TopicItem[] => {
    const selected: TopicItem[] = [];
    for (const entry of sortEntries(candidates)) {
      if (selected.length >= max) break;
      if (hasUsedItem(entry.item)) continue;
      markItem(entry.item);
      selected.push(entry.item);
    }
    return selected;
  };

  result.push(...pickFrom(bySection.global, 4));
  result.push(...pickFrom(bySection.domestic, 4));
  result.push(...pickFrom(bySection.platform, 3));
  if (topPlatformItem) {
    result.push(topPlatformItem);
  }
  result.push(...pickFrom(scored, Math.max(0, DAILY_HOT_DISPLAY_LIMIT - result.length)));

  return result.length > 0
    ? result
    : items.filter((item) => !isLowInformationDailyHotItem(item, now) && !isLowSignalInvestmentBriefItem(item) && !isDeveloperOnlyItem(item) && !isSingleCompanyFinanceItem(item)).slice(0, DAILY_HOT_DISPLAY_LIMIT);
}

function inferSectionFromText(text: string, source?: string | null): "domestic" | "platform" | "global" {
  const merged = `${text}\n${source ?? ""}`.toLowerCase();
  if (/抖音|微博|百度热搜|平台热搜|douyin|weibo|hot search/.test(merged)) return "platform";
  if (/中国|国内|多地|民生|就业|消费|公共服务|医疗|教育|资本市场|北京|上海|深圳|广州|杭州|成都|重庆|国务院|人民银行|工信部|证监会|新华社|央视|人民日报|cctv|xinhuanet|people.cn|gov.cn|\bchina\b|\bchinese\b|\bbeijing\b|\bshanghai\b|\bshenzhen\b|\bguangzhou\b|\bhangzhou\b|\bchengdu\b|\bchongqing\b|\btaiwan\b|\bhong kong\b|\bmacau\b|\bmacao\b|\bpboc\b|\bcsrc\b|\ba-shares?\b|\byuan\b|\brenminbi\b|south china sea/.test(merged)) return "domestic";
  return "global";
}

function normalizeUrlKey(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, "");
  } catch {
    return url.toLowerCase();
  }
}

function normalizeTitleKey(title: string): string {
  return title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function selectRelevantItems(schedule: PulseSchedule, items: TopicItem[], now: Date): TopicItem[] {
  if (items.length === 0) return [];
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
    score += symbolHits * 8 + titleSymbolHits * 6;
    const titleKeywordHits = marketKeywords.filter((keyword) => titleText.includes(keyword)).length;
    const keywordHits = marketKeywords.filter((keyword) => text.includes(keyword)).length;
    score += Math.min(keywordHits, 6) * 2 + Math.min(titleKeywordHits, 4) * 2;
    if (item.category === "finance" || item.category === "macro" || item.category === "crypto-sentiment") score += 4;
    else if (item.category === "news") score += 3;
    else if (item.category === "international-tech" || item.category === "developer-trend") score -= symbolHits > 0 ? 4 : 12;
    const url = normalizeHttpUrl(item.url) ?? "";
    if (!url) score -= 4;
    const publishedAtMs = item.publishedAt ? Date.parse(item.publishedAt) : NaN;
    if (Number.isFinite(publishedAtMs)) {
      const ageHours = (nowMs - publishedAtMs) / (1000 * 60 * 60);
      if (ageHours <= 18) score += 6;
      else if (ageHours <= 36) score += 4;
      else if (ageHours <= 72) score += 2;
      else if (ageHours > 168) score -= 6;
    }
    return { item, score, index, publishedAtMs };
  });

  return scored
    .sort((a, b) => b.score - a.score || (Number(b.publishedAtMs) || 0) - (Number(a.publishedAtMs) || 0) || a.index - b.index)
    .slice(0, 6)
    .map((entry) => entry.item);
}

function isDeveloperOnlyItem(item: TopicItem): boolean {
  const source = (item.source ?? "").toLowerCase();
  const category = (item.category ?? "").toLowerCase();
  return source.includes("github") || source.includes("hacker news") || category === "developer-trend" || category === "international-tech";
}

function isSingleCompanyFinanceItem(item: TopicItem): boolean {
  const text = `${item.title}\n${item.summary ?? ""}`;
  return /回购|派息|每股收益|季度收入|财报|港元回购|dividend|eps|shares repurchased/i.test(text)
    && !/政策|监管|关税|通胀|利率|央行|地缘|战争|能源|供应链/i.test(text);
}

function isLowInformationDailyHotItem(item: TopicItem, now: Date): boolean {
  const rawTitle = item.title.trim();
  const title = rawTitle.replace(/\s+-\s+(微博|Weibo|抖音|Douyin|小红书|知乎|百度)\s*$/i, "").trim();
  const text = `${title}\n${item.summary ?? ""}`;
  const source = item.source ?? "";
  const isPlatform = item.section === "platform" || /微博|weibo|抖音|douyin|小红书|知乎|百度|热搜/i.test(source);
  const currentYear = now.getFullYear();

  if (/^(微博正文|微博|weibo|抖音|douyin|小红书|知乎|百度|登录|首页|详情页)$/i.test(title)) return true;
  if (/微博正文|登录后可见|请先登录|客户端下载|无障碍|首页导航|广告|推广/i.test(text) && text.length < 60) return true;
  if (/年度回忆|热点记忆|抖音热点记忆|年度盘点|年终盘点|往年回顾|历史回顾|合集/i.test(text)) return true;
  if (isPlatform && hasStaleYearMarker(text, currentYear)) return true;
  if (isPlatform && !/热搜|热榜|热议|热点|破亿|千万|爆|关注|讨论|回应|发布|宣布|政策|事件|事故|天气|地震|赛事|电影|消费|民生|医疗|教育|trending/i.test(text)) return true;
  return title.length < 6 && !item.summary;
}

function isLowSignalInvestmentBriefItem(item: TopicItem): boolean {
  const text = `${item.title}\n${item.summary ?? ""}\n${item.source ?? ""}`;
  const normalized = text.replace(/\s+/g, " ");

  if (hasInvestmentBriefSignal(normalized)) return false;

  return /文艺演出|助残日|博物馆|文博|文创|市集|打卡|旅游|景区|老字号|哲学社会科学|自主知识体系|党校|高校|大学|中学|小学|校园|书画|诗歌|阅读|朗诵|演出|艺术团|文化活动|志愿|公益|文明实践|非遗|展览|展会|运动会|开幕式|闭幕式|嘉年华|夜游|音乐节|短剧|综艺|电视剧|电影节|明星|粉丝|网红|美食节|天气好|养生|健康科普|萌娃|宠物|八卦|广告|推广|优惠券|促销|招商|报名|门票|获奖名单/i.test(normalized);
}

function hasInvestmentBriefSignal(text: string): boolean {
  return /宏观|经济|政策|监管|财政|央行|货币|通胀|利率|就业|消费|出口|进口|关税|贸易|产业|供应链|能源|油价|天然气|电力|芯片|半导体|AI|人工智能|算力|数据中心|金融|资本市场|A股|股市|债券|汇率|人民币|美元|房地产|地产|制裁|地缘|外交|冲突|战争|军事|中东|俄乌|俄罗斯|乌克兰|美国|欧盟|伊朗|以色列|红海|南海|航运|港口|公共卫生|疫情|地震|洪水|灾害|安全|事故|IPO|并购|投资|融资|价格|市场|银行|保险|证券|基金|大宗|黄金|铜|粮食|农产品|汽车|新能源|药品|医疗|教育|民生|补贴|税|法案|法院|裁定|反垄断|数据|中俄|台海|南海|高考|住房|租赁/i.test(text);
}

function hasStaleYearMarker(text: string, currentYear: number): boolean {
  if (!/年度|回忆|记忆|盘点|回顾|合集|挑战|热点/.test(text)) return false;
  const years = Array.from(text.matchAll(/\b(20\d{2})\b/g)).map((match) => Number(match[1]));
  return years.some((year) => Number.isFinite(year) && year < currentYear);
}

async function maybeTranslateItems(env: Env, items: TopicItem[], language: PulseSchedule["language"], options: TranslationOptions = {}): Promise<TopicItem[]> {
  if (language !== "zh" || items.length === 0) return items;
  const limit = Math.max(0, Math.min(options.maxItems ?? items.length, items.length));
  const translatedItems = await mapWithConcurrency(items.slice(0, limit), options.concurrency ?? DEFAULT_TRANSLATION_CONCURRENCY, async (item) => {
    if (!needsTranslation(item.title) && !needsTranslation(item.summary)) return item;
    const translated = await translateToChinese(env, item.title, item.summary, options);
    return withOptionalSummary({ ...item, title: translated.title?.trim() || item.title }, translated.summary?.trim() || item.summary);
  });
  return [...translatedItems, ...items.slice(limit)];
}

async function translateToChinese(env: Env, title: string, summary?: string, options: TranslationOptions = {}): Promise<TranslationResult> {
  const translatedByGoogle = await translateViaGoogleFree(title, summary);
  if (translatedByGoogle.title || translatedByGoogle.summary) return translatedByGoogle;
  if (options.allowAiFallback === false) return {};

  const ai = env.AI;
  if (!ai || typeof ai !== "object" || !("run" in ai) || typeof ai.run !== "function") return {};

  const prompt = [
    "你是新闻翻译助手。将下面 JSON 字段翻译成简体中文，只输出 JSON，不要额外解释。",
    "保留原有事实、数字、国家、机构和公司名称，不要新增字段。",
    `输入：${JSON.stringify({ title, summary: summary ?? "" })}`,
    "输出格式：{\"title\":\"...\",\"summary\":\"...\"}",
  ].join("\n");

  try {
    const inference = await ai.run("@cf/meta/llama-3.1-8b-instruct", { prompt }) as unknown;
    const content = extractAiText(inference);
    if (!content) return {};
    const parsed = safeParseJson(extractJson(content));
    if (!parsed) return {};
    const translation: TranslationResult = {};
    if (typeof parsed.title === "string") translation.title = parsed.title;
    if (typeof parsed.summary === "string") translation.summary = parsed.summary;
    return translation;
  } catch (error) {
    console.warn("Workers AI translation failed", error);
    return {};
  }
}

async function translateViaGoogleFree(title: string, summary?: string): Promise<TranslationResult> {
  const titleNeedsTranslation = needsTranslation(title);
  const summaryNeedsTranslation = needsTranslation(summary);

  if (titleNeedsTranslation && summaryNeedsTranslation && summary?.trim()) {
    const combined = await translateSingleViaGoogleFree(`${title}\n${GOOGLE_TRANSLATION_SEPARATOR}\n${summary}`);
    const pair = splitCombinedTranslation(combined);
    if (pair) {
      return pair;
    }
    return {};
  }

  const titleTranslation = titleNeedsTranslation ? await translateSingleViaGoogleFree(title) : undefined;
  const summaryTranslation = summaryNeedsTranslation ? await translateSingleViaGoogleFree(summary ?? "") : undefined;
  const translation: TranslationResult = {};
  if (titleTranslation) translation.title = titleTranslation;
  if (summaryTranslation) translation.summary = summaryTranslation;
  return translation;
}

async function translateSingleViaGoogleFree(input: string): Promise<string | undefined> {
  if (!input.trim()) return undefined;
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", "zh-CN");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", input);
  try {
    const response = await fetch(url.toString(), {
      headers: { "User-Agent": "globalpulse-worker/0.1", "Accept": "application/json,text/plain,*/*" },
    });
    if (!response.ok) return undefined;
    return extractGoogleTranslation(await response.json())?.trim() || undefined;
  } catch {
    return undefined;
  }
}

function extractGoogleTranslation(payload: unknown): string | undefined {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) return undefined;
  const translated = payload[0].flatMap((segment) => Array.isArray(segment) && typeof segment[0] === "string" ? [segment[0]] : []).join("");
  return translated || undefined;
}

function splitCombinedTranslation(value: string | undefined): TranslationResult | undefined {
  if (!value) return undefined;
  const parts = value.split(new RegExp(`\\s*${GOOGLE_TRANSLATION_SEPARATOR}\\s*`, "i"));
  if (parts.length < 2) return undefined;
  const title = parts[0]?.trim();
  const summary = parts.slice(1).join(" ").trim();
  if (!title && !summary) return undefined;
  return { ...(title ? { title } : {}), ...(summary ? { summary } : {}) };
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const width = Math.max(1, Math.min(Math.floor(concurrency), items.length || 1));
  const results = new Array<R>(items.length);
  let index = 0;

  await Promise.all(Array.from({ length: width }, async () => {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await mapper(items[current] as T);
    }
  }));

  return results;
}

function extractAiText(result: unknown): string | undefined {
  if (typeof result === "string") return result;
  if (!result || typeof result !== "object") return undefined;
  if (typeof (result as { response?: unknown }).response === "string") return (result as { response: string }).response;
  if (typeof (result as { output_text?: unknown }).output_text === "string") return (result as { output_text: string }).output_text;
  return undefined;
}

function extractJson(input: string): string {
  const start = input.indexOf("{");
  const end = input.lastIndexOf("}");
  return start >= 0 && end > start ? input.slice(start, end + 1) : input;
}

function safeParseJson(input: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(input) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : undefined;
  } catch {
    return undefined;
  }
}

function withOptionalSummary(item: TopicItem, summary: string | undefined): TopicItem {
  if (!summary) {
    const { summary: _oldSummary, ...rest } = item;
    return rest;
  }
  return { ...item, summary };
}

function needsTranslation(value: string | undefined): boolean {
  return Boolean(value && /[A-Za-z]{4,}/.test(value));
}

function keywordsByReportType(reportType: PulseSchedule["reportType"], language: PulseSchedule["language"]): string[] {
  const zh: Record<PulseSchedule["reportType"], string[]> = {
    us_stock: ["美股", "纳指", "标普", "道指", "美联储", "通胀", "非农", "财报", "收益率", "美元", "期权"],
    a_share: ["A股", "上证", "深证", "沪深300", "北向资金", "央行", "政策", "地产", "消费", "券商"],
    crypto: ["比特币", "以太坊", "加密", "稳定币", "ETF", "链上", "监管", "矿工", "质押", "交易所"],
    daily_hot: ["宏观", "地缘", "政策", "市场", "通胀", "利率", "国际"],
    custom: ["市场", "宏观", "政策", "热点", "风险", "行情"],
  };
  const en: Record<PulseSchedule["reportType"], string[]> = {
    us_stock: ["NASDAQ", "S&P", "DOW", "FED", "CPI", "EARNINGS", "YIELD", "FOMC", "RATE CUT", "GUIDANCE"],
    a_share: ["A-SHARE", "SHANGHAI", "SHENZHEN", "CSI300", "PBOC", "POLICY", "PROPERTY", "LIQUIDITY"],
    crypto: ["BITCOIN", "ETHEREUM", "CRYPTO", "ETF", "ON-CHAIN", "REGULATION", "STABLECOIN", "LIQUIDITY"],
    daily_hot: ["MACRO", "GEOPOLITICS", "INFLATION", "RATES", "POLICY", "GLOBAL"],
    custom: ["MARKET", "MACRO", "POLICY", "RISK", "TREND"],
  };
  return (language === "zh" ? zh : en)[reportType].map((entry) => entry.toUpperCase());
}

function buildActions(items: TopicItem[], language: PulseSchedule["language"]): Array<{ label: string; url: string }> {
  const actions: Array<{ label: string; url: string }> = [];
  const seen = new Set<string>();
  for (const item of items) {
    const url = normalizeHttpUrl(item.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    actions.push({ label: language === "zh" ? `查看原文${actions.length + 1}` : `Source ${actions.length + 1}`, url });
    if (actions.length >= 6) break;
  }
  return actions;
}

function normalizeHttpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function dedupeSymbols(symbols: string[]): string[] {
  return Array.from(new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)));
}

function getSampleItems(language: PulseSchedule["language"], reportType: PulseSchedule["reportType"]): TopicItem[] {
  if (reportType === "daily_hot") {
    return [];
  }

  if (language === "en") {
    return [
      { title: "Fed officials signal patience as markets price a slower easing path", url: "https://example.com/fed-market-preview", source: "Global Markets Daily", category: "macro", score: 92, summary: "Treasury yields and the dollar moved together as investors reassessed the next policy window." },
      { title: "AI infrastructure demand lifts chip and cloud supply-chain names", url: "https://example.com/ai-infrastructure", source: "Tech Finance Wire", category: "equities", score: 88, summary: "Semiconductor, power, and data-center operators led the risk-on segment of the session." },
    ];
  }

  return [
    { title: "美联储官员释放耐心信号，市场重新定价降息节奏", url: "https://example.com/fed-market-preview", source: "Global Markets Daily", category: "macro", score: 92, summary: "美债收益率与美元同步波动，投资者重新评估下一轮政策窗口。" },
    { title: "AI 基础设施需求延续，芯片与云计算供应链表现活跃", url: "https://example.com/ai-infrastructure", source: "Tech Finance Wire", category: "equities", score: 88, summary: "半导体、电力和数据中心相关资产领涨风险偏好板块。" },
  ];
}
