import type { Env } from "./env";
import type { PulseSchedule } from "./config";
import { type ProviderName, toPushMessage } from "./messages";
import { formatMarkdown, formatPlainText } from "./providers/format";
import { buildScheduleReport } from "./report";

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
  sourceStatus: "live" | "fallback";
  sourceMessage: string;
  deliveries: ProviderPreview[];
}

const providerLabels: Record<ProviderName, string> = {
  feishu: "Feishu",
  wechat_official_account: "微信公众号",
  wechat_clawbot: "wechat clawbot",
  telegram: "Telegram",
};

export async function createSchedulePreview(env: Env, schedule: PulseSchedule, now = new Date()): Promise<SchedulePreview> {
  const report = await buildScheduleReport(env, schedule, now);
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
