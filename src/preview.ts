import type { Env } from "./env";
import { getSettings, mergeProviderSettings, type PulseSchedule } from "./config";
import { mergeMarketDataProviderSettings } from "./market-data-settings";
import { type ProviderName, toPushMessage } from "./messages";
import { formatMarkdown, formatPlainText } from "./providers/format";
import { formatTelegramMessage } from "./providers/telegram";
import { buildScheduleReport } from "./report";

export interface ProviderPreview {
  target: ProviderName;
  label: string;
  format: "markdown" | "text" | "html";
  content: string;
}

export interface SchedulePreview {
  title: string;
  body: string;
  generatedAt: string;
  sourceUrl: string;
  sourceStatus: "live" | "fallback";
  sourceMessage: string;
  deliveries: ProviderPreview[];
}

const providerLabels: Record<ProviderName, string> = {
  feishu: "Feishu",
  wechat_official_account: "微信公众号",
  wechat_clawbot: "wechat clawbot",
  telegram: "Telegram",
  email: "Email",
  discord: "Discord",
  slack: "Slack",
};

export async function createSchedulePreview(env: Env, schedule: PulseSchedule, now = new Date()): Promise<SchedulePreview> {
  const settings = await getSettings(env);
  const providerEnv = mergeProviderSettings(env, settings);
  const reportEnv = await mergeMarketDataProviderSettings(providerEnv);
  const report = await buildScheduleReport(reportEnv, schedule, now);
  const message = toPushMessage({
    target: schedule.targets,
    title: report.title,
    body: report.body,
    actions: report.actions,
    level: "info",
    tags: ["globalpulse", "preview", schedule.id],
    metadata: {
      schedule_id: schedule.id,
      market_calendar: schedule.marketCalendar,
      trading_day_source: schedule.tradingDaySource,
      source_status: report.sourceStatus,
      source_message: report.sourceMessage,
    },
  });

  return {
    title: report.title,
    body: report.body,
    generatedAt: report.generatedAt,
    sourceUrl: report.sourceUrl,
    sourceStatus: report.sourceStatus,
    sourceMessage: report.sourceMessage,
    deliveries: schedule.targets.map((target) => {
      const format = getProviderFormat(target);
      const content = format === "html"
        ? formatTelegramMessage(message.title, message.body)
        : format === "markdown"
          ? formatMarkdown(message)
          : formatPlainText(message);

      return {
        target,
        label: providerLabels[target],
        format,
        content,
      };
    }),
  };
}

function getProviderFormat(target: ProviderName): "markdown" | "text" | "html" {
  if (target === "telegram") return "html";
  return target === "wechat_clawbot" || target === "discord" || target === "slack" ? "markdown" : "text";
}
