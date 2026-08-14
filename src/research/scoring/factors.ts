/**
 * Multi-factor scoring from completed daily bars + session-aware quote.
 * Ported from tg-stock-reco `factors.rs` (deterministic, no ML).
 *
 * Weights sum to 50; score = 50 + Σ(factor × weight), then volatility shrinks
 * distance from 50. English reason / stance strings only.
 */

import type { QuoteSession } from "../sources/session";

export interface DailyBar {
  /** Exchange-local YYYY-MM-DD. */
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type MarketId = "US" | "CN" | "HK";
export type Stance = "bullish" | "neutral" | "bearish";

export interface SatScales {
  ma5Pct: number;
  ma20Pct: number;
  ret5Pct: number;
  ret20Pct: number;
  rvol: number;
  extPct: number;
  dayPct: number;
  atrPct: number;
}

export const W_TREND = 18;
export const W_MOMENTUM = 12;
export const W_RANGE = 6;
export const W_VOLUME = 4;
export const W_EXTENDED = 3;
export const W_DAY = 7;
export const W_DAY_DEGRADED = 30;
export const W_EXTENDED_DEGRADED = 5;
export const VOL_SHRINK = 0.25;

export const LONG_SCORE_MIN = 62;
export const SHORT_SCORE_MAX = 38;
export const TREND_CONFIRM = 0.1;
export const CONTRADICTION_PCT = 1.0;
const CONTRADICTION_FLOOR_PCT = 0.5;

export const SAT_LEGACY: SatScales = {
  ma5Pct: 4,
  ma20Pct: 8,
  ret5Pct: 6,
  ret20Pct: 15,
  rvol: 1.5,
  extPct: 2,
  dayPct: 3,
  atrPct: 4,
};

export const SAT_US: SatScales = {
  ma5Pct: 7,
  ma20Pct: 22,
  ret5Pct: 14,
  ret20Pct: 34,
  rvol: 2.4,
  extPct: 4,
  dayPct: 11,
  atrPct: 10,
};

export const SAT_HK: SatScales = {
  ma5Pct: 6,
  ma20Pct: 18,
  ret5Pct: 12,
  ret20Pct: 28,
  rvol: 2.2,
  extPct: 3,
  dayPct: 9,
  atrPct: 8,
};

export const SAT_CN_MAIN: SatScales = {
  ma5Pct: 14,
  ma20Pct: 30,
  ret5Pct: 28,
  ret20Pct: 60,
  rvol: 3,
  extPct: 2,
  dayPct: 10,
  atrPct: 10,
};

export const SAT_CN_GROWTH: SatScales = {
  ma5Pct: 18,
  ma20Pct: 40,
  ret5Pct: 38,
  ret20Pct: 80,
  rvol: 3,
  extPct: 2,
  dayPct: 20,
  atrPct: 12,
};

/** @deprecated Prefer {@link scalesForSymbol}; kept for market-level callers. */
export const SAT_SCALES: Record<MarketId, SatScales> = {
  US: SAT_US,
  HK: SAT_HK,
  CN: SAT_CN_MAIN,
};

const MA_SHORT = 5;
const MA_LONG = 20;
const RANGE_WINDOW = 20;
const VOLUME_WINDOW = 20;
const ATR_WINDOW = 14;

export interface FactorDetail {
  ma5: number | null;
  ma20: number | null;
  distMa5Pct: number | null;
  distMa20Pct: number | null;
  ret5Pct: number | null;
  ret20Pct: number | null;
  high20: number | null;
  low20: number | null;
  rangePct: number | null;
  rvol: number | null;
  atrPct: number | null;
  gapPct: number | null;
  extMovePct: number | null;
  extContradicts: boolean;
  dayChangePct: number;
  sessions: number;
  degraded: boolean;
}

export interface FactorScores {
  trend: number;
  momentum: number;
  rangePos: number;
  volume: number;
  extended: number;
  dayChange: number;
  volatility: number;
  detail: FactorDetail;
}

/** Quote fields the engine needs for session-correct scoring. */
export interface FactorQuoteInput {
  symbol?: string;
  price: number;
  changePct?: number;
  /** Prior regular session change % (used when session is pre/post). */
  regularChangePct?: number;
  regularPrice?: number;
  session?: QuoteSession;
  /** ISO or YYYY-MM-DD — bars on this exchange day are excluded. */
  asOf?: string;
  /** When false, day change is treated as unknown (0). Default true. */
  changeReportable?: boolean;
}

export function isCnGrowthBoard(symbol: string): boolean {
  const code = symbol.split(/[.:]/)[0]?.replace(/^(SH|SZ)/i, "") ?? "";
  if (code.length !== 6 || !/^\d{6}$/.test(code)) return false;
  const prefix = code.slice(0, 3);
  return prefix === "300" || prefix === "301" || prefix === "688" || prefix === "689";
}

export function inferMarketId(symbol: string): MarketId {
  const upper = symbol.toUpperCase();
  if (upper.endsWith(".HK") || upper.includes(":HK")) return "HK";
  if (
    upper.endsWith(".SS") ||
    upper.endsWith(".SZ") ||
    upper.endsWith(".SH") ||
    /^(SH|SZ)\d{6}/i.test(upper) ||
    /^\d{6}$/.test(upper.split(/[.:]/)[0] ?? "")
  ) {
    return "CN";
  }
  return "US";
}

export function scalesForSymbol(symbol: string): SatScales {
  const market = inferMarketId(symbol);
  if (market === "CN") return isCnGrowthBoard(symbol) ? SAT_CN_GROWTH : SAT_CN_MAIN;
  if (market === "HK") return SAT_HK;
  return SAT_US;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function norm(value: number, saturation: number): number {
  if (!Number.isFinite(value) || saturation <= 0) return 0;
  return clamp(value / saturation, -1, 1);
}

function pctChange(from: number, to: number): number | null {
  if (!Number.isFinite(from) || from <= 0 || !Number.isFinite(to)) return null;
  return ((to - from) / from) * 100;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Number.isFinite(sum) ? sum / values.length : null;
}

function emptyDetail(partial: Partial<FactorDetail> = {}): FactorDetail {
  return {
    ma5: null,
    ma20: null,
    distMa5Pct: null,
    distMa20Pct: null,
    ret5Pct: null,
    ret20Pct: null,
    high20: null,
    low20: null,
    rangePct: null,
    rvol: null,
    atrPct: null,
    gapPct: null,
    extMovePct: null,
    extContradicts: false,
    dayChangePct: 0,
    sessions: 0,
    degraded: true,
    ...partial,
  };
}

function isExtended(session: QuoteSession | undefined): boolean {
  return session === "pre" || session === "post";
}

function asOfDay(asOf: string | undefined): string | undefined {
  if (!asOf) return undefined;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(asOf.trim());
  return m?.[1];
}

function completedBefore(bars: DailyBar[], liveDay: string | undefined): DailyBar[] {
  const valid = bars.filter((b) => Number.isFinite(b.close) && b.close > 0);
  if (!liveDay) return valid;
  return valid.filter((b) => b.date < liveDay);
}

function extendedMovePct(quote: FactorQuoteInput): number | null {
  if (!isExtended(quote.session)) return null;
  const basis = quote.regularPrice;
  if (basis == null || !Number.isFinite(basis) || basis <= 0) return null;
  return pctChange(basis, quote.price);
}

function dayChangeFor(quote: FactorQuoteInput, completed: DailyBar[]): number {
  if (isExtended(quote.session)) {
    if (quote.regularChangePct != null && Number.isFinite(quote.regularChangePct)) {
      return quote.regularChangePct;
    }
    if (completed.length >= 2) {
      const prev = completed[completed.length - 2]!.close;
      const last = completed[completed.length - 1]!.close;
      return pctChange(prev, last) ?? 0;
    }
    return 0;
  }
  if (quote.changeReportable === false) return 0;
  if (quote.changePct != null && Number.isFinite(quote.changePct)) return quote.changePct;
  if (completed.length >= 2) {
    return pctChange(completed[completed.length - 2]!.close, completed[completed.length - 1]!.close) ?? 0;
  }
  if (completed.length === 1) {
    const last = completed[0]!;
    return pctChange(last.open, last.close) ?? 0;
  }
  return 0;
}

function atrPct(completed: DailyBar[], price: number): number | null {
  if (completed.length < ATR_WINDOW + 1 || !Number.isFinite(price) || price <= 0) return null;
  const start = completed.length - ATR_WINDOW;
  const ranges: number[] = [];
  for (let i = start; i < completed.length; i += 1) {
    const bar = completed[i]!;
    const prevClose = completed[i - 1]!.close;
    const tr = Math.max(bar.high - bar.low, Math.abs(bar.high - prevClose), Math.abs(bar.low - prevClose));
    if (Number.isFinite(tr) && tr >= 0) ranges.push(tr);
  }
  const atr = mean(ranges);
  return atr === null ? null : (atr / price) * 100;
}

function relativeVolume(completed: DailyBar[]): number | null {
  if (completed.length < VOLUME_WINDOW + 1) return null;
  const last = completed[completed.length - 1]!.volume;
  if (!Number.isFinite(last) || last <= 0) return null;
  const base = completed.slice(completed.length - 1 - VOLUME_WINDOW, completed.length - 1);
  const volumes = base.map((b) => b.volume).filter((v) => v > 0);
  if (volumes.length < VOLUME_WINDOW / 2) return null;
  const avg = mean(volumes);
  return avg !== null && avg > 0 ? last / avg : null;
}

function gapPct(quote: FactorQuoteInput, completed: DailyBar[]): number | null {
  if (isExtended(quote.session)) return extendedMovePct(quote);
  if (completed.length < 2) return null;
  const last = completed[completed.length - 1]!;
  const prevClose = completed[completed.length - 2]!.close;
  return pctChange(prevClose, last.open);
}

export interface ComputeFactorsOptions {
  market?: MarketId;
  price?: number;
  dayChangePct?: number;
  scales?: SatScales;
  quote?: FactorQuoteInput;
  symbol?: string;
}

/**
 * Compute factors from a completed daily series.
 * Prefer passing {@link ComputeFactorsOptions.quote} for session-correct scoring.
 */
export function computeFactors(bars: DailyBar[], options: ComputeFactorsOptions = {}): FactorScores {
  const symbol = options.quote?.symbol ?? options.symbol ?? "";
  const scales =
    options.scales ??
    (symbol ? scalesForSymbol(symbol) : SAT_SCALES[options.market ?? "US"]);

  const quote: FactorQuoteInput = options.quote ?? {
    price: options.price ?? 0,
    changePct: options.dayChangePct,
    session: "regular",
    changeReportable: true,
  };
  if (options.price != null && options.quote == null) quote.price = options.price;
  if (options.dayChangePct != null && options.quote == null) quote.changePct = options.dayChangePct;

  const liveDay = asOfDay(quote.asOf);
  const completed = completedBefore(bars, liveDay);
  const price = quote.price || completed[completed.length - 1]?.close || 0;

  const extMove = extendedMovePct(quote);
  const dayChangePct = dayChangeFor(quote, completed);
  const extContradicts =
    extMove != null &&
    Math.abs(extMove) >= CONTRADICTION_FLOOR_PCT &&
    Math.abs(dayChangePct) >= 0.1 &&
    Math.sign(extMove) !== Math.sign(dayChangePct);

  const extended = norm(extMove ?? 0, scales.extPct);
  const day = norm(dayChangePct, scales.dayPct);

  if (completed.length < MA_LONG || !Number.isFinite(price) || price <= 0) {
    return {
      trend: 0,
      momentum: 0,
      rangePos: 0,
      volume: 0,
      extended,
      dayChange: day,
      volatility: 0,
      detail: emptyDetail({
        gapPct: gapPct(quote, completed),
        extMovePct: extMove,
        extContradicts,
        dayChangePct,
        sessions: completed.length,
        degraded: true,
      }),
    };
  }

  const maOf = (n: number): number | null => {
    const take = n - 1;
    const tail = completed.slice(completed.length - take);
    return mean([...tail.map((b) => b.close), price]);
  };
  const ma5 = maOf(MA_SHORT);
  const ma20 = maOf(MA_LONG);
  const distMa5 = ma5 !== null ? pctChange(ma5, price) : null;
  const distMa20 = ma20 !== null ? pctChange(ma20, price) : null;
  const trend =
    0.4 * norm(distMa5 ?? 0, scales.ma5Pct) + 0.6 * norm(distMa20 ?? 0, scales.ma20Pct);

  const retOver = (n: number): number | null => {
    if (completed.length < n) return null;
    return pctChange(completed[completed.length - n]!.close, price);
  };
  const ret5 = retOver(MA_SHORT);
  const ret20 = retOver(MA_LONG);
  const momentum =
    0.6 * norm(ret5 ?? 0, scales.ret5Pct) + 0.4 * norm(ret20 ?? 0, scales.ret20Pct);

  const window = completed.slice(Math.max(0, completed.length - RANGE_WINDOW));
  const high20 = Math.max(...window.map((b) => b.high), price);
  const low20 = Math.min(...window.map((b) => b.low), price);
  const rangePct = high20 > low20 ? ((price - low20) / (high20 - low20)) * 100 : null;
  const rangePos = rangePct !== null ? rangePct / 50 - 1 : 0;

  const rvol = relativeVolume(completed);
  const volume = rvol !== null ? clamp((rvol - 1) / scales.rvol, -1, 1) : 0;
  const atr = atrPct(completed, price);
  const volatility = atr !== null ? clamp(atr / scales.atrPct, 0, 1) : 0;

  return {
    trend,
    momentum,
    rangePos,
    volume,
    extended,
    dayChange: day,
    volatility,
    detail: {
      ma5,
      ma20,
      distMa5Pct: distMa5,
      distMa20Pct: distMa20,
      ret5Pct: ret5,
      ret20Pct: ret20,
      high20,
      low20,
      rangePct,
      rvol,
      atrPct: atr,
      gapPct: gapPct(quote, completed),
      extMovePct: extMove,
      extContradicts,
      dayChangePct,
      sessions: completed.length,
      degraded: false,
    },
  };
}

export function contributions(f: FactorScores): Array<{ weight: number; value: number; points: number }> {
  const degraded = f.detail.degraded;
  const rows = [
    { weight: degraded ? 0 : W_TREND, value: f.trend },
    { weight: degraded ? 0 : W_MOMENTUM, value: f.momentum },
    { weight: degraded ? 0 : W_RANGE, value: f.rangePos },
    { weight: degraded ? 0 : W_VOLUME, value: f.volume },
    { weight: degraded ? W_EXTENDED_DEGRADED : W_EXTENDED, value: f.extended },
    { weight: degraded ? W_DAY_DEGRADED : W_DAY, value: f.dayChange },
  ];
  return rows.map((r) => ({ ...r, points: r.value * r.weight }));
}

export function scoreFromFactors(f: FactorScores): number {
  const raw = 50 + contributions(f).reduce((sum, c) => sum + c.points, 0);
  const shrunk = 50 + (raw - 50) * (1 - VOL_SHRINK * clamp(f.volatility, 0, 1));
  return clamp(round1(shrunk), 0, 100);
}

export function stanceFromFactors(score: number, f: FactorScores): Stance {
  const ext = f.detail.extMovePct ?? 0;
  const hardContradiction = f.detail.extContradicts && Math.abs(ext) >= CONTRADICTION_PCT;

  if (f.detail.degraded) {
    if (score >= LONG_SCORE_MIN && f.detail.dayChangePct > 0.5 && !hardContradiction) return "bullish";
    if (score <= SHORT_SCORE_MAX && f.detail.dayChangePct < -0.5 && !hardContradiction) return "bearish";
    return "neutral";
  }
  if (score >= LONG_SCORE_MIN && f.trend > TREND_CONFIRM && !(hardContradiction && ext < 0)) {
    return "bullish";
  }
  if (score <= SHORT_SCORE_MAX && f.trend < -TREND_CONFIRM && !(hardContradiction && ext > 0)) {
    return "bearish";
  }
  return "neutral";
}

function pct1(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function pct2(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function trendPhrase(d: FactorDetail): string | null {
  if (d.distMa5Pct === null || d.distMa20Pct === null) return null;
  const pair = `${pct1(d.distMa5Pct)}/${pct1(d.distMa20Pct)}`;
  if (d.distMa5Pct >= 0 && d.distMa20Pct >= 0) return `Above MA5/MA20 (${pair})`;
  if (d.distMa5Pct < 0 && d.distMa20Pct < 0) return `Below MA5/MA20 (${pair})`;
  if (d.distMa5Pct >= 0) return `Short bounce, still below MA20 (${pair})`;
  return `Pulled back under MA5 (${pair})`;
}

function momentumPhrase(d: FactorDetail): string | null {
  if (d.ret5Pct === null || d.ret20Pct === null) return null;
  return `5d ${pct1(d.ret5Pct)}, 20d ${pct1(d.ret20Pct)}`;
}

function rangePhrase(d: FactorDetail): string | null {
  if (d.rangePct === null) return null;
  const tag = d.rangePct.toFixed(0);
  if (d.rangePct >= 85) return `Near 20-day high (range ${tag}%)`;
  if (d.rangePct >= 60) return `Upper 20-day range (${tag}%)`;
  if (d.rangePct <= 15) return `Near 20-day low (range ${tag}%)`;
  if (d.rangePct <= 40) return `Lower 20-day range (${tag}%)`;
  return `Mid 20-day range (${tag}%)`;
}

function volumePhrase(d: FactorDetail): string | null {
  if (d.rvol === null) return null;
  const tag = d.rvol.toFixed(2);
  if (d.rvol >= 1.5) return `Volume ${tag}x 20-day average`;
  if (d.rvol >= 1.15) return `Mild volume lift ${tag}x`;
  if (d.rvol <= 0.6) return `Clear volume dry-up ${tag}x`;
  if (d.rvol <= 0.85) return `Light volume ${tag}x`;
  return `Volume steady (${tag}x)`;
}

export function reasonFromFactors(
  f: FactorScores,
  score: number,
  quote?: FactorQuoteInput,
): string {
  const d = f.detail;
  const dayLabel = isExtended(quote?.session) ? "prior session" : "session";
  const tail = `| ${dayLabel} ${pct2(d.dayChangePct)} · score ${score.toFixed(0)}`;

  if (d.degraded) {
    return `Factors: history incomplete (${d.sessions} sessions); scored from ${dayLabel} change only ${tail}`;
  }

  const parts: string[] = [];
  if (d.extMovePct != null && isExtended(quote?.session)) {
    const label = quote?.session === "pre" ? "pre-market" : "after-hours";
    parts.push(`${label} ${pct2(d.extMovePct)}`);
  }

  const ranked: Array<{ pts: number; text: string }> = [];
  const add = (pts: number, phrase: string | null) => {
    if (phrase && Math.abs(pts) >= 0.3) ranked.push({ pts: Math.abs(pts), text: phrase });
  };
  add(f.trend * W_TREND, trendPhrase(d));
  add(f.momentum * W_MOMENTUM, momentumPhrase(d));
  add(f.rangePos * W_RANGE, rangePhrase(d));
  add(f.volume * W_VOLUME, volumePhrase(d));
  ranked.sort((a, b) => b.pts - a.pts);
  parts.push(...ranked.slice(0, 3).map((r) => r.text));

  const volPhrase = volumePhrase(d);
  if (volPhrase && d.rvol !== null && (d.rvol >= 1.5 || d.rvol <= 0.6) && !parts.includes(volPhrase)) {
    parts.push(volPhrase);
  }
  if (parts.length === 0) parts.push("No clear trend, momentum, or volume direction");
  if (d.atrPct !== null) {
    const band = d.atrPct >= 4 ? "elevated" : d.atrPct >= 2 ? "moderate" : "low";
    parts.push(`ATR ${d.atrPct.toFixed(1)}% (${band})`);
  }
  if (d.gapPct != null && Math.abs(d.gapPct) >= 1 && !isExtended(quote?.session)) {
    parts.push(`gap ${pct1(d.gapPct)}`);
  }
  return `Factors: ${parts.join(" · ")} ${tail}`;
}

export function riskFromFactors(stance: Stance, f: FactorScores): string {
  const d = f.detail;
  const atr = d.atrPct ?? 0;
  const range = d.rangePct ?? 50;
  if (stance === "bullish") {
    if (d.extContradicts) return "Extended session disagrees with the prior day; wait for confirmation.";
    if (atr >= 4) return `Volatility elevated (ATR ${atr.toFixed(1)}%); size small and use a stop.`;
    if (range >= 90) return "Near the 20-day high; failed breakouts reverse quickly.";
    if (d.rvol != null && d.rvol < 0.85) return "Trend constructive but volume has not confirmed.";
    return "Trend and momentum aligned; track with a defined stop.";
  }
  if (stance === "bearish") {
    if (atr >= 4) return `Downside momentum with high ATR (${atr.toFixed(1)}%); avoid catching knives.`;
    if (range <= 10) return "Near the 20-day low; breakdown risk may still be open.";
    return "Trend and momentum lean bearish; wait or hedge lightly.";
  }
  if (d.degraded) return "Insufficient history; day change alone is not a stance.";
  if (d.extContradicts) return "Extended session contradicts the prior day; stay flat.";
  if (atr <= 1.5) return "Direction unclear and volatility compressed; stay flat.";
  return "Mixed factor tape; stay flat.";
}
