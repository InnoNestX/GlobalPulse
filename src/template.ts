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
  const globalItems = sortByHeat(items.filter((item) => inferDigestSection(item) === "global")).slice(0, 4);
  const domesticItems = sortByHeat(items.filter((item) => inferDigestSection(item) === "domestic")).slice(0, 4);
  const platformItems = sortByHeat(items.filter((item) => inferDigestSection(item) === "platform"));
  const topPlatformItem = platformItems[0] ?? null;
  const platformDisplayItems = platformItems.slice(1, 4);
  const used = [...globalItems, ...domesticItems, ...platformDisplayItems, ...(topPlatformItem ? [topPlatformItem] : [])];
  const watchItems = sortByHeat(items.filter((item) => !used.some((shown) => isSameTopicItem(item, shown)))).slice(0, 3);

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
    const summary = item.summary ? `\n   摘要：${escapeMarkdown(item.summary.slice(0, 150))}` : "";
    const note = schedule.language === "zh" && type === "global" ? "\n   市场影响：关注全球市场、汇率、避险资产与地缘风险联动。" : "";
    const link = normalizeHttpUrl(item.url) ? `\n   [查看原文](${normalizeHttpUrl(item.url)})` : "";
    return `${index + 1}. **${escapeMarkdown(item.title.trim())}**${heat}${summary}${note}${link}`;
  }).join("\n");
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
  return /中国|国内|多地|民生|就业|消费|资本市场|北京|上海|深圳|广州|杭州|成都|重庆|国务院|工信部|证监会|A股|人民币|中概股|台湾|台海|外交部|对华|涉华|南海|港澳/i.test(text);
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
  return items.map((item, index) => `${index + 1}. ${escapeMarkdown(item.title)}${item.summary ? `\n   ${item.summary}` : ""}${normalizeHttpUrl(item.url) ? `\n   [查看原文](${normalizeHttpUrl(item.url)})` : ""}`).join("\n");
}

function renderItemsText(items: TopicItem[], schedule: PulseSchedule): string {
  if (!items.length) return schedule.language === "zh" ? "暂无可用热点数据。" : "No topic items were found.";
  return items.map((item, index) => `${index + 1}. ${item.title}${item.summary ? ` - ${item.summary}` : ""}${normalizeHttpUrl(item.url) ? " - 查看原文" : ""}`).join("\n");
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
