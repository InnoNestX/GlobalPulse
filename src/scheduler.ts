import { appendLog, getRunMarker, getSettings, setRunMarker, type PulseSchedule } from "./config";
import { sendIncomingMessage } from "./delivery";
import type { Env } from "./env";
import { isTradingDayForSchedule } from "./market-calendar";
import { getLocalTimeParts } from "./time";
import { fetchTopicItems } from "./sources";
import { renderDigest } from "./template";

export interface SchedulerRunResult {
  checked: number;
  executed: number;
  skipped: number;
}

export async function runDueSchedules(env: Env, now = new Date()): Promise<SchedulerRunResult> {
  const settings = await getSettings(env);
  const enabledSchedules = settings.schedules.filter((schedule) => schedule.enabled);
  let executed = 0;
  let skipped = 0;

  for (const schedule of enabledSchedules) {
    if (await shouldRunSchedule(env, schedule, now)) {
      await runSchedule(env, schedule, now);
      executed += 1;
    } else {
      skipped += 1;
    }
  }

  return {
    checked: enabledSchedules.length,
    executed,
    skipped,
  };
}

export async function runSchedule(env: Env, schedule: PulseSchedule, now = new Date()): Promise<void> {
  const local = getLocalTimeParts(now, schedule.timezone, schedule.language);
  await setRunMarker(env, schedule.id, local.date, schedule.time, now.toISOString());

  try {
    const topicData = await fetchTopicItems(schedule.topicQuery, schedule.language, schedule.sourceUrl);
    const rendered = renderDigest(schedule, {
      generatedAt: local.label,
      timezone: schedule.timezone,
      topicQuery: schedule.topicQuery,
      sourceUrl: topicData.sourceUrl,
      items: topicData.items,
      format: schedule.outputFormat,
    });
    const summary = await sendIncomingMessage({
      target: schedule.targets,
      title: rendered.title,
      body: rendered.body,
      level: summaryLevel(topicData.items.length),
      tags: ["globalpulse", "scheduled", schedule.id],
      metadata: {
        schedule_id: schedule.id,
        schedule_name: schedule.name,
        market_calendar: schedule.marketCalendar,
        trading_day_source: schedule.tradingDaySource,
        timezone: schedule.timezone,
        topic_count: topicData.items.length,
      },
    }, env);

    await appendLog(env, {
      id: crypto.randomUUID(),
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      ok: summary.ok,
      delivered: summary.delivered,
      failed: summary.failed,
      message: summary.ok ? "Delivered" : "Delivery failed",
      createdAt: now.toISOString(),
    });
  } catch (error) {
    await appendLog(env, {
      id: crypto.randomUUID(),
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      ok: false,
      delivered: 0,
      failed: 1,
      message: error instanceof Error ? error.message : "Unknown scheduler error",
      createdAt: now.toISOString(),
    });

    throw error;
  }
}

export async function runScheduleById(env: Env, scheduleId: string, now = new Date()): Promise<void> {
  const settings = await getSettings(env);
  const schedule = settings.schedules.find((entry) => entry.id === scheduleId);

  if (!schedule) {
    throw new Error(`Schedule "${scheduleId}" was not found`);
  }

  await runSchedule(env, schedule, now);
}

async function shouldRunSchedule(env: Env, schedule: PulseSchedule, now: Date): Promise<boolean> {
  const local = getLocalTimeParts(now, schedule.timezone, schedule.language);

  if (local.time !== schedule.time || !schedule.days.includes(local.weekday)) {
    return false;
  }

  if (!await isTradingDayForSchedule(env, local.date, local.weekday, schedule.marketCalendar, schedule.marketHolidayDates, schedule.tradingDaySource)) {
    return false;
  }

  const existingMarker = await getRunMarker(env, schedule.id, local.date, schedule.time);

  return existingMarker === null;
}

function summaryLevel(itemCount: number) {
  return itemCount > 0 ? "info" : "warning";
}
