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

export function renderDigest(schedule: PulseSchedule, context: DigestContext): {
  title: string;
  body: string;
} {
  const displayItems = context.items.slice(0, 6);
  const title = schedule.language === "zh"
    ? `GlobalPulse：${schedule.name}`
    : `GlobalPulse: ${schedule.name}`;
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
  const body = renderByFormat(schedule.template, variables, context.format);

  return {
    title,
    body,
  };
}

function renderByFormat(template: string, variables: Record<string, string>, format: OutputFormat): string {
  if (format === "json") {
    return JSON.stringify({
      generatedAt: variables.generatedAt,
      timezone: variables.timezone,
      topicQuery: variables.topicQuery,
      sourceUrl: variables.sourceUrl,
      items: JSON.parse(variables.itemsJson ?? "[]"),
    }, null, 2);
  }

  const rendered = template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key: string) => variables[key] ?? "");

  if (format === "text") {
    return rendered
      .replace(/^#+\s*/gm, "")
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 - $2");
  }

  return rendered;
}

function renderItemsMarkdown(items: TopicItem[], schedule: PulseSchedule): string {
  const language = schedule.language;
  if (items.length === 0) {
    return language === "zh" ? "_暂无可用热点数据。_" : "_No topic items were found._";
  }

  return items.map((item, index) => {
    const source = item.source ? ` — ${item.source}` : "";
    const score = typeof item.score === "number" ? ` · score ${item.score}` : "";
    const category = item.category ? ` · ${item.category}` : "";
    const summary = item.summary ? `\n   ${item.summary}` : "";
    const impact = inferCatalystImpactLine(item, schedule);
    const impactLine = impact ? `\n   ${impact}` : "";
    const linkLabel = "🔗";
    const url = normalizeHttpUrl(item.url);
    const link = url ? `\n   [${linkLabel}](${url})` : "";

    return `${index + 1}. ${escapeMarkdown(item.title)}${source}${category}${score}${summary}${impactLine}${link}`;
  }).join("\n");
}

function renderItemsText(items: TopicItem[], schedule: PulseSchedule): string {
  const language = schedule.language;
  if (items.length === 0) {
    return language === "zh" ? "暂无可用热点数据。" : "No topic items were found.";
  }

  return items.map((item, index) => {
    const source = item.source ? ` - ${item.source}` : "";
    const score = typeof item.score === "number" ? ` - score ${item.score}` : "";
    const summary = item.summary ? ` - ${item.summary}` : "";
    const impact = inferCatalystImpactLine(item, schedule);
    const impactText = impact ? ` - ${impact}` : "";
    const linkHint = normalizeHttpUrl(item.url) ? (language === "zh" ? " - 🔗" : " - 🔗") : "";

    return `${index + 1}. ${item.title}${source}${score}${summary}${impactText}${linkHint}`;
  }).join("\n");
}

function escapeMarkdown(value: string): string {
  return value.replaceAll("[", "\\[").replaceAll("]", "\\]");
}

function normalizeHttpUrl(value: string): string | undefined {
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

function inferCatalystImpactLine(item: TopicItem, schedule: PulseSchedule): string | undefined {
  if (schedule.language !== "zh") {
    return undefined;
  }

  const text = `${item.title}\n${item.summary ?? ""}`.toUpperCase();
  const score = sentimentScore(text);
  const tone = score > 0 ? "偏利多" : score < 0 ? "偏利空" : "中性";
  const focus = schedule.focusSymbols.slice(0, 3).join("、");
  const focusSuffix = focus
    ? `；并关注 ${focus} 的联动反应`
    : "";

  if (schedule.reportType === "a_share") {
    if (score > 0) {
      return `盘面影响：${tone}，可能解释当前A股相关板块的相对抗跌或回升${focusSuffix}。`;
    }
    if (score < 0) {
      return `盘面影响：${tone}，可能解释当前A股风险偏好走弱与指数回落${focusSuffix}。`;
    }
    return `盘面影响：${tone}，短线更多体现为情绪扰动，需结合量能确认方向${focusSuffix}。`;
  }

  if (schedule.reportType === "us_stock") {
    if (score > 0) return `盘面影响：${tone}，可能支撑美股风险偏好与成长板块表现${focusSuffix}。`;
    if (score < 0) return `盘面影响：${tone}，可能压制美股风险偏好并推升防御情绪${focusSuffix}。`;
    return `盘面影响：${tone}，对指数影响有限，更多体现在结构分化${focusSuffix}。`;
  }

  if (schedule.reportType === "crypto") {
    if (score > 0) return `盘面影响：${tone}，可能推动主流币与高beta币种同步走强${focusSuffix}。`;
    if (score < 0) return `盘面影响：${tone}，可能触发主流币回撤与杠杆去化${focusSuffix}。`;
    return `盘面影响：${tone}，波动可能放大但方向仍需后续催化确认${focusSuffix}。`;
  }

  return `盘面影响：${tone}，需结合实时价格与成交量验证传导强度${focusSuffix}。`;
}

function sentimentScore(text: string): number {
  const positive = [
    "利好", "增长", "超预期", "回购", "订单", "上调", "突破", "反弹", "上涨", "降息", "宽松",
    "BEAT", "SURGE", "RALLY", "UPGRADE", "EASING"
  ];
  const negative = [
    "利空", "下滑", "下跌", "亏损", "事故", "调查", "制裁", "关税", "收紧", "通胀上行", "风险",
    "MISS", "DROP", "CRASH", "PROBE", "TARIFF", "TIGHTENING"
  ];

  const hit = (words: string[]) => words.reduce((n, word) => n + (text.includes(word.toUpperCase()) ? 1 : 0), 0);
  return hit(positive) - hit(negative);
}
