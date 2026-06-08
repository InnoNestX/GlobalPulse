import type { AppLanguage, ReportType } from "./config";

export interface TopicItem {
  title: string;
  url: string;
  source?: string;
  publishedAt?: string;
  category?: string;
  score?: number;
  summary?: string;
  section?: "domestic" | "platform" | "global" | undefined;
}

const DAILY_HOT_REACHABILITY_CHECKS = 0;
const DAILY_HOT_RETURN_LIMIT = 28;
const DAILY_HOT_GLOBAL_POOL_LIMIT = 10;
const DAILY_HOT_DOMESTIC_POOL_LIMIT = 8;
const DAILY_HOT_PLATFORM_POOL_LIMIT = 8;
const SOURCE_FETCH_TIMEOUT_MS = 8_000;
const GDELT_FETCH_TIMEOUT_MS = 4_000;
const RSS_FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; GlobalPulse/0.1)",
  "Accept": "application/rss+xml, application/xml, text/xml, */*;q=0.8",
};
const JSON_FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; GlobalPulse/0.1)",
  "Accept": "application/json, text/plain, */*",
};

export interface TopicFetchOptions {
  mode?: ReportType;
  newsApiKey?: string;
}

export async function fetchTopicItems(
  query: string,
  language: AppLanguage,
  sourceUrl?: string,
  options: TopicFetchOptions = {},
): Promise<{ sourceUrl: string; items: TopicItem[] }> {
  if (options.mode === "daily_hot") {
    return fetchDailyHotTopicItems(query, language, options.newsApiKey);
  }

  if (!sourceUrl && isMarketReportMode(options.mode)) {
    return fetchMarketTopicItems(query, language, options.mode);
  }

  if (!sourceUrl) {
    return fetchCompositeTopicItems(query, language);
  }

  const response = await fetchWithTimeout(sourceUrl, {
    headers: {
      "User-Agent": "globalpulse-worker/0.1",
      "Accept": "application/rss+xml, application/xml, text/xml",
    },
  });

  if (!response.ok) throw new Error(`Topic source returned ${response.status}`);
  return { sourceUrl, items: parseRssItems(await response.text()).slice(0, 12) };
}

async function fetchDailyHotTopicItems(query: string, language: AppLanguage, newsApiKey?: string): Promise<{ sourceUrl: string; items: TopicItem[] }> {
  const [
    googleResult,
    globalEnglishResult,
    directGlobalResult,
    domesticResult,
    directDomesticResult,
    platformResult,
    toutiaoHotResult,
    tencentHotResult,
  ] = await Promise.allSettled([
    fetchGoogleNewsItems(query, language, 6),
    language === "zh" ? fetchGoogleNewsItems(buildGlobalEnglishDailyHotQuery(query), "en", 10) : Promise.resolve([]),
    fetchDirectGlobalNewsItems(language, 12),
    fetchChineseDomesticNewsItems(language, 10),
    fetchDirectDomesticNewsItems(language, 10),
    fetchPlatformHotDiscussionItems(language, 6),
    fetchToutiaoHotItems(language, 10),
    fetchTencentHotRankingItems(language, 10),
  ]);
  let newsApiItems: TopicItem[] = [];
  if (newsApiKey) {
    const [newsApiResult] = await Promise.allSettled([fetchNewsApiDailyHotItems(query, language, newsApiKey)]);
    newsApiItems = newsApiResult?.status === "fulfilled" ? newsApiResult.value : [];
  }
  const googleItems = googleResult.status === "fulfilled" ? googleResult.value : [];
  const globalEnglishItems = globalEnglishResult.status === "fulfilled" ? markGlobalDailyHotItems(globalEnglishResult.value) : [];
  const directGlobalItems = directGlobalResult.status === "fulfilled" ? directGlobalResult.value : [];
  const domesticItems = domesticResult.status === "fulfilled" ? domesticResult.value : [];
  const directDomesticItems = directDomesticResult.status === "fulfilled" ? directDomesticResult.value : [];
  const platformItems = platformResult.status === "fulfilled" ? platformResult.value : [];
  const toutiaoHotItems = toutiaoHotResult.status === "fulfilled" ? toutiaoHotResult.value : [];
  const tencentHotItems = tencentHotResult.status === "fulfilled" ? tencentHotResult.value : [];
  const items = await filterReachableTopicItems(
    [
      ...toutiaoHotItems,
      ...tencentHotItems,
      ...platformItems,
      ...directDomesticItems,
      ...domesticItems,
      ...newsApiItems,
      ...directGlobalItems,
      ...googleItems,
      ...globalEnglishItems,
    ],
    DAILY_HOT_REACHABILITY_CHECKS,
  );
  const sourceUrl = buildDailyHotSourceSummary([
    ["NewsAPI", newsApiItems.length],
    ["直接国际RSS", directGlobalItems.length],
    ["国内/香港媒体RSS", directDomesticItems.length],
    ["国内/香港新闻", domesticItems.length],
    ["头条热榜", toutiaoHotItems.length],
    ["腾讯新闻热榜", tencentHotItems.length],
    ["平台热搜讨论", platformItems.length],
    ["国际新闻", googleItems.length + globalEnglishItems.length],
  ], language);
  return { sourceUrl, items: composeDailyHotItemPool(items, DAILY_HOT_RETURN_LIMIT) };
}

function composeDailyHotItemPool(items: TopicItem[], limit: number): TopicItem[] {
  const sorted = sortTopicItems(items);
  const bySection = {
    global: [] as TopicItem[],
    domestic: [] as TopicItem[],
    platform: [] as TopicItem[],
  };

  for (const item of sorted) {
    const section = item.section ?? inferSection(item);
    bySection[section].push(item);
  }

  const selected: TopicItem[] = [];
  const seen = new Set<string>();
  const addFrom = (candidates: TopicItem[], max: number): void => {
    for (const item of candidates) {
      if (selected.length >= limit || max <= 0) break;
      const key = normalizeTopicKey(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      selected.push(item);
      max -= 1;
    }
  };

  addFrom(bySection.global, DAILY_HOT_GLOBAL_POOL_LIMIT);
  addFrom(bySection.domestic, DAILY_HOT_DOMESTIC_POOL_LIMIT);
  addFrom(bySection.platform, DAILY_HOT_PLATFORM_POOL_LIMIT);
  addFrom(sorted, limit - selected.length);

  return selected;
}

function buildDailyHotSourceSummary(sources: Array<[string, number]>, language: AppLanguage): string {
  const visible = sources
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `${label}(${count}条)`);

  return visible.length > 0
    ? visible.join("，")
    : language === "zh" ? "实时新闻源" : "Live news sources";
}

async function fetchCompositeTopicItems(query: string, language: AppLanguage): Promise<{ sourceUrl: string; items: TopicItem[] }> {
  const sources = await Promise.allSettled([
    fetchGoogleNewsItems(query, language),
    fetchSinaFinanceItems(),
    fetchHackerNewsItems(),
    fetchGithubTrendingItems(),
    fetchFearGreedItem(),
  ]);
  const items = sources.flatMap((source) => source.status === "fulfilled" ? source.value : []);
  return { sourceUrl: "Google News, Sina Finance, Hacker News, GitHub Search, alternative.me", items: items.slice(0, 24) };
}

async function fetchMarketTopicItems(query: string, language: AppLanguage, mode: ReportType): Promise<{ sourceUrl: string; items: TopicItem[] }> {
  const sources = await Promise.allSettled(buildMarketTopicFetchers(query, language, mode).map((fetcher) => fetcher()));
  const items = sortTopicItems(dedupeTopicItems(sources.flatMap((source) => source.status === "fulfilled" ? source.value : [])))
    .slice(0, mode === "a_share" ? 10 : 8);

  return {
    sourceUrl: marketTopicSourceLabel(mode, language),
    items,
  };
}

function buildMarketTopicFetchers(query: string, language: AppLanguage, mode: ReportType): Array<() => Promise<TopicItem[]>> {
  if (mode === "a_share") {
    return [
      () => fetchGoogleNewsItems(query, language, 6),
      () => fetchChineseDomesticNewsItems(language, 6),
      () => fetchDirectDomesticNewsItems(language, 6),
    ];
  }

  if (mode === "crypto") {
    const cryptoQuery = language === "zh"
      ? `${query} Bitcoin Ethereum crypto ETF regulation liquidity stablecoin`
      : query;
    return [
      () => fetchGoogleNewsItems(cryptoQuery, "en", 8),
      () => fetchFearGreedItem(),
    ];
  }

  return [
    () => fetchGoogleNewsItems(query, "en", 8),
    () => fetchGoogleNewsItems(query, language, 4),
  ];
}

function marketTopicSourceLabel(mode: ReportType, language: AppLanguage): string {
  if (mode === "a_share") return language === "zh" ? "Google News，国内/香港媒体RSS" : "Google News, domestic/HK RSS";
  if (mode === "crypto") return language === "zh" ? "Google News，Crypto Fear & Greed" : "Google News, Crypto Fear & Greed";
  return language === "zh" ? "Google News 国际财经" : "Google News market headlines";
}

function isMarketReportMode(mode: ReportType | undefined): mode is "us_stock" | "a_share" | "crypto" {
  return mode === "us_stock" || mode === "a_share" || mode === "crypto";
}

export function buildGoogleNewsRssUrl(query: string, language: AppLanguage): string {
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", query);
  if (language === "zh") {
    url.searchParams.set("hl", "zh-CN");
    url.searchParams.set("gl", "CN");
    url.searchParams.set("ceid", "CN:zh-Hans");
  } else {
    url.searchParams.set("hl", "en-US");
    url.searchParams.set("gl", "US");
    url.searchParams.set("ceid", "US:en");
  }
  return url.toString();
}

function buildGoogleNewsTopicRssUrl(topic: "WORLD" | "NATION", language: AppLanguage): string {
  const url = new URL(`https://news.google.com/rss/headlines/section/topic/${topic}`);
  if (language === "zh") {
    url.searchParams.set("hl", "zh-CN");
    url.searchParams.set("gl", "CN");
    url.searchParams.set("ceid", "CN:zh-Hans");
  } else {
    url.searchParams.set("hl", "en-US");
    url.searchParams.set("gl", "US");
    url.searchParams.set("ceid", "US:en");
  }
  return url.toString();
}

async function fetchGoogleNewsItems(query: string, language: AppLanguage, limit = 8): Promise<TopicItem[]> {
  const sourceUrl = buildGoogleNewsRssUrl(query, language);
  const response = await fetchWithTimeout(sourceUrl, {
    headers: {
      "User-Agent": "globalpulse-worker/0.1",
      "Accept": "application/rss+xml, application/xml, text/xml",
    },
  });
  if (!response.ok) return [];
  return parseRssItems(await response.text()).map((item) => ({
    ...item,
    source: item.source ?? "Google News",
    category: classifyNewsCategory(`${item.title}\n${item.summary ?? ""}`),
    section: inferSection(item),
  })).slice(0, limit);
}

async function fetchGoogleNewsTopicItems(
  topic: "WORLD" | "NATION",
  language: AppLanguage,
  limit: number,
  section: "global" | "domestic",
): Promise<TopicItem[]> {
  const sourceUrl = buildGoogleNewsTopicRssUrl(topic, language);
  const response = await fetchWithTimeout(sourceUrl, {
    headers: {
      "User-Agent": "globalpulse-worker/0.1",
      "Accept": "application/rss+xml, application/xml, text/xml",
    },
  });
  if (!response.ok) return [];
  return parseRssItems(await response.text()).map((item) => ({
    ...item,
    source: item.source ?? `Google News ${topic}`,
    category: classifyNewsCategory(`${item.title}\n${item.summary ?? ""}`),
    section,
  })).slice(0, limit);
}

async function fetchDirectGlobalNewsItems(language: AppLanguage, limit = 12): Promise<TopicItem[]> {
  const feeds = language === "zh"
    ? [
        ["BBC World", "https://feeds.bbci.co.uk/news/world/rss.xml"],
        ["Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml"],
        ["NYTimes World", "https://rss.nytimes.com/services/xml/rss/nyt/World.xml"],
        ["France24", "https://www.france24.com/en/rss"],
      ] satisfies Array<[string, string]>
    : [
        ["BBC World", "https://feeds.bbci.co.uk/news/world/rss.xml"],
        ["Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml"],
        ["NYTimes World", "https://rss.nytimes.com/services/xml/rss/nyt/World.xml"],
        ["NPR World", "https://feeds.npr.org/1004/rss.xml"],
        ["France24", "https://www.france24.com/en/rss"],
      ] satisfies Array<[string, string]>;
  const items = await fetchDirectRssFeeds(feeds, "global", 900, Math.max(limit, 16));
  return items.filter((item) => item.section === "global").slice(0, limit);
}

async function fetchDirectDomesticNewsItems(language: AppLanguage, limit = 10): Promise<TopicItem[]> {
  const feeds = language === "zh"
    ? [
        ["香港电台本地新闻", "https://www.rthk.hk/rthk/news/rss/c_expressnews_clocal.xml"],
        ["SCMP China", "https://www.scmp.com/rss/91/feed"],
      ] satisfies Array<[string, string]>
    : [
        ["SCMP China", "https://www.scmp.com/rss/91/feed"],
      ] satisfies Array<[string, string]>;
  const items = await fetchDirectRssFeeds(feeds, "domestic", 1000, Math.max(limit, 14));
  return items.filter((item) => item.section === "domestic").slice(0, limit);
}

async function fetchDirectRssFeeds(
  feeds: Array<[string, string]>,
  preferredSection: "global" | "domestic",
  scoreBase: number,
  limit: number,
): Promise<TopicItem[]> {
  const results = await Promise.allSettled(feeds.map(async ([label, url], feedIndex) => {
    const response = await fetchWithTimeout(url, { headers: RSS_FETCH_HEADERS });
    if (!response.ok) return [];
    return parseRssItems(await response.text()).map((item, itemIndex) => {
      return {
        ...item,
        source: item.source ? `${label} / ${item.source}` : label,
        category: classifyNewsCategory(`${item.title}\n${item.summary ?? ""}`),
        section: preferredSection,
        score: scoreBase - itemIndex * feeds.length - feedIndex,
      } satisfies TopicItem;
    });
  }));
  return sortTopicItems(dedupeTopicItems(results.flatMap((result) => result.status === "fulfilled" ? result.value : []))).slice(0, limit);
}

async function fetchChineseDomesticNewsItems(language: AppLanguage, limit = 10): Promise<TopicItem[]> {
  const queries = language === "zh"
    ? [
        "中国 国内新闻 政策 民生 经济 产业 -site:cctv.com -site:xinhuanet.com -site:thepaper.cn",
        "site:rthk.hk OR site:scmp.com OR site:ifeng.com OR site:caixin.com OR site:mingpao.com OR site:hk01.com OR site:hket.com 国内 政策 经济 民生",
      ]
    : [
        "China domestic policy economy society technology industry -site:cctv.com -site:xinhuanet.com -site:thepaper.cn",
        "site:rthk.hk OR site:scmp.com OR site:ifeng.com OR site:caixin.com OR site:mingpao.com OR site:hk01.com OR site:hket.com China policy economy society",
      ];
  const results = await Promise.allSettled(queries.map((entry, index) =>
    fetchGoogleNewsItems(entry, language, Math.ceil(limit / 2)),
  ));
  const items = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  return dedupeTopicItems(items).map((item) => ({
    ...item,
    source: item.source ?? "国内新闻",
    section: "domestic" as const,
    score: (item.score ?? 0) + 1200,
  })).filter((item) => {
    const src = item.source ?? "";
    if (/cctv|xinhuanet|央视|新华社/i.test(src)) return false;
    if (/reuters|ap news|associated press|bloomberg|financial times|bbc|nytimes|al jazeera|npr|france24/i.test(src)) return false;
    const text = `${item.title}\n${item.summary ?? ""}`.toLowerCase();
    if (!/中国|中國|国内|國內|多地|民生|就业|就業|消费|消費|公共服务|公共服務|医疗|醫療|教育|资本市场|資本市場|北京|上海|深圳|广州|廣州|杭州|成都|重庆|重慶|国家|國家|国务院|國務院|央行|工信部|证监会|證監會|香港|港澳|gov\.cn/i.test(text)) return false;
    return true;
  }).slice(0, limit);
}

async function fetchPlatformHotDiscussionItems(language: AppLanguage, limit = 8): Promise<TopicItem[]> {
  const queries = language === "zh"
    ? [
        "site:weibo.com OR site:douyin.com OR site:bilibili.com OR 微博热搜 OR 抖音热点 OR 知乎热榜 OR 小红书热搜",
      ]
    : [
      "Weibo trending OR Douyin trending OR Chinese social trends",
      ];
  const results = await Promise.allSettled(queries.map((q) => fetchGoogleNewsItems(q, language, limit * 2)));
  const allItems = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  return allItems
    .filter((item) => !isBaiduPlatformItem(item))
    .filter((item) => /微博|抖音|小红书|知乎|热搜|破亿|千万|热议|热点话题|bilibili|weibo|douyin/i.test(item.title))
    .filter(isMeaningfulPlatformHotItem)
    .map((item) => ({
      ...item,
      source: item.source ?? "平台热搜",
      section: "platform" as const,
      score: (item.score ?? 0) + scorePlatformHotDiscussion(item),
      summary: item.summary || inferPlatformHotSummary(item.title),
    })).slice(0, limit);
}

async function fetchToutiaoHotItems(language: AppLanguage, limit = 10): Promise<TopicItem[]> {
  if (language !== "zh") return [];

  try {
    const response = await fetchWithTimeout("https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc", { headers: JSON_FETCH_HEADERS });
    if (!response.ok) return [];
    const payload = await response.json() as {
      data?: Array<{
        Title?: string;
        QueryWord?: string;
        Url?: string;
        HotValue?: string;
        ClusterIdStr?: string;
        Label?: string;
        ClusterType?: number;
        InterestCategory?: string[];
      }>;
    };

    return (payload.data ?? []).flatMap((entry, index): TopicItem[] => {
      const title = cleanText(entry.Title || entry.QueryWord || "");
      if (!title || isGenericPlatformIndexTitle(title)) return [];
      const url = entry.Url || (entry.ClusterIdStr
        ? `https://www.toutiao.com/trending/${entry.ClusterIdStr}/`
        : `https://www.toutiao.com/search/?keyword=${encodeURIComponent(title)}`);
      const hotScore = Number(entry.HotValue);
      const heatBoost = Number.isFinite(hotScore) ? Math.min(600, Math.log10(Math.max(10, hotScore)) * 95) : 0;
      const item: TopicItem = {
        title: `头条热榜：${title}`,
        url,
        source: "今日头条热榜",
        category: "platform-hot",
        section: "platform",
        score: 1500 + heatBoost - index * 12,
      };
      const label = entry.Label ? cleanText(entry.Label) : "";
      const summary = label ? `今日头条热榜话题，标签：${label}。` : inferPlatformHotSummary(title);
      if (summary) item.summary = summary;
      return [item];
    }).slice(0, limit);
  } catch {
    return [];
  }
}

async function fetchTencentHotRankingItems(language: AppLanguage, limit = 10): Promise<TopicItem[]> {
  if (language !== "zh") return [];

  try {
    const response = await fetchWithTimeout("https://r.inews.qq.com/gw/event/hot_ranking_list?page_size=20", { headers: JSON_FETCH_HEADERS });
    if (!response.ok) return [];
    const payload = await response.json() as {
      idlist?: Array<{
        newslist?: Array<{
          title?: string;
          longtitle?: string;
          url?: string;
          surl?: string;
          shareUrl?: string;
          source?: string;
          chlname?: string;
          abstract?: string;
          nlpAbstract?: string;
          timestamp?: number;
          hotEvent?: { title?: string; hotScore?: number; ranking?: number };
        }>;
      }>;
    };
    const entries = (payload.idlist ?? []).flatMap((group) => Array.isArray(group.newslist) ? group.newslist : []);

    return entries.flatMap((entry, index): TopicItem[] => {
      const title = cleanText(entry.hotEvent?.title || entry.longtitle || entry.title || "");
      const url = entry.url || entry.surl || entry.shareUrl;
      if (!title || !url || isGenericPlatformIndexTitle(title) || title.includes("每10分钟更新一次")) return [];
      const hotScore = Number(entry.hotEvent?.hotScore);
      const ranking = typeof entry.hotEvent?.ranking === "number" ? entry.hotEvent.ranking : index + 1;
      const heatBoost = Number.isFinite(hotScore) ? Math.min(560, Math.log10(Math.max(10, hotScore)) * 90) : 0;
      const source = cleanText(entry.source || entry.chlname || "腾讯新闻");
      const item: TopicItem = {
        title: `腾讯新闻热榜：${title}`,
        url,
        source: source ? `腾讯新闻热榜 / ${source}` : "腾讯新闻热榜",
        category: "platform-hot",
        section: "platform",
        score: 1480 + heatBoost - ranking * 12,
      };
      const summary = entry.nlpAbstract || entry.abstract;
      if (summary) item.summary = summary;
      if (entry.timestamp) item.publishedAt = new Date(entry.timestamp * 1000).toISOString();
      return [item];
    }).slice(0, limit);
  } catch {
    return [];
  }
}

async function fetchNewsApiDailyHotItems(query: string, language: AppLanguage, apiKey: string): Promise<TopicItem[]> {
  try {
    const items = await fetchNewsApiEverythingItems(query, language, apiKey);
    return dedupeTopicItems(items)
      .map((item) => ({ ...item, section: item.section ?? "global", score: (item.score ?? 0) + 1000 }))
      .slice(0, 8);
  } catch {
    return [];
  }
}

async function fetchNewsApiEverythingItems(query: string, language: AppLanguage, apiKey: string): Promise<TopicItem[]> {
  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", buildNewsApiQuery(query, language));
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", "20");
  url.searchParams.set("language", language === "zh" ? "zh" : "en");
  url.searchParams.set("apiKey", apiKey);
  return fetchNewsApiUrl(url, "NewsAPI Everything");
}

async function fetchNewsApiTopHeadlineItems(language: AppLanguage, apiKey: string): Promise<TopicItem[]> {
  const countries = language === "zh" ? ["cn", "hk", "us"] : ["us", "gb"];
  const [first, second] = await Promise.allSettled([
    fetchNewsApiUrl(new URL(`https://newsapi.org/v2/top-headlines?country=${countries[0]}&pageSize=8&apiKey=${apiKey}`), `NewsAPI Top ${countries[0]?.toUpperCase()}`),
    fetchNewsApiUrl(new URL(`https://newsapi.org/v2/top-headlines?country=${countries[1]}&pageSize=8&apiKey=${apiKey}`), `NewsAPI Top ${countries[1]?.toUpperCase()}`),
  ]);
  return dedupeTopicItems([
    ...(first.status === "fulfilled" ? first.value : []),
    ...(second.status === "fulfilled" ? second.value : []),
  ]);
}

async function fetchNewsApiUrl(url: URL, defaultSource: string): Promise<TopicItem[]> {
  const response = await fetchWithTimeout(url.toString(), {
    headers: { "User-Agent": "globalpulse-worker/0.1", "Accept": "application/json" },
  });
  if (!response.ok) return [];
  const payload = await response.json() as {
    articles?: Array<{ title?: string; description?: string | null; url?: string; publishedAt?: string; source?: { name?: string | null } }>;
  };
  return (payload.articles ?? []).flatMap((article): TopicItem[] => {
    if (!article.title || !article.url || article.title === "[Removed]") return [];
    const text = `${article.title}\n${article.description ?? ""}`;
    const item: TopicItem = {
      title: cleanText(article.title),
      url: article.url,
      source: article.source?.name ? `${defaultSource} / ${article.source.name}` : defaultSource,
      category: classifyNewsCategory(text),
      section: inferSectionFromText(text, article.source?.name ?? defaultSource),
      score: 100,
    };
    const summary = article.description ? cleanText(article.description) : undefined;
    if (summary) item.summary = summary;
    if (article.publishedAt) item.publishedAt = article.publishedAt;
    return [item];
  });
}

async function fetchGdeltDailyHotItems(scope: "global" | "china", language: AppLanguage, limit: number): Promise<TopicItem[]> {
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  const query = scope === "china"
    ? "(China OR Chinese) (policy OR economy OR society OR technology OR market OR regulation)"
    : "(geopolitics OR economy OR inflation OR election OR tariff OR conflict OR energy OR \"supply chain\" OR regulation)";
  url.searchParams.set("query", query);
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", String(Math.max(1, Math.min(limit, 20))));
  url.searchParams.set("sort", "hybridrel");

  try {
    const response = await fetchWithTimeout(url.toString(), {
      headers: { "User-Agent": "globalpulse-worker/0.1", "Accept": "application/json" },
    }, GDELT_FETCH_TIMEOUT_MS);
    if (!response.ok) return [];
    const payload = await response.json() as {
      articles?: Array<{
        title?: string;
        url?: string;
        seendate?: string;
        sourceCommonName?: string;
        domain?: string;
        language?: string;
        sourceCountry?: string;
      }>;
    };
    return (payload.articles ?? []).flatMap((article): TopicItem[] => {
      if (!article.title || !article.url) return [];
      const title = cleanText(article.title);
      const source = article.sourceCommonName || article.domain || "GDELT";
      const item: TopicItem = {
        title,
        url: article.url,
        source: `GDELT / ${source}`,
        category: classifyNewsCategory(title),
        section: scope === "china" ? "domestic" : "global",
        score: scope === "china" ? 760 : 720,
      };
      const publishedAt = normalizeGdeltDate(article.seendate);
      if (publishedAt) item.publishedAt = publishedAt;
      return [item];
    }).slice(0, limit);
  } catch {
    return [];
  }
}

function buildNewsApiQuery(query: string, language: AppLanguage): string {
  const base = query.trim();
  const defaultQuery = language === "zh"
    ? "全球 热点 国际新闻 国内新闻 地缘政治 政策 宏观 产业 趋势 国际关系 抖音 热搜"
    : "global news China domestic geopolitics policy macro economy industry trends international relations";
  return (base || defaultQuery).slice(0, 260);
}

function buildGlobalEnglishDailyHotQuery(query: string): string {
  const base = query.trim();
  const englishBase = base.replace(/[^\x00-\x7F]+/g, " ").replace(/\s+/g, " ").trim();
  const englishFocus = "global breaking news geopolitics international economy public event technology finance Reuters AP BBC Bloomberg";
  return `${englishBase ? `${englishBase} ` : ""}${englishFocus}`.slice(0, 280);
}

function markGlobalDailyHotItems(items: TopicItem[], scoreBoost = 700): TopicItem[] {
  return items.map((item) => ({
    ...item,
    section: item.section ?? "global",
    score: (item.score ?? 0) + scoreBoost,
  }));
}

function markDomesticDailyHotItems(items: TopicItem[], scoreBoost = 700): TopicItem[] {
  return items.map((item) => ({
    ...item,
    section: "domestic" as const,
    score: (item.score ?? 0) + scoreBoost,
  }));
}

function classifyNewsCategory(text: string): string {
  const lower = text.toLowerCase();
  if (/抖音|微博|百度热搜|热搜|爆火|走红|douyin|weibo|trending/.test(lower)) return "platform-hot";
  if (/earthquake|flood|wildfire|disaster|public health|outbreak|disease|quake|地震|洪水|山火|灾害|公共卫生|疫情|传染病/.test(lower)) return "risk-event";
  if (/war|military|nato|russia|ukraine|israel|gaza|geopolitic|国防|军事|战争|俄乌|中东|地缘/.test(lower)) return "geopolitics";
  if (/policy|government|regulation|tariff|election|央行|政策|监管|关税|选举|财政/.test(lower)) return "policy";
  if (/inflation|rate|fed|central bank|cpi|gdp|通胀|利率|美联储|宏观|经济/.test(lower)) return "macro";
  if (/industry|supply chain|ai|energy|chip|产业|供应链|能源|芯片|科技/.test(lower)) return "industry";
  if (/中国|国内|北京|上海|深圳|广州|杭州|成都|重庆|国家|部委|国务院|央行|工信部|证监会/.test(text)) return "domestic-news";
  return "global-news";
}

function inferSection(item: TopicItem): "domestic" | "platform" | "global" {
  return inferSectionFromText(`${item.title}\n${item.summary ?? ""}`, item.source);
}

function inferSectionFromText(text: string, source?: string | null): "domestic" | "platform" | "global" {
  const merged = `${text}\n${source ?? ""}`.toLowerCase();
  if (/抖音|微博|小红书|知乎|百度|热搜|hot search|douyin|weibo|xhs/.test(merged)) return "platform";
  if (/rthk|scmp|caixin|ifeng|mingpao|hk01|hket|财新|財新|明报|明報|香港电台|香港電台|凤凰|鳳凰|搜狐|新浪|中国经济网|中國經濟網/.test(merged)) return "domestic";
  if (/中国|中國|国内|國內|北京|上海|深圳|广州|廣州|杭州|成都|重庆|重慶|国务院|國務院|人民银行|人民銀行|工信部|证监会|證監會|新华社|新華社|央视|央視|人民日报|人民日報|台湾|台灣|台海|香港|港澳|澳门|澳門|对华|對華|涉华|涉華|中朝|cctv|xinhuanet|people.cn|gov.cn|\bchina\b|\bchinese\b|\bbeijing\b|\bshanghai\b|\bshenzhen\b|\bguangzhou\b|\bhangzhou\b|\bchengdu\b|\bchongqing\b|\btaiwan\b|\bhong kong\b|\bmacau\b|\bmacao\b|\bpboc\b|\bcsrc\b|\ba-shares?\b|\byuan\b|\brenminbi\b|south china sea/.test(merged)) return "domestic";
  return "global";
}

function scorePlatformHotDiscussion(item: TopicItem): number {
  const text = `${item.title}\n${item.summary ?? ""}`;
  let score = 1350;
  if (/抖音/.test(text)) score += 180;
  if (/阅读破亿|热度破亿|破亿/.test(text)) score += 300;
  if (/热度千万|超千万|千万/.test(text)) score += 180;
  if (/过去24小时|24小时|今日|最新|刚刚/.test(text)) score += 120;
  return score;
}

function inferPlatformHotSummary(title: string): string {
  if (/破亿/.test(title)) return "平台高热话题，出现破亿级讨论信号，适合观察当天大众情绪与社会关注点。";
  if (/千万/.test(title)) return "平台高热话题，出现千万级热度信号，适合作为当天舆论风向参考。";
  return "平台热搜相关话题，适合快速了解过去数小时到24小时内大众关注点。";
}

function isMeaningfulPlatformHotItem(item: TopicItem): boolean {
  const title = item.title.replace(/\s+-\s+微博\s*$/i, "").trim();
  const text = `${title}\n${item.summary ?? ""}`;
  if (isBaiduPlatformItem(item)) return false;
  if (isGenericPlatformIndexTitle(item.title)) return false;
  if (isLowInformationPlatformTopic(item.title, item.summary)) return false;
  if (/^(微博正文|微博|抖音|小红书|知乎|百度|登录|首页)$/i.test(title)) return false;
  if (/微博正文|登录后可见|请先登录|客户端下载|无障碍|首页导航|广告|推广/i.test(text) && text.length < 80) return false;
  if (/年度回忆|热点记忆|抖音热点记忆|年度盘点|年终盘点|往年回顾|历史回顾|合集/i.test(text)) return false;
  return /热搜|热榜|热议|热点|破亿|千万|爆|关注|讨论|回应|发布|宣布|政策|事件|事故|天气|地震|赛事|电影|消费|民生|医疗|教育|weibo|douyin|trending/i.test(text);
}

function isBaiduPlatformItem(item: TopicItem): boolean {
  return /百度|baidu/i.test(`${item.title}\n${item.summary ?? ""}\n${item.source ?? ""}\n${item.url}`);
}

function isLowInformationPlatformTopic(title: string, summary?: string): boolean {
  const normalized = normalizePlatformSignalText(`${title}\n${summary ?? ""}`);
  if (hasSubstantivePlatformSignal(normalized)) return false;
  if (normalized.length < 12) return true;
  return /笑死|哈哈|好笑|搞笑|泪目|破防|谁懂|离谱|上头|绝了|太真实|火了?|爆火|出圈|名场面|名梗|段子|挑战|热门视频/i.test(normalized);
}

function normalizePlatformSignalText(value: string): string {
  return value
    .replace(/\s*[-—–·|｜]\s*(微博|新浪微博|抖音|百度|知乎|小红书|bilibili|哔哩哔哩)\s*$/gim, " ")
    .replace(/[@＠]\s*(微博热搜|微博热点|抖音热点|抖音热榜|百度热搜|知乎热榜|小红书热搜)\b/gi, " ")
    .replace(/#[^#\s]{1,30}#/g, " ")
    .replace(/\b(?:weibo|douyin|trending|hot\s*search)\b/gi, " ")
    .replace(/微博|抖音|百度|知乎|小红书|热搜|热榜|热点/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasSubstantivePlatformSignal(value: string): boolean {
  return /政策|监管|通报|调查|回应|发布|宣布|官宣|调整|改革|补贴|降价|涨价|召回|处罚|立案|判决|起诉|逮捕|救援|失联|伤亡|死亡|事故|事件|地震|暴雨|洪水|台风|山火|火灾|公共安全|公共卫生|疫情|医疗|医保|医院|教育|高考|中考|就业|住房|房贷|消费|金融|股市|A股|人民币|央行|利率|通胀|芯片|半导体|人工智能|科技|创新|新能源|汽车|能源|航运|供应链|赛事|票房|获奖|停运|恢复|破亿|千万|讨论|关注/i.test(value);
}

function isGenericPlatformIndexTitle(value: string): boolean {
  const normalized = value
    .replace(/\s*[-—–·|｜]\s*(微博|新浪微博|抖音|百度|知乎|小红书|bilibili|哔哩哔哩)\s*$/i, "")
    .replace(/\s+/g, "")
    .trim();
  return /^(微博实时热点|微博热点|微博热搜|微博热搜榜|微博榜单|微博发现|抖音热点|抖音热点榜|抖音热榜|百度热搜|百度热搜榜|知乎热榜|小红书热搜|bilibili热门|哔哩哔哩热门)$/i.test(normalized);
}

async function filterReachableTopicItems(items: TopicItem[], maxChecks = 36): Promise<TopicItem[]> {
  const sorted = sortTopicItems(items);
  const checkedItems = sorted.slice(0, Math.max(0, maxChecks));
  const checked = await Promise.all(checkedItems.map(async (item) => await isReachableTopicUrl(item.url) ? item : undefined));
  const reachable = checked.filter((item): item is TopicItem => Boolean(item));
  const unchecked = sorted.slice(checkedItems.length);
  const validUnchecked = unchecked.filter((item) => isValidTopicUrl(item.url));
  const result = [...reachable, ...validUnchecked];
  return result.length > 0 ? result : sorted.filter((item) => isValidTopicUrl(item.url));
}

async function isReachableTopicUrl(value: string): Promise<boolean> {
  const url = normalizeHttpUrl(value);
  if (!url || isKnownPlaceholderUrl(url)) return false;
  const headers = {
    "User-Agent": "Mozilla/5.0 (compatible; GlobalPulse/0.1)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };

  try {
    const head = await fetch(url, { method: "HEAD", headers, redirect: "follow" });
    if (head.ok) return true;
    if (![403, 405, 429].includes(head.status)) return false;
  } catch {
    // Some publishers block HEAD but still serve regular browser requests.
  }

  try {
    const get = await fetch(url, { method: "GET", headers: { ...headers, "Range": "bytes=0-2048" }, redirect: "follow" });
    return get.ok || get.status === 206;
  } catch {
    return false;
  }
}

async function fetchWithTimeout(input: Parameters<typeof fetch>[0], init: RequestInit = {}, timeoutMs = SOURCE_FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: init.signal ?? controller.signal });
  } finally {
    clearTimeout(timer);
  }
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

function isKnownPlaceholderUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.replace(/^www\./, "").toLowerCase();
    return hostname === "example.com" || hostname.endsWith(".example.com");
  } catch {
    return true;
  }
}

function isValidTopicUrl(value: string): boolean {
  const url = normalizeHttpUrl(value);
  return Boolean(url && !isKnownPlaceholderUrl(url));
}

async function fetchSinaFinanceItems(): Promise<TopicItem[]> {
  const response = await fetchWithTimeout("https://feed.mix.sina.com.cn/api/roll/get?pageid=153&lid=2516&num=10&page=1", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GlobalPulse/0.1)", "Referer": "https://finance.sina.com.cn", "Accept": "application/json" },
  });
  if (!response.ok) return [];
  const payload = await response.json() as { result?: { data?: Array<{ title?: string; intro?: string; url?: string; ctime?: string | number }> } };
  return (payload.result?.data ?? []).flatMap((item) => {
    if (!item.title) return [];
    const topic: TopicItem = { title: cleanText(item.title), url: item.url || "https://finance.sina.com.cn", source: "Sina Finance", category: "finance", section: "domestic" };
    const summary = item.intro ? cleanText(item.intro).slice(0, 120) : undefined;
    const publishedAt = item.ctime ? normalizeUnixTime(item.ctime) : undefined;
    if (summary) topic.summary = summary;
    if (publishedAt) topic.publishedAt = publishedAt;
    return [topic];
  }).slice(0, 6);
}

async function fetchHackerNewsItems(): Promise<TopicItem[]> {
  const idsResponse = await fetchWithTimeout("https://hacker-news.firebaseio.com/v0/topstories.json", { headers: { "User-Agent": "globalpulse-worker/0.1", "Accept": "application/json" } });
  if (!idsResponse.ok) return [];
  const ids = await idsResponse.json() as number[];
  const storyResponses = await Promise.allSettled(ids.slice(0, 8).map(async (id) => {
    const response = await fetchWithTimeout(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { headers: { "User-Agent": "globalpulse-worker/0.1", "Accept": "application/json" } });
    if (!response.ok) return undefined;
    return response.json() as Promise<{ id: number; title?: string; url?: string; score?: number; time?: number }>;
  }));
  return storyResponses.flatMap((entry) => {
    if (entry.status !== "fulfilled" || !entry.value?.title) return [];
    const item = entry.value;
    const topic: TopicItem = { title: cleanText(item.title!), url: item.url || `https://news.ycombinator.com/item?id=${item.id}`, source: "Hacker News", category: "international-tech", section: "global" as const };
    if (typeof item.score === "number") topic.score = item.score;
    if (typeof item.time === "number") topic.publishedAt = new Date(item.time * 1000).toISOString();
    return [topic];
  }).slice(0, 5);
}

async function fetchGithubTrendingItems(): Promise<TopicItem[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", `created:>${since}`);
  url.searchParams.set("sort", "stars");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", "5");
  const response = await fetchWithTimeout(url.toString(), { headers: { "User-Agent": "globalpulse-worker/0.1", "Accept": "application/vnd.github.v3+json" } });
  if (!response.ok) return [];
  const payload = await response.json() as { items?: Array<{ full_name?: string; html_url?: string; description?: string; language?: string; stargazers_count?: number }> };
  return (payload.items ?? []).flatMap((item) => {
    if (!item.full_name || !item.html_url) return [];
    const topic: TopicItem = { title: item.language ? `${item.full_name} (${item.language})` : item.full_name, url: item.html_url, source: "GitHub Trending", category: "developer-trend", section: "global" };
    if (item.description) topic.summary = cleanText(item.description).slice(0, 160);
    if (typeof item.stargazers_count === "number") topic.score = item.stargazers_count;
    return [topic];
  });
}

async function fetchFearGreedItem(): Promise<TopicItem[]> {
  const response = await fetchWithTimeout("https://api.alternative.me/fng/", { headers: { "User-Agent": "globalpulse-worker/0.1", "Accept": "application/json" } });
  if (!response.ok) return [];
  const payload = await response.json() as { data?: Array<{ value?: string; value_classification?: string; timestamp?: string }> };
  const item = payload.data?.[0];
  if (!item?.value) return [];
  const topic: TopicItem = { title: `Crypto Fear & Greed Index: ${item.value} (${item.value_classification ?? "Unknown"})`, url: "https://alternative.me/crypto/fear-and-greed-index/", source: "alternative.me", category: "crypto-sentiment", section: "global", score: Number(item.value) };
  const publishedAt = item.timestamp ? normalizeUnixTime(item.timestamp) : undefined;
  if (publishedAt) topic.publishedAt = publishedAt;
  return [topic];
}

function dedupeTopicItems(items: TopicItem[]): TopicItem[] {
  const seen = new Set<string>();
  const output: TopicItem[] = [];
  for (const item of items) {
    const key = normalizeTopicKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function normalizeTopicKey(item: TopicItem): string {
  try {
    const url = new URL(item.url);
    const hostname = url.hostname.replace(/^www\./, "");
    const pathname = url.pathname.replace(/\/$/, "");
    const search = shouldKeepTopicSearchParams(hostname, pathname) ? url.search : "";
    return hostname + pathname + search;
  } catch {
    return item.title.toLowerCase().replace(/\s+/g, " ").trim();
  }
}

function shouldKeepTopicSearchParams(hostname: string, pathname: string): boolean {
  return (hostname === "google.com" && pathname === "/search")
    || hostname === "news.google.com";
}

function sortTopicItems(items: TopicItem[]): TopicItem[] {
  return items.slice().sort((a, b) => {
    const aScore = a.score ?? 0;
    const bScore = b.score ?? 0;
    if (bScore !== aScore) return bScore - aScore;
    const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return bTime - aTime;
  });
}

function parseRssItems(xml: string): TopicItem[] {
  const itemMatches = xml.matchAll(/<item\b[\s\S]*?<\/item>/gi);
  const items: TopicItem[] = [];
  for (const match of itemMatches) {
    const itemXml = match[0];
    const title = readTag(itemXml, "title");
    const link = readTag(itemXml, "link");
    if (!title || !link) continue;
    const item: TopicItem = { title: cleanText(decodeXml(title)), url: decodeXml(link) };
    const source = readTag(itemXml, "source");
    const publishedAt = readTag(itemXml, "pubDate");
    const description = readTag(itemXml, "description");
    if (source) item.source = normalizeDisplaySource(cleanText(decodeXml(source)));
    if (publishedAt) item.publishedAt = decodeXml(publishedAt);
    if (description) {
      const summary = cleanText(decodeXml(description)).replace(/\s+/g, " ").trim().slice(0, 240);
      if (summary && summary !== item.title) item.summary = summary;
    }
    items.push(item);
  }
  return items;
}

function readTag(xml: string, tagName: string): string | undefined {
  const match = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i").exec(xml);
  return match?.[1]?.trim();
}

function decodeXml(value: string): string {
  let result = "";
  let i = 0;
  while (i < value.length) {
    if (value[i] !== "&") { result += value[i]; i++; continue; }
    const semi = value.indexOf(";", i);
    if (semi === -1) { result += value[i]; i++; continue; }
    const name = value.slice(i + 1, semi);
    if (name === "amp")  { result += "&";  i = semi + 1; continue; }
    if (name === "lt")   { result += "<";  i = semi + 1; continue; }
    if (name === "gt")   { result += ">";  i = semi + 1; continue; }
    if (name === "quot") { result += '"';  i = semi + 1; continue; }
    if (name === "apos") { result += "'";  i = semi + 1; continue; }
    if (/^#[0-9]+$/.test(name)) { result += String.fromCharCode(parseInt(name.slice(1), 10)); i = semi + 1; continue; }
    if (/^#[xX][0-9a-fA-F]+$/.test(name)) { result += String.fromCharCode(parseInt(name.slice(2), 16)); i = semi + 1; continue; }
    result += value[i]; i++;
  }
  return result;
}

function normalizeDisplaySource(source: string): string {
  const cleaned = source.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/^h5\./, "");
  return cleaned.split("/")[0]?.split(":")[0] ?? source;
}

function cleanText(value: string): string {
  let result = "";
  let i = 0;
  while (i < value.length) {
    if (value[i] === "<" && value.slice(i, i + 4) === "<!--") {
      const end = value.indexOf("-->", i + 4);
      i = end >= 0 ? end + 3 : value.length;
      continue;
    }
    if (value[i] === "<" && value.slice(i, i + 9) === "<![CDATA[") {
      const end = value.indexOf("]]>", i + 9);
      result += value.slice(i + 9, end >= i + 9 ? end : value.length);
      i = end >= i + 9 ? end + 3 : value.length;
      continue;
    }
    if (value[i] === "<") {
      const end = value.indexOf(">", i + 1);
      i = end >= 0 ? end + 1 : value.length;
      continue;
    }
    if (value[i] === "&") {
      const semi = value.indexOf(";", i);
      if (semi !== -1) {
        const name = value.slice(i + 1, semi);
        if (name === "amp")  { result += "&";  i = semi + 1; continue; }
        if (name === "lt")   { result += "<";  i = semi + 1; continue; }
        if (name === "gt")   { result += ">";  i = semi + 1; continue; }
        if (name === "quot") { result += '"';  i = semi + 1; continue; }
        if (name === "apos") { result += "'";  i = semi + 1; continue; }
        if (/^#x[0-9a-fA-F]+$/.test(name)) { result += String.fromCharCode(parseInt(name.slice(2), 16)); i = semi + 1; continue; }
        if (/^#[0-9]+$/.test(name))        { result += String.fromCharCode(parseInt(name.slice(1), 10)); i = semi + 1; continue; }
      }
    }
    result += value[i];
    i++;
  }
  return result.replace(/\s+/g, " ").trim().slice(0, 240);
}

function normalizeUnixTime(value: string | number): string | undefined {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return undefined;
  return new Date(timestamp * 1000).toISOString();
}

function normalizeGdeltDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  const match = /^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})Z?$/i.exec(value.trim());
  if (!match) return undefined;
  const [, year, month, day, hour, minute, second] = match;
  if (!year || !month || !day || !hour || !minute || !second) return undefined;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))).toISOString();
}
