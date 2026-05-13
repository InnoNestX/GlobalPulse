import type { AppLanguage } from "./config";

export interface TopicItem {
  title: string;
  url: string;
  source?: string;
  publishedAt?: string;
  category?: string;
  score?: number;
  summary?: string;
}

export async function fetchTopicItems(query: string, language: AppLanguage, sourceUrl?: string): Promise<{
  sourceUrl: string;
  items: TopicItem[];
}> {
  if (!sourceUrl) {
    return fetchCompositeTopicItems(query, language);
  }

  const response = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "globalpulse-worker/0.1",
      "Accept": "application/rss+xml, application/xml, text/xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Topic source returned ${response.status}`);
  }

  const xml = await response.text();

  return {
    sourceUrl,
    items: parseRssItems(xml).slice(0, 12),
  };
}

async function fetchCompositeTopicItems(query: string, language: AppLanguage): Promise<{
  sourceUrl: string;
  items: TopicItem[];
}> {
  const sources = await Promise.allSettled([
    fetchGoogleNewsItems(query, language),
    fetchSinaFinanceItems(),
    fetchHackerNewsItems(),
    fetchGithubTrendingItems(),
    fetchFearGreedItem(),
  ]);
  const items = sources.flatMap((source) => source.status === "fulfilled" ? source.value : []);

  return {
    sourceUrl: "Google News, Sina Finance, Hacker News, GitHub Search, alternative.me",
    items: items.slice(0, 24),
  };
}

export function buildGoogleNewsRssUrl(query: string, language: AppLanguage): string {
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", query);

  if (language === "zh") {
    url.searchParams.set("hl", "zh-HK");
    url.searchParams.set("gl", "HK");
    url.searchParams.set("ceid", "HK:zh-Hant");
  } else {
    url.searchParams.set("hl", "en-US");
    url.searchParams.set("gl", "US");
    url.searchParams.set("ceid", "US:en");
  }

  return url.toString();
}

async function fetchGoogleNewsItems(query: string, language: AppLanguage): Promise<TopicItem[]> {
  const sourceUrl = buildGoogleNewsRssUrl(query, language);
  const response = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "globalpulse-worker/0.1",
      "Accept": "application/rss+xml, application/xml, text/xml",
    },
  });

  if (!response.ok) {
    return [];
  }

  return parseRssItems(await response.text()).map((item) => ({
    ...item,
    source: item.source ?? "Google News",
    category: "news",
  })).slice(0, 8);
}

async function fetchSinaFinanceItems(): Promise<TopicItem[]> {
  const response = await fetch("https://feed.mix.sina.com.cn/api/roll/get?pageid=153&lid=2516&num=10&page=1", {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; GlobalPulse/0.1)",
      "Referer": "https://finance.sina.com.cn",
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    return [];
  }

  const payload = await response.json() as {
    result?: {
      data?: Array<{
        title?: string;
        intro?: string;
        url?: string;
        ctime?: string | number;
      }>;
    };
  };

  return (payload.result?.data ?? []).flatMap((item) => {
    if (!item.title) {
      return [];
    }

    const topic: TopicItem = {
      title: cleanText(item.title),
      url: item.url || "https://finance.sina.com.cn",
      source: "Sina Finance",
      category: "finance",
    };
    const summary = item.intro ? cleanText(item.intro).slice(0, 120) : undefined;
    const publishedAt = item.ctime ? normalizeUnixTime(item.ctime) : undefined;

    if (summary) {
      topic.summary = summary;
    }

    if (publishedAt) {
      topic.publishedAt = publishedAt;
    }

    return [topic];
  }).slice(0, 6);
}

async function fetchHackerNewsItems(): Promise<TopicItem[]> {
  const idsResponse = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", {
    headers: {
      "User-Agent": "globalpulse-worker/0.1",
      "Accept": "application/json",
    },
  });

  if (!idsResponse.ok) {
    return [];
  }

  const ids = await idsResponse.json() as number[];
  const storyResponses = await Promise.allSettled(ids.slice(0, 8).map(async (id) => {
    const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
      headers: {
        "User-Agent": "globalpulse-worker/0.1",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return undefined;
    }

    return response.json() as Promise<{
      id: number;
      title?: string;
      url?: string;
      score?: number;
      time?: number;
    }>;
  }));

  return storyResponses.flatMap((entry) => {
    if (entry.status !== "fulfilled" || !entry.value?.title) {
      return [];
    }

    const item = entry.value;
    const title = item.title;

    if (!title) {
      return [];
    }

    const topic: TopicItem = {
      title: cleanText(title),
      url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
      source: "Hacker News",
      category: "international-tech",
    };

    if (typeof item.score === "number") {
      topic.score = item.score;
    }

    if (typeof item.time === "number") {
      topic.publishedAt = new Date(item.time * 1000).toISOString();
    }

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
  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "globalpulse-worker/0.1",
      "Accept": "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    return [];
  }

  const payload = await response.json() as {
    items?: Array<{
      full_name?: string;
      html_url?: string;
      description?: string;
      language?: string;
      stargazers_count?: number;
    }>;
  };

  return (payload.items ?? []).flatMap((item) => {
    if (!item.full_name || !item.html_url) {
      return [];
    }

    const topic: TopicItem = {
      title: item.language ? `${item.full_name} (${item.language})` : item.full_name,
      url: item.html_url,
      source: "GitHub Trending",
      category: "developer-trend",
    };

    if (item.description) {
      topic.summary = cleanText(item.description).slice(0, 160);
    }

    if (typeof item.stargazers_count === "number") {
      topic.score = item.stargazers_count;
    }

    return [topic];
  });
}

async function fetchFearGreedItem(): Promise<TopicItem[]> {
  const response = await fetch("https://api.alternative.me/fng/", {
    headers: {
      "User-Agent": "globalpulse-worker/0.1",
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    return [];
  }

  const payload = await response.json() as {
    data?: Array<{
      value?: string;
      value_classification?: string;
      timestamp?: string;
    }>;
  };
  const item = payload.data?.[0];

  if (!item?.value) {
    return [];
  }

  const topic: TopicItem = {
    title: `Crypto Fear & Greed Index: ${item.value} (${item.value_classification ?? "Unknown"})`,
    url: "https://alternative.me/crypto/fear-and-greed-index/",
    source: "alternative.me",
    category: "crypto-sentiment",
    score: Number(item.value),
  };
  const publishedAt = item.timestamp ? normalizeUnixTime(item.timestamp) : undefined;

  if (publishedAt) {
    topic.publishedAt = publishedAt;
  }

  return [topic];
}

function parseRssItems(xml: string): TopicItem[] {
  const itemMatches = xml.matchAll(/<item\b[\s\S]*?<\/item>/gi);
  const items: TopicItem[] = [];

  for (const match of itemMatches) {
    const itemXml = match[0];
    const title = readTag(itemXml, "title");
    const link = readTag(itemXml, "link");

    if (!title || !link) {
      continue;
    }

    const item: TopicItem = {
      title: decodeXml(title),
      url: decodeXml(link),
    };
    const source = readTag(itemXml, "source");
    const publishedAt = readTag(itemXml, "pubDate");

    if (source) {
      item.source = decodeXml(source);
    }

    if (publishedAt) {
      item.publishedAt = decodeXml(publishedAt);
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
  return value
    .replace(/<!\[CDATA\[/gi, "")
    .replace(/\]\]>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function cleanText(value: string): string {
  // First decode entities so encoded HTML (e.g. &lt;script&gt;) is visible as tags,
  // then strip all HTML tags/comments in a single pass to avoid double-processing
  const decoded = decodeXml(value);
  return decoded
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

function normalizeUnixTime(value: string | number): string | undefined {
  const timestamp = Number(value);

  if (!Number.isFinite(timestamp)) {
    return undefined;
  }

  return new Date(timestamp * 1000).toISOString();
}
