export const marketCalendars = ["everyday", "a_share", "us_stock", "crypto"] as const;

export type MarketCalendar = (typeof marketCalendars)[number];

export function isTradingDay(date: string, weekday: number, calendar: MarketCalendar, holidayDates: string[]): boolean {
  if (calendar === "everyday" || calendar === "crypto") {
    return !holidayDates.includes(date);
  }

  if (weekday === 0 || weekday === 6) {
    return false;
  }

  return !holidayDates.includes(date);
}

export function parseHolidayDates(value: unknown): string[] {
  const rawDates = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[\s,]+/) : [];
  const dates = rawDates.flatMap((entry) => {
    if (typeof entry !== "string") {
      return [];
    }

    const date = entry.trim();

    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? [date] : [];
  });

  return [...new Set(dates)].slice(0, 120);
}

export function readMarketCalendar(value: unknown, fallback: MarketCalendar): MarketCalendar {
  return typeof value === "string" && marketCalendars.includes(value as MarketCalendar) ? value as MarketCalendar : fallback;
}
