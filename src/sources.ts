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

  if (!sourceUrl) {
    return fetchCompositeTopicItems(query, language);
  }

  const response = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "globalpulse-worker/0.1",
      "Accept": "application/rss+xml, application/xml, text/xml",
    },
  });

  if (!response.ok) throw new Error(`Topic source returned ${response.status}`);
  return { sourceUrl, items: parseRssItems(await response.text()).slice(0, 12) };
}

async function fetchDailyHotTopicItems(query: string, language: AppLanguage, newsApiKey?: string): Promise<{ sourceUrl: string; items: TopicItem[] }> {
  const [newsApiResult, googleResult, domesticResult, platformResult] = await Promise.allSettled([
    newsApiKey ? fetchNewsApiDailyHotItems(query, language, newsApiKey) : Promise.resolve([]),
    fetchGoogleNewsItems(query, language, 10),
    fetchChineseDomesticNewsItems(language, 10),
    fetchPlatformHotDiscussionItems(language, 8),
  ]);
  const newsApiItems = newsApiResult.status === "fulfilled" ? newsApiResult.value : [];
  const googleItems = googleResult.status === "fulfilled" ? googleResult.value : [];
  const domesticItems = domesticResult.status === "fulfilled" ? domesticResult.value : [];
  const platformItems = platformResult.status === "fulfilled" ? platformResult.value : [];
  const items = dedupeTopicItems([...platformItems, ...domesticItems, ...newsApiItems, ...googleItems]);
  const sourceUrl = [
    newsApiKey ? (newsApiItems.length ? `NewsAPI已启用(${newsApiItems.length}条)` : "NewsAPI已配置但本次无结果") : "NewsAPI未配置",
    `国内新闻(${domesticItems.length}条)`,
    `平台热搜讨论(${platformItems.length}条)`,
    `Google News(${googleItems.length}条)`,
  ].join("，");
  return { sourceUrl, items: sortTopicItems(items).slice(0, 32) };
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

async function fetchGoogleNewsItems(query: string, language: AppLanguage, limit = 8): Promise<TopicItem[]> {
  const sourceUrl = buildGoogleNewsRssUrl(query, language);
  const response = await fetch(sourceUrl, {
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

async function fetchChineseDomesticNewsItems(language: AppLanguage, limit = 10): Promise<TopicItem[]> {
  const queries = language === "zh"
    ? [
        "中国 国内新闻 政策 民生 经济 产业 -site:cctv.com -site:xinhuanet.com -site:thepaper.cn",
        "site:rthk.hk OR site:scmp.com OR site:ifeng.com OR site:caixin.com OR site:mingpao.com OR site:Initium OR site:tvbs.com.hk 国内 政策 经济 民生",
      ]
    : [
        "China domestic policy economy society technology industry -site:cctv.com -site:xinhuanet.com -site:thepaper.cn",
        "site:rthk.hk OR site:scmp.com OR site:ifeng.com OR site:caixin.com OR site:mingpao.com OR site:Initium OR site:tvbs.com.hk China policy economy society",
      ];
  const results = await Promise.allSettled(queries.map((item) => fetchGoogleNewsItems(item, language, Math.ceil(limit / 2))));
  return dedupeTopicItems(results.flatMap((result) => result.status === "fulfilled" ? result.value : [])).map((item) => ({
    ...item,
    source: item.source ? `${item.source}` : "国内新闻",
    section: "domestic" as const,
    score: (item.score ?? 0) + 1200,
  })).filter((item) => {
    const src = item.source ?? "";
    if (/cctv|xinhuanet|央视|新华社/i.test(src)) return false;
    if (/ifeng|caixin|mingpao|initium|tvbs/i.test(src)) {
      const text = `${item.title}\n${item.summary ?? ""}`;
      if (!/中国|国内|北京|上海|深圳|广州|杭州|成都|重庆|国家|国务院|央行|工信部|证监会|gov\.cn/i.test(text)) return false;
    }
    return true;
  }).slice(0, limit);
}

async function fetchPlatformHotDiscussionItems(language: AppLanguage, limit = 8): Promise<TopicItem[]> {
  const queries = language === "zh"
    ? [
        "微博热搜 OR 抖音热点 OR 百度热搜 OR 知乎热榜 OR 小红书热搜 OR 微博 知乎 百度",
      ]
    : [
        "Weibo trending OR Douyin trending OR Baidu hot search OR Baidu hot topic",
      ];
  const results = await Promise.allSettled(queries.map((q) => fetchGoogleNewsItems(q, language, limit * 2)));
  const allItems = results.flatMap((r) => r.status === "fulfilled" ? r.value : []);
  return allItems
    .filter((item) => /微博|抖音|小红书|知乎|百度|热搜|破亿|千万|热议|热点话题/i.test(item.title))
    .map((item) => ({
      ...item,
      source: item.source ?? "平台热搜",
      section: "platform" as const,
      score: (item.score ?? 0) + scorePlatformHotDiscussion(item),
      summary: item.summary || inferPlatformHotSummary(item.title),
    })).slice(0, limit);
}

async function fetchNewsApiDailyHotItems(query: string, language: AppLanguage, apiKey: string): Promise<TopicItem[]> {
  const [everythingPrimary, topHeadlines, everythingEnglish] = await Promise.allSettled([
    fetchNewsApiEverythingItems(query, language, apiKey),
    fetchNewsApiTopHeadlineItems(language, apiKey),
    language === "zh" ? fetchNewsApiEverythingItems(query, "en", apiKey) : Promise.resolve([]),
  ]);
  return dedupeTopicItems([
    ...(everythingPrimary.status === "fulfilled" ? everythingPrimary.value : []),
    ...(topHeadlines.status === "fulfilled" ? topHeadlines.value : []),
    ...(everythingEnglish.status === "fulfilled" ? everythingEnglish.value : []),
  ]).map((item) => ({ ...item, section: item.section ?? "global", score: (item.score ?? 0) + 1000 })).slice(0, 24);
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
  const countries = language === "zh" ? ["cn", "hk", "sg", "us"] : ["us", "gb", "ca", "au"];
  const results = await Promise.allSettled(countries.map(async (country) => {
    const url = new URL("https://newsapi.org/v2/top-headlines");
    url.searchParams.set("country", country);
    url.searchParams.set("pageSize", "8");
    url.searchParams.set("apiKey", apiKey);
    return fetchNewsApiUrl(url, `NewsAPI Top ${country.toUpperCase()}`);
  }));
  return dedupeTopicItems(results.flatMap((result) => result.status === "fulfilled" ? result.value : []));
}

async function fetchNewsApiUrl(url: URL, defaultSource: string): Promise<TopicItem[]> {
  const response = await fetch(url.toString(), {
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

function buildNewsApiQuery(query: string, language: AppLanguage): string {
  const base = query.trim();
  const defaultQuery = language === "zh"
    ? "全球 热点 国际新闻 国内新闻 地缘政治 政策 宏观 产业 趋势 国际关系 抖音 热搜"
    : "global news China domestic geopolitics policy macro economy industry trends international relations";
  return (base || defaultQuery).slice(0, 260);
}

function classifyNewsCategory(text: string): string {
  const lower = text.toLowerCase();
  if (/抖音|微博|百度热搜|热搜|爆火|走红|douyin|weibo|trending/.test(lower)) return "platform-hot";
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
  if (/中国|国内|北京|上海|深圳|广州|杭州|成都|重庆|国家|国务院|央行|工信部|证监会|新华社|央视|人民日报|cctv|xinhuanet|people.cn|gov.cn/.test(merged)) return "domestic";
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

async function fetchSinaFinanceItems(): Promise<TopicItem[]> {
  const response = await fetch("https://feed.mix.sina.com.cn/api/roll/get?pageid=153&lid=2516&num=10&page=1", {
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
  const idsResponse = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", { headers: { "User-Agent": "globalpulse-worker/0.1", "Accept": "application/json" } });
  if (!idsResponse.ok) return [];
  const ids = await idsResponse.json() as number[];
  const storyResponses = await Promise.allSettled(ids.slice(0, 8).map(async (id) => {
    const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { headers: { "User-Agent": "globalpulse-worker/0.1", "Accept": "application/json" } });
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
  const response = await fetch(url.toString(), { headers: { "User-Agent": "globalpulse-worker/0.1", "Accept": "application/vnd.github.v3+json" } });
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
  const response = await fetch("https://api.alternative.me/fng/", { headers: { "User-Agent": "globalpulse-worker/0.1", "Accept": "application/json" } });
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
    return url.hostname.replace(/^www\./, "") + url.pathname.replace(/\/$/, "");
  } catch {
    return item.title.toLowerCase().replace(/\s+/g, " ").trim();
  }
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
    const item: TopicItem = { title: decodeXml(title), url: decodeXml(link) };
    const source = readTag(itemXml, "source");
    const publishedAt = readTag(itemXml, "pubDate");
    if (source) item.source = normalizeDisplaySource(decodeXml(source));
    if (publishedAt) item.publishedAt = decodeXml(publishedAt);
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
