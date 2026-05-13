import type { Env } from "./env";

export const marketCalendars = ["everyday", "a_share", "us_stock", "crypto"] as const;
export const tradingDaySources = ["weekday", "external"] as const;

export type MarketCalendar = (typeof marketCalendars)[number];
export type TradingDaySource = (typeof tradingDaySources)[number];

interface CalendarCacheEntry {
  date: string;
  isTradingDay: boolean;
  checkedAt: string;
}

interface TimorHolidayResponse {
  code?: number;
  holiday?: {
    holiday?: boolean;
  };
  type?: {
    type?: number;
  };
}

interface NagerHoliday {
  date?: string;
  name?: string;
  localName?: string;
}

export function isTradingDay(date: string, weekday: number, calendar: MarketCalendar, holidayDates: string[]): boolean {
  if (calendar === "everyday" || calendar === "crypto") {
    return !holidayDates.includes(date);
  }

  if (weekday === 0 || weekday === 6) {
    return false;
  }

  return !holidayDates.includes(date);
}

export async function isTradingDayForSchedule(
  env: Env,
  date: string,
  weekday: number,
  calendar: MarketCalendar,
  holidayDates: string[],
  source: TradingDaySource,
): Promise<boolean> {
  if (!isTradingDay(date, weekday, calendar, holidayDates)) {
    return false;
  }

  if (source !== "external" || calendar === "everyday" || calendar === "crypto") {
    return true;
  }

  const cachedResult = await readCachedTradingDay(env, calendar, date);

  if (cachedResult !== undefined) {
    return cachedResult;
  }

  try {
    const isOpen = calendar === "a_share"
      ? await fetchAshareTradingDay(date, weekday)
      : await fetchUsStockTradingDay(date, weekday);
    await writeCachedTradingDay(env, calendar, date, isOpen);

    return isOpen;
  } catch (error) {
    console.warn("Trading calendar fetch failed; falling back to local weekday rules", {
      calendar,
      date,
      error: error instanceof Error ? error.message : String(error),
    });

    return true;
  }
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

export function readTradingDaySource(value: unknown, fallback: TradingDaySource): TradingDaySource {
  return typeof value === "string" && tradingDaySources.includes(value as TradingDaySource) ? value as TradingDaySource : fallback;
}

async function readCachedTradingDay(env: Env, calendar: MarketCalendar, date: string): Promise<boolean | undefined> {
  const cacheEntry = await env.APP_KV?.get<CalendarCacheEntry>(getCacheKey(calendar, date), "json");

  if (!cacheEntry || cacheEntry.date !== date || typeof cacheEntry.isTradingDay !== "boolean") {
    return undefined;
  }

  return cacheEntry.isTradingDay;
}

async function writeCachedTradingDay(env: Env, calendar: MarketCalendar, date: string, isOpen: boolean): Promise<void> {
  await env.APP_KV?.put(getCacheKey(calendar, date), JSON.stringify({
    date,
    isTradingDay: isOpen,
    checkedAt: new Date().toISOString(),
  } satisfies CalendarCacheEntry), { expirationTtl: 60 * 60 * 24 * 14 });
}

function getCacheKey(calendar: MarketCalendar, date: string): string {
  return `market-calendar:v1:${calendar}:${date}`;
}

async function fetchAshareTradingDay(date: string, weekday: number): Promise<boolean> {
  if (weekday === 0 || weekday === 6) {
    return false;
  }

  const response = await fetch(`https://timor.tech/api/holiday/info/${date}`, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "globalpulse-worker/0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`A-share calendar returned ${response.status}`);
  }

  const payload = await response.json() as TimorHolidayResponse;

  if (payload.code !== 0) {
    throw new Error("A-share calendar returned an invalid payload");
  }

  if (payload.holiday?.holiday === true || payload.type?.type === 2) {
    return false;
  }

  return true;
}

async function fetchUsStockTradingDay(date: string, weekday: number): Promise<boolean> {
  if (weekday === 0 || weekday === 6) {
    return false;
  }

  const year = date.slice(0, 4);
  const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/US`, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "globalpulse-worker/0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`US holiday calendar returned ${response.status}`);
  }

  const holidays = await response.json() as NagerHoliday[];
  const isClosedHoliday = holidays.some((holiday) => (
    holiday.date === date && isUsStockClosedHoliday(`${holiday.name ?? ""} ${holiday.localName ?? ""}`)
  ));

  return !isClosedHoliday;
}

function isUsStockClosedHoliday(name: string): boolean {
  const normalizedName = name.toLowerCase();

  return normalizedName.includes("new year's")
    || normalizedName.includes("martin luther king")
    || normalizedName.includes("washington's birthday")
    || normalizedName.includes("good friday")
    || normalizedName.includes("memorial day")
    || normalizedName.includes("juneteenth")
    || normalizedName.includes("independence day")
    || normalizedName.includes("labor day")
    || normalizedName.includes("thanksgiving")
    || normalizedName.includes("christmas");
}
