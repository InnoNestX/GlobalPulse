import type { OutputFormat, PulseSchedule } from "./config";
import type { TopicItem } from "./sources";

export interface DigestContext {
  generatedAt: string;
  timezone: string;
  topicQuery: string;
  sourceUrl: string;
  items: TopicItem[];
  format: OutputFormat;
}

export function renderDigest(schedule: PulseSchedule, context: DigestContext): {
  title: string;
  body: string;
} {
  const title = schedule.language === "zh"
    ? `GlobalPulse：${schedule.name}`
    : `GlobalPulse: ${schedule.name}`;
  const variables: Record<string, string> = {
    generatedAt: context.generatedAt,
    timezone: context.timezone,
    topicQuery: context.topicQuery,
    sourceUrl: context.sourceUrl,
    itemsMarkdown: renderItemsMarkdown(context.items),
    itemsText: renderItemsText(context.items),
    itemsJson: JSON.stringify(context.items, null, 2),
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

function renderItemsMarkdown(items: TopicItem[]): string {
  if (items.length === 0) {
    return "_No topic items were found._";
  }

  return items.map((item, index) => {
    const source = item.source ? ` — ${item.source}` : "";
    const score = typeof item.score === "number" ? ` · score ${item.score}` : "";
    const category = item.category ? ` · ${item.category}` : "";
    const summary = item.summary ? `\n   ${item.summary}` : "";

    return `${index + 1}. [${escapeMarkdown(item.title)}](${item.url})${source}${category}${score}${summary}`;
  }).join("\n");
}

function renderItemsText(items: TopicItem[]): string {
  if (items.length === 0) {
    return "No topic items were found.";
  }

  return items.map((item, index) => {
    const source = item.source ? ` - ${item.source}` : "";
    const score = typeof item.score === "number" ? ` - score ${item.score}` : "";
    const summary = item.summary ? ` - ${item.summary}` : "";

    return `${index + 1}. ${item.title}${source}${score}${summary} - ${item.url}`;
  }).join("\n");
}

function escapeMarkdown(value: string): string {
  return value.replaceAll("[", "\\[").replaceAll("]", "\\]");
}
