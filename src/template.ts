import type { OutputFormat, PulseSchedule } from "./config";
import type { TopicItem } from "./sources";

export interface DigestContext {
  generatedAt: string;
  timezone: string;
  topicQuery: string;
  sourceUrl: string;
  items: TopicItem[];
  format: OutputFormat;
  marketReport?: string;
}

export function renderDigest(schedule: PulseSchedule, context: DigestContext): { title: string; body: string } {
  const displayItems = context.items.slice(0, schedule.reportType === "daily_hot" ? 28 : 6);
  const title = schedule.language === "zh" ? `GlobalPulse：${schedule.name}` : `GlobalPulse: ${schedule.name}`;
  if (schedule.reportType === "daily_hot") return { title, body: renderDailyHotBody(schedule, context, displayItems) };

  const variables: Record<string, string> = {
    generatedAt: context.generatedAt,
    timezone: context.timezone,
    topicQuery: context.topicQuery,
    sourceUrl: context.sourceUrl,
    itemsMarkdown: renderItemsMarkdown(displayItems, schedule),
    itemsText: renderItemsText(displayItems, schedule),
    itemsJson: JSON.stringify(displayItems, null, 2),
    marketReport: context.marketReport ?? "",
  };
  return { title, body: renderByFormat(schedule.template, variables, context.format) };
}

function renderDailyHotBody(schedule: PulseSchedule, context: DigestContext, items: TopicItem[]): string {
  if (context.format === "json") {
    return JSON.stringify({ type: "daily_hot", generatedAt: context.generatedAt, timezone: context.timezone, topicQuery: context.topicQuery, sourceUrl: context.sourceUrl, items }, null, 2);
  }

  const zh = schedule.language === "zh";
  const grouped = groupItemsBySection(items);
  const globalItems = sortByHeat(grouped.global).slice(0, 4);
  const domesticItems = sortByHeat(grouped.domestic).slice(0, 4);
  const sortedPlatformItems = sortByHeat(grouped.platform);
  const topPlatformItem = sortedPlatformItems[0] ?? null;
  const platformDisplayItems = sortedPlatformItems.slice(1, 4);
  const used = [...globalItems, ...domesticItems, ...platformDisplayItems, ...(topPlatformItem ? [topPlatformItem] : [])];
  const watchItems = sortByHeat(items.filter((item) => !used.some((shown) => isSameTopicItem(item, shown)))).slice(0, 3);
  const moreItems = sortByHeat(items.filter((item) => !used.some((shown) => isSameTopicItem(item, shown)) && !watchItems.some((shown) => isSameTopicItem(item, shown)))).slice(0, Math.max(0, 28 - used.length - watchItems.length));
  const sourceSummary = formatSourceSummary(context.sourceUrl);

  const lines = [
    zh ? "# GlobalPulse 热点简报" : "# GlobalPulse Hot Brief",
    "",
    zh ? `生成时间：${context.generatedAt}` : `Generated: ${context.generatedAt}`,
    zh ? `时区：${context.timezone}` : `Timezone: ${context.timezone}`,
    zh ? `关注方向：${context.topicQuery}` : `Focus: ${context.topicQuery}`,
    "",
  ];

  appendSection(lines, zh ? "## 🌍 国际要闻" : "## 🌍 International Headlines", globalItems, schedule, "global");
  appendSection(lines, zh ? "## 🇨🇳 国内热点" : "## 🇨🇳 Domestic Highlights", domesticItems, schedule, "domestic");
  appendSection(lines, zh ? "## 🔥 全网热搜精选" : "## 🔥 Social Trends", platformDisplayItems, schedule, "social");
  appendSection(lines, zh ? "## 📌 全网热度最高话题" : "## 📌 Top Social Topic", topPlatformItem ? [topPlatformItem] : [], schedule, "social");
  appendSection(lines, zh ? "## 🧭 后续观察方向" : "## 🧭 What to Watch", watchItems, schedule, "watch");
  appendSection(lines, zh ? "## 🗞️ 更多重点" : "## 🗞️ More Key Items", moreItems, schedule, "more");

  if (sourceSummary) lines.push("", zh ? `> 数据来源：${sourceSummary}` : `> Sources: ${sourceSummary}`);

  const markdown = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return context.format === "text" ? markdownToText(markdown) : markdown;
}

function appendSection(lines: string[], heading: string, items: TopicItem[], schedule: PulseSchedule, type: string): void {
  if (!items.length) return;
  lines.push(heading, "", renderDailyHotItems(items, schedule, type), "");
}

function renderDailyHotItems(items: TopicItem[], schedule: PulseSchedule, type: string): string {
  return items.map((item, index) => {
    const heat = typeof item.score === "number" ? ` · 热度 ${Math.round(item.score)}` : "";
    const summaryText = compactSummary(item.summary, item.title, item.category);
    const summary = summaryText ? `\n   摘要：${escapeMarkdown(summaryText)}` : "";
    const note = inferDailyHotNote(item, schedule, type);
    const noteLine = note ? `\n   ${note}` : "";
    const link = normalizeHttpUrl(item.url) ? `\n   [查看原文](${normalizeHttpUrl(item.url)})` : "";
    return `${index + 1}. **${escapeMarkdown(compactTitle(item.title))}**${heat}${summary}${noteLine}${link}`;
  }).join("\n");
}

function inferDailyHotNote(item: TopicItem, schedule: PulseSchedule, type: string): string | undefined {
  if (schedule.language !== "zh") return undefined;
  const category = item.category ?? "global-news";
  if (type === "social") return "热搜解读：关注话题是否继续发酵，以及对公众情绪、品牌或监管的影响。";
  if (type === "watch") return "后续看点：关注官方表态、事件进展和市场反应。";
  if (type === "market" || category === "macro" || category === "finance") return "可能影响：关注利率、汇率、风险偏好和权益市场联动。";
  if (type === "tech" || category === "industry") return "为什么值得关注：可能影响产业链、企业投资方向和增长预期。";
  if (type === "global" || category === "geopolitics") return "观察点：关注地缘风险、能源价格、利率预期和跨市场传导。";
  if (type === "domestic" || category === "policy") return "观察点：关注政策口径、实施节奏和相关行业影响。";
  return "观察点：关注后续是否演变成政策、市场或社会情绪变量。";
}

function compactTitle(value: string): string {
  const cleaned = stripKnownNoise(value).replace(/\s+/g, " ").trim();
  return stripTrailingSource(cleaned) || value.trim();
}

function compactSummary(summary: string | undefined, title: string, category?: string): string {
  const fallbackTitle = compactTitle(title);
  const base = stripKnownNoise(summary ?? "").trim();
  const cleaned = stripRepeatedHeadline(base, fallbackTitle) || fallbackTitle;
  if (!cleaned) return "";

  if (isNoisyAggregatedSummary(cleaned)) {
    return buildFallbackSummary(fallbackTitle, category);
  }

  const sentences = cleaned.split(/(?<=[。！？!?])\s*/).filter(Boolean);
  const first = stripTrailingSource(sentences[0] ?? cleaned);
  const readable = removeInlineSourceTokens(first).trim();
  if (!readable || isNoisyAggregatedSummary(readable)) return buildFallbackSummary(fallbackTitle, category);
  return readable.length > 150 ? `${readable.slice(0, 148)}…` : readable;
}

function buildFallbackSummary(title: string, category?: string): string {
  if (category === "geopolitics") return `围绕“${title}”的消息正在发酵，重点关注后续官方表态、地缘风险和市场避险情绪。`;
  if (category === "macro" || category === "finance") return `围绕“${title}”的市场讨论升温，重点关注利率、汇率、资金面和相关资产价格反应。`;
  if (category === "industry") return `围绕“${title}”的产业关注度上升，重点观察供应链、企业竞争格局和投资预期变化。`;
  if (category === "policy") return `围绕“${title}”的政策信号受到关注，重点观察监管口径、实施节奏和相关行业影响。`;
  return `围绕“${title}”的关注度上升，重点观察后续进展、公共讨论热度和潜在影响。`;
}

function isNoisyAggregatedSummary(value: string): boolean {
  const sourceHits = countSourceTokens(value);
  const domainHits = (value.match(/\b[a-z0-9.-]+\.(?:com|cn|org|net|io)\b/gi) ?? []).length;
  const hasManyHeadlineFragments = /新浪|腾讯|凤凰|搜狐|网易|环球网|财联社|新华社|央视|Reuters|Bloomberg|BBC|AP News|Financial Times/i.test(value) && value.length > 80;
  const noSentenceBreak = !/[。！？!?]/.test(value) && value.length > 80;
  return sourceHits >= 2 || domainHits >= 1 || hasManyHeadlineFragments || noSentenceBreak;
}

function countSourceTokens(value: string): number {
  return (value.match(/凤凰网|新浪财经|腾讯新闻|网易|搜狐|财新|财联社|央视新闻|新华社|中国新闻网|环球网|观察者网|澎湃新闻|大洋网|中国日报网|中华军事|星岛环球网|BBC|Reuters|Bloomberg|Financial Times|AP News|CNBC|RFI|thepaper\.cn|jpchinapress\.com|chinanews\.com\.cn|news\.cn/gi) ?? []).length;
}

function stripKnownNoise(value: string): string {
  return removeInlineSourceTokens(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/在Google 新闻上查看更多头条新闻和观点/g, "")
    .replace(/查看更多头条新闻和观点/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function removeInlineSourceTokens(value: string): string {
  return value
    .replace(/\s*(?:&nbsp;|\u00a0)+\s*/gi, " ")
    .replace(/\s*\(?\s*(thepaper\.cn|jpchinapress\.com|chinanews\.com\.cn|news\.cn|rfi\.fr|bbc\.com|reuters\.com|bloomberg\.com)\s*\)?\s*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function stripRepeatedHeadline(summary: string, title: string): string {
  const normalizedTitle = stripTrailingSource(title);
  let cleaned = summary;
  if (normalizedTitle && cleaned.startsWith(normalizedTitle)) cleaned = cleaned.slice(normalizedTitle.length).trim();
  cleaned = stripLeadingSourceName(cleaned);
  return stripTrailingSource(cleaned).trim();
}

function stripLeadingSourceName(value: string): string {
  return value.replace(/^(凤凰网|新浪财经|腾讯新闻|网易|搜狐|财新|财联社|央视新闻|新华社|中国新闻网|环球网|观察者网|澎湃新闻|大洋网|中国日报网|中华军事|星岛环球网|BBC|Reuters|Bloomberg|Financial Times|AP News|CNBC|RFI|thepaper\.cn|jpchinapress\.com|chinanews\.com\.cn|news\.cn)\s*/i, "").trim();
}

function stripTrailingSource(value: string): string {
  return removeInlineSourceTokens(value)
    .replace(/\s+(凤凰网|新浪财经|腾讯新闻|网易|搜狐|财新|财联社|央视新闻|新华社|中国新闻网|环球网|观察者网|澎湃新闻|大洋网|中国日报网|中华军事|星岛环球网|BBC|Reuters|Bloomberg|Financial Times|AP News|CNBC|RFI|thepaper\.cn|jpchinapress\.com|chinanews\.com\.cn|news\.cn)\s*$/i, "")
    .replace(/\s+-\s+[^\s-]+\s*$/, "")
    .trim();
}

function formatSourceSummary(value: string): string {
  return value
    .split(/[，,]/)
    .map((part) => part.trim())
    .filter((part) => part && !/无结果|0条|0\s*条|not configured|no result/i.test(part))
    .join("，");
}

function groupItemsBySection(items: TopicItem[]): { global: TopicItem[]; domestic: TopicItem[]; platform: TopicItem[] } {
  return items.reduce((acc, item) => {
    const section = inferDigestSection(item);
    if (section === "domestic") acc.domestic.push(item);
    else if (section === "platform") acc.platform.push(item);
    else acc.global.push(item);
    return acc;
  }, { global: [] as TopicItem[], domestic: [] as TopicItem[], platform: [] as TopicItem[] });
}

function inferDigestSection(item: TopicItem): "domestic" | "platform" | "global" {
  const text = `${item.title}\n${item.summary ?? ""}\n${item.source ?? ""}`;
  if (item.section === "platform" || /微博|抖音|小红书|知乎|百度|热搜|热榜|热议|douyin|weibo|trending/i.test(text)) return "platform";
  if (isInternationalTopic(text)) return "global";
  if (item.section === "domestic") return "domestic";
  if (/中国|国内|北京|上海|深圳|广州|杭州|成都|重庆|国务院|央行|工信部|证监会|A股|人民币|中概股/i.test(text)) return "domestic";
  return "global";
}

function isInternationalTopic(text: string): boolean {
  return /全球|国际|海外|欧洲|欧盟|欧元区|美国|美联储|美元|美债|英债|德债|英国|德国|法国|日本|韩国|印度|俄罗斯|乌克兰|俄乌|中东|伊朗|以色列|加沙|红海|北约|关税|贸易战|南海|菲律宾|东南亚|摩根大通|高盛|global|international|Europe|US|United States|Fed|Russia|Ukraine|Middle East|Israel|Iran|Gaza|NATO|tariff/i.test(text);
}

function sortByHeat(items: TopicItem[]): TopicItem[] {
  return [...items].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

function isSameTopicItem(a: TopicItem, b: TopicItem | null): boolean {
  if (!b) return false;
  const au = normalizeHttpUrl(a.url);
  const bu = normalizeHttpUrl(b.url);
  if (au && bu) return au === bu;
  return a.title.trim().toLowerCase() === b.title.trim().toLowerCase();
}

function renderByFormat(template: string, variables: Record<string, string>, format: OutputFormat): string {
  if (format === "json") return JSON.stringify({ generatedAt: variables.generatedAt, timezone: variables.timezone, topicQuery: variables.topicQuery, sourceUrl: variables.sourceUrl, items: JSON.parse(variables.itemsJson ?? "[]") }, null, 2);
  const rendered = template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key: string) => variables[key] ?? "");
  return format === "text" ? markdownToText(rendered) : rendered;
}

function renderItemsMarkdown(items: TopicItem[], schedule: PulseSchedule): string {
  if (!items.length) return schedule.language === "zh" ? "_暂无可用热点数据。_" : "_No topic items were found._";
  return items.map((item, index) => {
    const source = item.source ? ` — ${item.source}` : "";
    const score = typeof item.score === "number" ? ` · score ${item.score}` : "";
    const category = item.category ? ` · ${item.category}` : "";
    const summary = item.summary ? `\n   ${item.summary}` : "";
    const impact = inferCatalystImpactLine(item, schedule);
    const link = normalizeHttpUrl(item.url) ? `\n   [查看原文](${normalizeHttpUrl(item.url)})` : "";
    return `${index + 1}. ${escapeMarkdown(item.title)}${source}${category}${score}${summary}${impact ? `\n   ${impact}` : ""}${link}`;
  }).join("\n");
}

function renderItemsText(items: TopicItem[], schedule: PulseSchedule): string {
  if (!items.length) return schedule.language === "zh" ? "暂无可用热点数据。" : "No topic items were found.";
  return items.map((item, index) => {
    const source = item.source ? ` - ${item.source}` : "";
    const score = typeof item.score === "number" ? ` - score ${item.score}` : "";
    const summary = item.summary ? ` - ${item.summary}` : "";
    const impact = inferCatalystImpactLine(item, schedule);
    const linkHint = normalizeHttpUrl(item.url) ? " - 查看原文" : "";
    return `${index + 1}. ${item.title}${source}${score}${summary}${impact ? ` - ${impact}` : ""}${linkHint}`;
  }).join("\n");
}

function inferCatalystImpactLine(item: TopicItem, schedule: PulseSchedule): string | undefined {
  if (schedule.language !== "zh" || schedule.reportType === "daily_hot") return undefined;
  const text = `${item.title}\n${item.summary ?? ""}`.toUpperCase();
  const score = sentimentScore(text);
  const tone = score > 0 ? "偏利多" : score < 0 ? "偏利空" : "中性";
  const focus = schedule.focusSymbols.slice(0, 3).join("、");
  const suffix = focus ? `；并关注 ${focus} 的联动反应` : "";
  if (schedule.reportType === "a_share") return score > 0 ? `盘面影响：${tone}，可能解释当前A股相关板块的相对抗跌或回升${suffix}。` : score < 0 ? `盘面影响：${tone}，可能解释当前A股风险偏好走弱与指数回落${suffix}。` : `盘面影响：${tone}，短线更多体现为情绪扰动，需结合量能确认方向${suffix}。`;
  if (schedule.reportType === "us_stock") return score > 0 ? `盘面影响：${tone}，可能支撑美股风险偏好与成长板块表现${suffix}。` : score < 0 ? `盘面影响：${tone}，可能压制美股风险偏好并推升防御情绪${suffix}。` : `盘面影响：${tone}，对指数影响有限，更多体现在结构分化${suffix}。`;
  if (schedule.reportType === "crypto") return score > 0 ? `盘面影响：${tone}，可能推动主流币与高beta币种同步走强${suffix}。` : score < 0 ? `盘面影响：${tone}，可能触发主流币回撤与杠杆去化${suffix}。` : `盘面影响：${tone}，波动可能放大但方向仍需后续催化确认${suffix}。`;
  return undefined;
}

function sentimentScore(text: string): number {
  const positive = ["利好", "增长", "超预期", "回购", "订单", "上调", "突破", "反弹", "上涨", "降息", "宽松", "BEAT", "SURGE", "RALLY", "UPGRADE", "EASING"];
  const negative = ["利空", "下滑", "下跌", "亏损", "事故", "调查", "制裁", "关税", "收紧", "通胀上行", "风险", "MISS", "DROP", "CRASH", "PROBE", "TARIFF", "TIGHTENING"];
  const hit = (words: string[]) => words.reduce((n, word) => n + (text.includes(word.toUpperCase()) ? 1 : 0), 0);
  return hit(positive) - hit(negative);
}

function markdownToText(markdown: string): string {
  return markdown.replace(/^#+\s*/gm, "").replace(/\*\*/g, "").replace(/`/g, "").replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 - $2");
}

function escapeMarkdown(value: string): string {
  return value.replaceAll("[", "\\[").replaceAll("]", "\\]");
}

function normalizeHttpUrl(value: string): string | undefined {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}
