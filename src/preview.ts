import type { PulseSchedule } from "./config";
import { type ProviderName, toPushMessage } from "./messages";
import { formatMarkdown, formatPlainText } from "./providers/format";
import type { TopicItem } from "./sources";
import { renderDigest } from "./template";
import { getLocalTimeParts } from "./time";

export interface ProviderPreview {
  target: ProviderName;
  label: string;
  format: "markdown" | "text";
  content: string;
}

export interface SchedulePreview {
  title: string;
  body: string;
  generatedAt: string;
  sourceUrl: string;
  deliveries: ProviderPreview[];
}

const providerLabels: Record<ProviderName, string> = {
  feishu: "Feishu",
  wechat_official_account: "微信公众号",
  wechat_clawbot: "wechat clawbot",
  telegram: "Telegram",
};

export function createSchedulePreview(schedule: PulseSchedule, now = new Date()): SchedulePreview {
  const local = getLocalTimeParts(now, schedule.timezone, schedule.language);
  const sourceUrl = schedule.sourceUrl || "Google News, Sina Finance, Hacker News, GitHub Search, alternative.me";
  const rendered = renderDigest(schedule, {
    generatedAt: local.label,
    timezone: schedule.timezone,
    topicQuery: schedule.topicQuery,
    sourceUrl,
    items: getSampleItems(schedule.language),
    format: schedule.outputFormat,
  });
  const message = toPushMessage({
    target: schedule.targets,
    title: rendered.title,
    body: rendered.body,
    level: "info",
    tags: ["globalpulse", "preview", schedule.id],
    metadata: {
      schedule_id: schedule.id,
      market_calendar: schedule.marketCalendar,
      trading_day_source: schedule.tradingDaySource,
    },
  });

  return {
    title: rendered.title,
    body: rendered.body,
    generatedAt: local.label,
    sourceUrl,
    deliveries: schedule.targets.map((target) => {
      const format = getProviderFormat(target);

      return {
        target,
        label: providerLabels[target],
        format,
        content: format === "markdown" ? formatMarkdown(message) : formatPlainText(message),
      };
    }),
  };
}

function getProviderFormat(target: ProviderName): "markdown" | "text" {
  return target === "wechat_clawbot" ? "markdown" : "text";
}

function getSampleItems(language: PulseSchedule["language"]): TopicItem[] {
  if (language === "en") {
    return [
      {
        title: "Fed officials signal patience as markets price a slower easing path",
        url: "https://example.com/fed-market-preview",
        source: "Global Markets Daily",
        category: "macro",
        score: 92,
        summary: "Treasury yields and the dollar moved together as investors reassessed the next policy window.",
      },
      {
        title: "AI infrastructure demand lifts chip and cloud supply-chain names",
        url: "https://example.com/ai-infrastructure",
        source: "Tech Finance Wire",
        category: "equities",
        score: 88,
        summary: "Semiconductor, power, and data-center operators led the risk-on segment of the session.",
      },
    ];
  }

  return [
    {
      title: "美联储官员释放耐心信号，市场重新定价降息节奏",
      url: "https://example.com/fed-market-preview",
      source: "Global Markets Daily",
      category: "macro",
      score: 92,
      summary: "美债收益率与美元同步波动，投资者重新评估下一轮政策窗口。",
    },
    {
      title: "AI 基础设施需求延续，芯片与云计算供应链表现活跃",
      url: "https://example.com/ai-infrastructure",
      source: "Tech Finance Wire",
      category: "equities",
      score: 88,
      summary: "半导体、电力和数据中心相关资产领涨风险偏好板块。",
    },
  ];
}
