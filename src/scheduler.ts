import { appendLog, getRunMarker, getSettings, setRunMarker, type PulseSchedule } from "./config";
import { sendIncomingMessage } from "./delivery";
import type { Env } from "./env";
import { matchCronExpression } from "./cron";
import { isTradingDayForSchedule } from "./market-calendar";
import { buildScheduleReport } from "./report";
import { getLocalTimeParts } from "./time";
import type { DeliverySummary } from "./delivery";

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

export async function runSchedule(env: Env, schedule: PulseSchedule, now = new Date()): Promise<DeliverySummary> {
  const local = getLocalTimeParts(now, schedule.timezone, schedule.language);
  const markerTime = schedule.triggerMode === "cron" ? local.time : schedule.time;
  await setRunMarker(env, schedule.id, local.date, markerTime, now.toISOString());

  try {
    const report = await buildScheduleReport(env, schedule, now);
    const summary = await sendIncomingMessage({
      target: schedule.targets,
      title: report.title,
      body: report.body,
      actions: report.actions,
      level: summaryLevel(report.items.length),
      tags: ["globalpulse", "scheduled", schedule.id],
      metadata: {
        schedule_id: schedule.id,
        schedule_name: schedule.name,
        report_type: schedule.reportType,
        source_status: report.sourceStatus,
        source_message: report.sourceMessage,
        market_calendar: schedule.marketCalendar,
        trading_day_source: schedule.tradingDaySource,
        timezone: schedule.timezone,
        topic_count: report.items.length,
      },
    }, env);

    await appendLog(env, {
      id: crypto.randomUUID(),
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      ok: summary.ok,
      delivered: summary.delivered,
      failed: summary.failed,
      message: summary.ok ? "Delivered" : `Delivery failed: ${summary.results.filter((result) => !result.ok).map((result) => `${result.provider}(${result.status}): ${result.message}`).join("; ")}`,
      createdAt: now.toISOString(),
    });
    return summary;
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

export async function runScheduleById(env: Env, scheduleId: string, now = new Date()): Promise<DeliverySummary> {
  const settings = await getSettings(env);
  const schedule = settings.schedules.find((entry) => entry.id === scheduleId);

  if (!schedule) {
    throw new Error(`Schedule "${scheduleId}" was not found`);
  }

  return runSchedule(env, schedule, now);
}

async function shouldRunSchedule(env: Env, schedule: PulseSchedule, now: Date): Promise<boolean> {
  const local = getLocalTimeParts(now, schedule.timezone, schedule.language);
  const markerTime = schedule.triggerMode === "cron" ? local.time : schedule.time;

  if (schedule.triggerMode === "cron") {
    if (!schedule.cronExpression || !matchCronExpression(schedule.cronExpression, now, schedule.timezone)) {
      return false;
    }
  } else {
    if (local.time !== schedule.time || !schedule.days.includes(local.weekday)) {
      return false;
    }
  }

  const shouldCheckTradingDay = schedule.triggerMode !== "cron" || schedule.skipNonTradingInCron;

  if (shouldCheckTradingDay && !await isTradingDayForSchedule(
    env,
    local.date,
    local.weekday,
    schedule.marketCalendar,
    schedule.marketHolidayDates,
    schedule.tradingDaySource,
  )) {
    return false;
  }

  const existingMarker = await getRunMarker(env, schedule.id, local.date, markerTime);

  return existingMarker === null;
}

function summaryLevel(itemCount: number) {
  return itemCount > 0 ? "info" : "warning";
}
