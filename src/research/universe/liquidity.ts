/**
 * Pure liquidity hard filters and stage-1 percentile scoring.
 * Ported from tg-stock-reco `scan.rs` (no Eastmoney fetch).
 */

export type MarketId = "US" | "CN" | "HK";

/** Minimum daily turnover in listing currency. */
export function minTurnover(market: MarketId): number {
  switch (market) {
    case "US":
      return 20e6; // $20M/day
    case "CN":
      return 1e8; // ¥100M/day
    case "HK":
      return 5e7; // HK$50M/day
  }
}

function minPrice(market: MarketId): number {
  switch (market) {
    case "US":
      return 1.0;
    case "CN":
      return 2.0;
    case "HK":
      return 0.5;
  }
}

/** Trading days a listing must have before factors are meaningful. */
export const MIN_LISTED_DAYS = 120;

export type RejectReason = "shell" | "no_cap" | "thin" | "cheap" | "too_new";

export interface LiquidityRow {
  symbol: string;
  name: string;
  price: number;
  /** Market cap in listing currency (must be finite and > 0). */
  cap: number;
  /** Daily turnover in listing currency. */
  turnover: number;
  turnoverRate: number;
  /** Relative volume vs own baseline. */
  volRatio: number;
  /** 60-day change %. */
  chg60d: number;
  /** Year-to-date change %. */
  ytd: number;
  changePct: number;
  /** Trading-day count since listing (prefer {@link listedDaysFromYmd}). */
  listedDays?: number | null;
  /** Listing date as YYYYMMDD integer, if known. */
  listedOn?: number | null;
}

/**
 * Approximate trading days between listing and today (Rust scan.rs):
 * `((today - listed) * 5) / 7` on YYYYMMDD integers.
 */
export function listedDaysFromYmd(listedOn: number, todayYmd: number): number {
  if (!Number.isFinite(listedOn) || !Number.isFinite(todayYmd) || listedOn <= 0) return 0;
  const delta = todayYmd - listedOn;
  if (delta <= 0) return 0;
  return Math.floor((delta * 5) / 7);
}

/** ST / delisting / PT shells — rejected by name pattern. */
export function isShellName(name: string): boolean {
  return name.includes("ST") || name.includes("退") || name.includes("PT");
}

export function classifyHardFilter(
  row: LiquidityRow,
  market: MarketId,
  todayYmd?: number,
): RejectReason | null {
  if (isShellName(row.name)) return "shell";
  if (!Number.isFinite(row.cap) || row.cap <= 0) return "no_cap";
  if (row.turnover < minTurnover(market)) return "thin";
  if (row.price < minPrice(market)) return "cheap";
  const listedDays =
    row.listedDays ??
    (row.listedOn != null && todayYmd != null
      ? listedDaysFromYmd(row.listedOn, todayYmd)
      : null);
  if (listedDays != null && listedDays < MIN_LISTED_DAYS) return "too_new";
  return null;
}

export function passesHardFilters(row: LiquidityRow, market: MarketId): boolean {
  return classifyHardFilter(row, market) === null;
}

/** Percentile rank of each value, 0–1, ties sharing the mean rank. */
export function percentiles(values: number[]): number[] {
  const n = values.length;
  if (n <= 1) return Array.from({ length: n }, () => 0.5);
  const order = values.map((_, i) => i);
  order.sort((a, b) => {
    const av = values[a]!;
    const bv = values[b]!;
    if (av < bv) return -1;
    if (av > bv) return 1;
    return 0;
  });
  const out = new Array<number>(n).fill(0);
  let i = 0;
  while (i < n) {
    let j = i + 1;
    while (j < n && Math.abs(values[order[j]!]! - values[order[i]!]!) < Number.EPSILON) {
      j += 1;
    }
    const meanRank = (i + j - 1) / 2;
    const pct = meanRank / (n - 1);
    for (let k = i; k < j; k += 1) {
      out[order[k]!] = pct;
    }
    i = j;
  }
  return out;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Stage-1 score 0–100 from snapshot fields alone (no candles).
 * Weights: 60d mom 0.40, turnover rate 0.25, turnover 0.20, vol ratio 0.15,
 * then anti-chase penalties for extreme YTD / 60d movers.
 */
export function stage1Score(rows: LiquidityRow[]): number[] {
  const mom = percentiles(rows.map((r) => r.chg60d));
  const rate = percentiles(rows.map((r) => r.turnoverRate));
  const depth = percentiles(rows.map((r) => r.turnover));
  const vr = percentiles(rows.map((r) => r.volRatio));
  return rows.map((row, i) => {
    let s = 0.4 * mom[i]! + 0.25 * rate[i]! + 0.2 * depth[i]! + 0.15 * vr[i]!;
    if (row.ytd > 150) s -= 0.35;
    if (row.chg60d > 100) s -= 0.2;
    return round1(clamp(s, 0, 1) * 100);
  });
}
