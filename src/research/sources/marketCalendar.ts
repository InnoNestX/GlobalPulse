import type { PulseSchedule } from "../../config";
import { isTradingDayForSchedule } from "../../market-calendar";
import type { Env } from "../../env";
import type { TradingSession } from "../types/common";

export async function resolveTradingSession(env: Env, schedule: PulseSchedule, now: Date): Promise<TradingSession> {
  if (schedule.marketCalendar === "a_share" || schedule.marketCalendar === "us_stock") {
    const localDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: schedule.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
      new Intl.DateTimeFormat("en-US", { timeZone: schedule.timezone, weekday: "short" }).format(now),
    );
    const open = await isTradingDayForSchedule(env, localDate, dayIndex < 0 ? 0 : dayIndex, schedule.marketCalendar, schedule.marketHolidayDates, schedule.tradingDaySource);
    if (!open) return "holiday";
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: schedule.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");

  if (schedule.marketSession === "pre_open") return "pre_market";
  if (schedule.marketSession === "post_close") return "after_hours";
  if (schedule.reportType === "crypto") return "regular";
  if (hour < 9) return "pre_market";
  if (hour >= 16) return "after_hours";
  return "regular";
}
