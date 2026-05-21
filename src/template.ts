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
  const renderableItems = items.filter((item) => inferDigestSection(item) !== "platform" || isConcretePlatformTopic(item));
  const domesticItems = takeUniqueByHeat(renderableItems.filter((item) => inferDigestSection(item) === "domestic"), 4);
  const globalCandidates = renderableItems.filter((item) => inferDigestSection(item) === "global" && !isChinaRelatedTopic(`${item.title}\n${item.summary ?? ""}\n${item.source ?? ""}`));
  const globalItems = takeUniqueByHeat(globalCandidates, 4);
  const platformItems = takeUniqueByHeat(renderableItems.filter((item) => inferDigestSection(item) === "platform"), 4);
  const topPlatformItem = platformItems[0] ?? null;
  const platformDisplayItems = platformItems.slice(1, 4);
  const primaryItems = [
    ...globalItems,
    ...domesticItems,
    ...platformDisplayItems,
    ...(topPlatformItem ? [topPlatformItem] : []),
  ];
  const primaryKeys = new Set(primaryItems.map((item) => getItemKey(item)));
  const supplementalItems = primaryItems.length < 10
    ? takeUniqueByHeat(renderableItems.filter((item) => !primaryKeys.has(getItemKey(item))), 10 - primaryItems.length)
    : [];

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
  appendSection(lines, zh ? "## 📌 全网热度最高话题" : "## 📌 Top Discussion", topPlatformItem ? [topPlatformItem] : [], schedule, "social");
  appendSection(lines, zh ? "## 🧩 补充要闻" : "## 🧩 Additional Headlines", supplementalItems, schedule, "global");

  const sourceSummary = formatSourceSummary(context.sourceUrl);
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
    const summaryText = cleanText(item.summary ?? "").slice(0, 150);
    const summary = summaryText ? `\n   摘要：${escapeMarkdown(summaryText)}` : "";
    const note = schedule.language === "zh" && type === "global" ? "\n   市场影响：关注全球市场、汇率、避险资产与地缘风险联动。" : "";
    const link = normalizeHttpUrl(item.url) ? `\n   [查看原文](${normalizeHttpUrl(item.url)})` : "";
    return `${index + 1}. **${escapeMarkdown(cleanText(item.title).trim())}**${heat}${summary}${note}${link}`;
  }).join("\n");
}

function cleanText(value: string): string {
  return value
    .replace(/&(?:amp;)?nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s*[（(]?\s*\b(?:[a-z0-9-]+\.)+(?:com|cn|org|net|io|gov|edu|hk|fr|uk|jp)\b\s*[）)]?\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatSourceSummary(value: string): string {
  return value.split(/[，,]/).map((part) => part.trim()).filter((part) => part && !/无结果|0条|not configured|no result/i.test(part)).join("，");
}

function inferDigestSection(item: TopicItem): "domestic" | "platform" | "global" {
  const text = `${item.title}\n${item.summary ?? ""}\n${item.source ?? ""}`;
  if (item.section === "platform" || /微博|抖音|小红书|知乎|百度|热搜|热榜|热议|douyin|weibo|trending/i.test(text)) return "platform";
  if (item.section === "domestic" || isChinaRelatedTopic(text)) return "domestic";
  return "global";
}

function isChinaRelatedTopic(text: string): boolean {
  return /中国|国内|多地|民生|就业|消费|资本市场|北京|上海|深圳|广州|杭州|成都|重庆|国务院|工信部|证监会|A股|人民币|中概股|台湾|台海|外交部|对华|涉华|南海|港澳|\bChina\b|\bChinese\b|\bBeijing\b|\bShanghai\b|\bShenzhen\b|\bGuangzhou\b|\bHangzhou\b|\bChengdu\b|\bChongqing\b|\bTaiwan\b|\bHong Kong\b|\bMacau\b|\bMacao\b|\bPBOC\b|\bCSRC\b|\bA-shares?\b|\byuan\b|\brenminbi\b|South China Sea/i.test(text);
}

function isConcretePlatformTopic(item: TopicItem): boolean {
  const title = cleanText(item.title);
  if (isGenericPlatformIndexTitle(title)) return false;
  if (isLowInformationPlatformTopic(title, item.summary)) return false;
  if (/^(微博正文|微博|weibo|抖音|douyin|小红书|知乎|百度|登录|首页|详情页)$/i.test(title)) return false;
  return true;
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

function sortByHeat(items: TopicItem[]): TopicItem[] {
  return [...items].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

function takeUniqueByHeat(items: TopicItem[], limit: number): TopicItem[] {
  const selected: TopicItem[] = [];
  for (const item of sortByHeat(items)) {
    if (!selected.some((shown) => isSameTopicItem(item, shown))) selected.push(item);
    if (selected.length >= limit) break;
  }
  return selected;
}

function getItemKey(item: TopicItem): string {
  return normalizeHttpUrl(item.url) ?? item.title.trim().toLowerCase();
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
  return items.map((item, index) => `${index + 1}. ${escapeMarkdown(cleanText(item.title))}${item.summary ? `\n   ${cleanText(item.summary)}` : ""}${normalizeHttpUrl(item.url) ? `\n   [查看原文](${normalizeHttpUrl(item.url)})` : ""}`).join("\n");
}

function renderItemsText(items: TopicItem[], schedule: PulseSchedule): string {
  if (!items.length) return schedule.language === "zh" ? "暂无可用热点数据。" : "No topic items were found.";
  return items.map((item, index) => `${index + 1}. ${cleanText(item.title)}${item.summary ? ` - ${cleanText(item.summary)}` : ""}${normalizeHttpUrl(item.url) ? " - 查看原文" : ""}`).join("\n");
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
