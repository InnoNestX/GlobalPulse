/**
 * Trading-session classification and change-% bookkeeping.
 *
 * Ported from tg-stock-reco `session.rs`. Session windows come from the exchange
 * wherever possible; `builtinWindows` is a weekday clock fallback (no holidays).
 * `Window.new` drops zero-width windows so markets without pre/post never match them.
 */

export type MarketId = "US" | "CN" | "HK";

export type QuoteSession = "pre" | "regular" | "post" | "closed";

export type ChangeBasis =
  | "previousClose"
  | "regularClose"
  | "providerReported"
  | "unknown";

export interface Window {
  startMs: number;
  endMs: number;
}

export interface TradingWindows {
  pre: Window | null;
  regular: Window | null;
  post: Window | null;
}

const MIN_MS = 60_000;
const DAY_MS = 86_400_000;

export function windowNew(startMs: number, endMs: number): Window | null {
  if (endMs > startMs) {
    return { startMs, endMs };
  }
  return null;
}

export function windowContains(window: Window, ms: number): boolean {
  return ms >= window.startMs && ms < window.endMs;
}

export function emptyTradingWindows(): TradingWindows {
  return { pre: null, regular: null, post: null };
}

/** Regular is tested first when windows overlap. */
export function sessionAt(windows: TradingWindows, ms: number): QuoteSession {
  if (windows.regular && windowContains(windows.regular, ms)) return "regular";
  if (windows.pre && windowContains(windows.pre, ms)) return "pre";
  if (windows.post && windowContains(windows.post, ms)) return "post";
  return "closed";
}

export function hasExtended(windows: TradingWindows): boolean {
  return windows.pre !== null || windows.post !== null;
}

export function quoteSessionLabel(session: QuoteSession): string {
  switch (session) {
    case "pre":
      return "Pre-market";
    case "regular":
      return "Regular";
    case "post":
      return "After-hours";
    case "closed":
      return "Closed";
  }
}

export function changeBasisLabel(basis: ChangeBasis): string {
  switch (basis) {
    case "previousClose":
      return "Previous close";
    case "regularClose":
      return "Regular close";
    case "providerReported":
      return "Provider reported";
    case "unknown":
      return "Basis unknown";
  }
}

export function isExtendedSession(session: QuoteSession): boolean {
  return session === "pre" || session === "post";
}

export function isLiveSession(session: QuoteSession): boolean {
  return session !== "closed";
}

export function isReportableBasis(basis: ChangeBasis): boolean {
  return basis !== "unknown";
}

function remEuclid(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function divEuclid(n: number, m: number): number {
  return Math.floor(n / m);
}

interface Civil {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function isLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2 && isLeap(year)) return 29;
  return days[month - 1] ?? 30;
}

/** Epoch millis → civil UTC fields (proleptic Gregorian). */
export function civilFromMs(ms: number): Civil {
  let days = divEuclid(ms, DAY_MS);
  let rem = remEuclid(ms, DAY_MS);
  const hour = Math.floor(rem / 3_600_000);
  rem %= 3_600_000;
  const minute = Math.floor(rem / 60_000);
  rem %= 60_000;
  const second = Math.floor(rem / 1_000);

  let year = 1970;
  for (;;) {
    const len = isLeap(year) ? 366 : 365;
    if (days >= len) {
      days -= len;
      year += 1;
    } else if (days < 0) {
      year -= 1;
      days += isLeap(year) ? 366 : 365;
    } else {
      break;
    }
  }

  let month = 1;
  while (days >= daysInMonth(year, month)) {
    days -= daysInMonth(year, month);
    month += 1;
  }

  return {
    year,
    month,
    day: days + 1,
    hour,
    minute,
    second,
  };
}

function msFromCivil(c: Civil): number {
  let days = 0;
  for (let y = 1970; y < c.year; y += 1) {
    days += isLeap(y) ? 366 : 365;
  }
  for (let m = 1; m < c.month; m += 1) {
    days += daysInMonth(c.year, m);
  }
  days += c.day - 1;
  return (
    days * DAY_MS
    + c.hour * 3_600_000
    + c.minute * 60_000
    + c.second * 1_000
  );
}

/** Day of week in UTC, 0 = Sunday (same as Date#getUTCDay). */
export function utcDayOfWeek(ms: number): number {
  return remEuclid(divEuclid(ms, DAY_MS) + 4, 7);
}

/** `n`-th `weekday` (0 = Sunday) of a month, as epoch millis at 00:00 UTC. */
function nthWeekdayUtcMs(year: number, month: number, weekday: number, n: number): number {
  const first = msFromCivil({ year, month, day: 1, hour: 0, minute: 0, second: 0 });
  const shift = remEuclid(weekday - utcDayOfWeek(first), 7);
  return first + (shift + (n - 1) * 7) * DAY_MS;
}

/**
 * US Eastern offset in minutes: −240 during EDT, −300 during EST.
 * DST: second Sunday in March 02:00 EST (07:00 UTC) → first Sunday in November 02:00 EDT (06:00 UTC).
 */
export function usEasternOffsetMinutes(ms: number): number {
  const year = civilFromMs(ms).year;
  const dstStart = nthWeekdayUtcMs(year, 3, 0, 2) + 7 * 60 * MIN_MS;
  const dstEnd = nthWeekdayUtcMs(year, 11, 0, 1) + 6 * 60 * MIN_MS;
  if (ms >= dstStart && ms < dstEnd) return -240;
  return -300;
}

/** Minutes to add to UTC to get the exchange wall clock. */
export function exchangeOffsetMinutes(market: MarketId, ms: number): number {
  switch (market) {
    case "US":
      return usEasternOffsetMinutes(ms);
    case "HK":
    case "CN":
      return 480;
  }
}

export function exchangeTzLabel(market: MarketId, ms: number): string {
  switch (market) {
    case "US":
      return usEasternOffsetMinutes(ms) === -240 ? "EDT" : "EST";
    case "HK":
      return "HKT";
    case "CN":
      return "CST";
  }
}

export function regularOpenMinutes(_market: MarketId): number {
  return 9 * 60 + 30;
}

export function regularCloseMinutes(market: MarketId): number {
  switch (market) {
    case "US":
      return 16 * 60;
    case "HK":
      return 16 * 60 + 10;
    case "CN":
      return 15 * 60;
  }
}

export function exchangeLocalDayNumber(ms: number, offsetMin: number): number {
  return divEuclid(ms + offsetMin * MIN_MS, DAY_MS);
}

export function dayNumberOfWeek(day: number): number {
  return remEuclid(day + 4, 7);
}

export function exchangeOffsetForLocalDay(market: MarketId, day: number): number {
  return exchangeOffsetMinutes(market, day * DAY_MS + 12 * 60 * MIN_MS);
}

export function instantOnLocalDay(market: MarketId, day: number, minuteOfDay: number): number {
  const offset = exchangeOffsetForLocalDay(market, day);
  return day * DAY_MS + minuteOfDay * MIN_MS - offset * MIN_MS;
}

function localMidnightUtcMs(ms: number, offsetMin: number): number {
  return exchangeLocalDayNumber(ms, offsetMin) * DAY_MS - offsetMin * MIN_MS;
}

/** Exchange-local `YYYY-MM-DD` of an instant. */
export function exchangeLocalDay(ms: number, offsetMin: number): string {
  return dayFromMs(ms + offsetMin * MIN_MS);
}

export function dayFromMs(ms: number): string {
  const c = civilFromMs(ms);
  return `${c.year.toString().padStart(4, "0")}-${c.month.toString().padStart(2, "0")}-${c.day.toString().padStart(2, "0")}`;
}

/** `MM-DD HH:MM TZ` in exchange-local time. */
export function formatExchangeLocal(ms: number, offsetMin: number, tzLabel: string): string {
  const c = civilFromMs(ms + offsetMin * MIN_MS);
  return `${pad2(c.month)}-${pad2(c.day)} ${pad2(c.hour)}:${pad2(c.minute)} ${tzLabel}`;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * Weekday session clock per market. Weekends yield no windows; holidays are not modelled.
 * CN lunch break stays inside `regular` (same as Yahoo's continuous block).
 */
export function builtinWindows(market: MarketId, nowMs: number): TradingWindows {
  const offset = exchangeOffsetMinutes(market, nowMs);
  const midnight = localMidnightUtcMs(nowMs, offset);
  const dow = utcDayOfWeek(nowMs + offset * MIN_MS);
  if (dow === 0 || dow === 6) {
    return emptyTradingWindows();
  }

  const at = (h: number, m: number) => midnight + (h * 60 + m) * MIN_MS;
  const open = midnight + regularOpenMinutes(market) * MIN_MS;
  const close = midnight + regularCloseMinutes(market) * MIN_MS;

  switch (market) {
    case "US":
      return {
        pre: windowNew(at(4, 0), open),
        regular: windowNew(open, close),
        post: windowNew(close, at(20, 0)),
      };
    case "HK":
      return {
        pre: windowNew(at(9, 0), open),
        regular: windowNew(open, close),
        post: null,
      };
    case "CN":
      return {
        pre: null,
        regular: windowNew(open, close),
        post: null,
      };
  }
}

/**
 * Pre-market / Regular / After-hours / Closed / Closed (previous session).
 * Qualifier uses exchange-local dates when the market is closed.
 */
export function sessionLabel(
  session: QuoteSession,
  quoteMs: number,
  nowMs: number,
  offsetMin: number,
): string {
  if (session !== "closed") {
    return quoteSessionLabel(session);
  }
  if (exchangeLocalDay(quoteMs, offsetMin) < exchangeLocalDay(nowMs, offsetMin)) {
    return "Closed (previous session)";
  }
  return "Closed";
}

export const STALE_LIVE_QUOTE_MIN = 15;

export function liveQuoteLagMinutes(
  session: QuoteSession,
  quoteMs: number,
  nowMs: number,
): number | null {
  if (!isLiveSession(session)) return null;
  const lag = Math.floor((nowMs - quoteMs) / MIN_MS);
  return lag >= STALE_LIVE_QUOTE_MIN ? lag : null;
}
