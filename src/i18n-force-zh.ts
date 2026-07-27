import type { AppSettings, PulseSchedule } from "./config";

const ZH_TEMPLATE = [
  "# GlobalPulse 热点简报",
  "",
  "- 时间：{{generatedAt}}",
  "- 时区：{{timezone}}",
  "- 主题：{{topicQuery}}",
  "",
  "{{marketReport}}",
  "",
  "{{itemsMarkdown}}",
  "",
  "> 数据来源：{{sourceUrl}}",
].join("\n");

/** Force a schedule to emit Simplified Chinese content. */
export function forceChineseSchedule(schedule: PulseSchedule): PulseSchedule {
  const looksEnglishTemplate = /Time:|Timezone:|Focus:|Source:|Pre-Open|Post-Close|Watchlist/i.test(schedule.template || "");
  return {
    ...schedule,
    language: "zh",
    template: !schedule.template || looksEnglishTemplate ? ZH_TEMPLATE : schedule.template,
  };
}

/** Force app + all schedules to Chinese (for Telegram / user preference). */
export function forceChineseSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    language: "zh",
    template: !settings.template || /Time:|Timezone:|Focus:|Source:/i.test(settings.template)
      ? ZH_TEMPLATE
      : settings.template,
    schedules: settings.schedules.map((schedule) => forceChineseSchedule(schedule)),
  };
}

export function scheduleNeedsChinese(_schedule: PulseSchedule): boolean {
  // This deployment prefers Simplified Chinese for all scheduled briefs.
  return true;
}
