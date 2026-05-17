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
  const displayItems = context.items.slice(0, schedule.reportType === "daily_hot" ? 12 : 6);
  const title = schedule.language === "zh"
    ? `GlobalPulse：${schedule.name}`
    : `GlobalPulse: ${schedule.name}`;

  if (schedule.reportType === "daily_hot") {
    return {
      title,
      body: renderDailyHotBody(schedule, context, displayItems),
    };
  }

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

  return { title, body };
}

function renderDailyHotBody(schedule: PulseSchedule, context: DigestContext, items: TopicItem[]): string {
  if (context.format === "json") {
    return JSON.stringify({
      type: "daily_hot",
      generatedAt: context.generatedAt,
      timezone: context.timezone,
      topicQuery: context.topicQuery,
      sourceUrl: context.sourceUrl,
      items,
    }, null, 2);
  }

  const zh = schedule.language === "zh";
  const heading = zh ? "# GlobalPulse 每日热点简报" : "# GlobalPulse Daily Hot Brief";
  const meta = zh
    ? [
        `- 时间：${context.generatedAt}`,
        `- 时区：${context.timezone}`,
        `- 关注方向：${context.topicQuery}`,
      ]
    : [
        `- Time: ${context.generatedAt}`,
        `- Timezone: ${context.timezone}`,
        `- Focus: ${context.topicQuery}`,
      ];

  const bySection = groupItemsBySection(items);
  const internationalItems = bySection.global.slice(0, 4);
  const domesticItems = bySection.domestic.slice(0, 4);
  const platformItems = bySection.platform.slice(0, 3);
  const topPlatformItem = bySection.platform.length > 3 ? bySection.platform[3] : null;

  if (zh) {
    const sections = [
      heading,
      "",
      ...meta,
      "",
      "## 🌍 国际要闻",
      "",
      renderDailyHotSectionItems(internationalItems, schedule),
      "",
      "## 🇨🇳 国内热点",
      "",
      renderDailyHotSectionItems(domesticItems, schedule),
      "",
      "## 🔥 全网热搜精选",
      "",
      renderDailyHotSectionItems(platformItems, schedule),
      "",
    ];

    if (topPlatformItem) {
      sections.push(
        "## 📌 全网热度最高话题",
        "",
        renderDailyHotSectionItems([topPlatformItem], schedule),
        "",
      );
    }

    sections.push(
      "## 🧭 后续观察方向",
      "- **政策变化**：关注主要经济体监管、财政、货币与产业政策的边际变化。",
      "- **地缘政治**：关注冲突、制裁、联盟关系和供应链安全对全球风险偏好的影响。",
      "- **宏观经济**：关注通胀、利率、就业、汇率和能源价格对市场预期的影响。",
      "- **产业趋势**：关注 AI、能源、芯片、汽车、医药和消费等方向的结构性变化。",
      "",
      `> 数据来源：${context.sourceUrl}`,
    );

    const markdown = sections.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (context.format === "text") {
      return markdown
        .replace(/^#+\s*/gm, "")
        .replace(/\*\*/g, "")
        .replace(/`/g, "")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 - $2");
    }
    return markdown;
  }

  const enSections = [
    heading,
    "",
    ...meta,
    "",
    "## 🌍 International Headlines",
    "",
    renderDailyHotSectionItems(internationalItems, schedule),
    "",
    "## 🇨🇳 Domestic Highlights",
    "",
    renderDailyHotSectionItems(domesticItems, schedule),
    "",
    "## 🔥 Trending on Social Media",
    "",
    renderDailyHotSectionItems(platformItems, schedule),
    "",
  ];

  if (topPlatformItem) {
    enSections.push(
      "## 📌 #1 Trending Topic",
      "",
      renderDailyHotSectionItems([topPlatformItem], schedule),
      "",
    );
  }

  enSections.push(
    "## 🧭 What to Watch Next",
    "- **Policy**: regulation, fiscal policy, monetary policy, and industrial policy changes.",
    "- **Geopolitics**: conflicts, sanctions, alliances, and supply-chain security.",
    "- **Macro**: inflation, rates, labor data, FX, and energy prices.",
    "- **Industries**: AI, energy, semiconductors, autos, healthcare, and consumption trends.",
    "",
    `> Source: ${context.sourceUrl}`,
  );

  const markdown = enSections.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (context.format === "text") {
    return markdown
      .replace(/^#+\s*/gm, "")
      .replace(/\*\*/g, "")
      .replace(/`/g, "")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 - $2");
  }
  return markdown;
}

function groupItemsBySection(items: TopicItem[]): { global: TopicItem[]; domestic: TopicItem[]; platform: TopicItem[] } {
  const result: { global: TopicItem[]; domestic: TopicItem[]; platform: TopicItem[] } = { global: [], domestic: [], platform: [] };
  for (const item of items) {
    const section = item.section ?? "global";
    if (section === "domestic") result.domestic.push(item);
    else if (section === "platform") result.platform.push(item);
    else result.global.push(item);
  }
  return result;
}

function renderDailyHotSectionItems(items: TopicItem[], schedule: PulseSchedule): string {
  if (items.length === 0) {
    return schedule.language === "zh" ? "_暂无相关内容。_" : "_No items available._";
  }
  return items.map((item, index) => {
    const source = item.source ? ` — ${escapeMarkdown(item.source)}` : "";
    const url = normalizeHttpUrl(item.url);
    const link = url ? ` [🔗](${url})` : "";
    const summary = item.summary ? ` ${escapeMarkdown(item.summary)}` : "";
    const observation = inferDailyHotObservation(item, schedule);
    const observationLine = observation ? `\n   ${observation}` : "";
    return `${index + 1}. **${escapeMarkdown(item.title)}**${source}${link}${summary}${observationLine}`;
  }).join("\n");
}

function inferDailyHotObservation(item: TopicItem, schedule: PulseSchedule): string | undefined {
  if (schedule.language !== "zh") {
    return undefined;
  }
  const category = item.category ?? "global-news";
  if (category === "geopolitics") return "观察点：可能影响地区安全、能源价格、供应链稳定和国际关系走向。";
  if (category === "policy") return "观察点：可能改变监管预期、财政支出方向、产业扶持力度或跨境关系。";
  if (category === "macro") return "观察点：可能影响通胀、利率、汇率、就业和全球资产定价预期。";
  if (category === "industry") return "观察点：可能影响产业链竞争格局、企业投资方向和中长期增长预期。";
  return "观察点：属于当前公共讨论热点，后续关注是否演变成政策、市场或国际关系变量。";
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
    const url = normalizeHttpUrl(item.url);
    const link = url ? `\n   [🔗](${url})` : "";

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
    const linkHint = normalizeHttpUrl(item.url) ? " - 🔗" : "";

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
  if (schedule.language !== "zh" || schedule.reportType === "daily_hot") {
    return undefined;
  }

  const text = `${item.title}\n${item.summary ?? ""}`.toUpperCase();
  const score = sentimentScore(text);
  const tone = score > 0 ? "偏利多" : score < 0 ? "偏利空" : "中性";
  const focus = schedule.focusSymbols.slice(0, 3).join("、");
  const focusSuffix = focus ? `；并关注 ${focus} 的联动反应` : "";

  if (schedule.reportType === "a_share") {
    if (score > 0) return `盘面影响：${tone}，可能解释当前A股相关板块的相对抗跌或回升${focusSuffix}。`;
    if (score < 0) return `盘面影响：${tone}，可能解释当前A股风险偏好走弱与指数回落${focusSuffix}。`;
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

  return undefined;
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
