/**
 * Multi-factor scoring from completed daily bars.
 * Ported core of tg-stock-reco `factors.rs` (deterministic, no ML).
 *
 * Weights sum to 50; score = 50 + Σ(factor × weight), then volatility shrinks
 * distance from 50. English reason / stance strings only.
 */

export interface DailyBar {
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
  dayPct: number;
  atrPct: number;
}

export const W_TREND = 18;
export const W_MOMENTUM = 12;
export const W_RANGE = 6;
export const W_VOLUME = 4;
export const W_DAY = 10; // day + extended collapsed for bars-only path (3+7)
export const VOL_SHRINK = 0.25;

export const LONG_SCORE_MIN = 62;
export const SHORT_SCORE_MAX = 38;
export const TREND_CONFIRM = 0.1;

export const SAT_SCALES: Record<MarketId, SatScales> = {
  US: {
    ma5Pct: 7,
    ma20Pct: 22,
    ret5Pct: 14,
    ret20Pct: 34,
    rvol: 2.4,
    dayPct: 11,
    atrPct: 10,
  },
  HK: {
    ma5Pct: 6,
    ma20Pct: 18,
    ret5Pct: 12,
    ret20Pct: 28,
    rvol: 2.2,
    dayPct: 9,
    atrPct: 8,
  },
  CN: {
    ma5Pct: 14,
    ma20Pct: 30,
    ret5Pct: 28,
    ret20Pct: 60,
    rvol: 3,
    dayPct: 10,
    atrPct: 10,
  },
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
  dayChangePct: number;
  sessions: number;
  degraded: boolean;
}

export interface FactorScores {
  trend: number;
  momentum: number;
  rangePos: number;
  volume: number;
  dayChange: number;
  volatility: number;
  detail: FactorDetail;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function toFixed(value: number, digits: number): string {
  return value.toFixed(digits);
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
    dayChangePct: 0,
    sessions: 0,
    degraded: true,
    ...partial,
  };
}

function atrPct(bars: DailyBar[], price: number): number | null {
  if (bars.length < ATR_WINDOW + 1 || !Number.isFinite(price) || price <= 0) return null;
  const start = bars.length - ATR_WINDOW;
  const ranges: number[] = [];
  for (let i = start; i < bars.length; i += 1) {
    const bar = bars[i]!;
    const prevClose = bars[i - 1]!.close;
    const a = bar.high - bar.low;
    const b = Math.abs(bar.high - prevClose);
    const c = Math.abs(bar.low - prevClose);
    const tr = Math.max(a, b, c);
    if (Number.isFinite(tr) && tr >= 0) ranges.push(tr);
  }
  const atr = mean(ranges);
  if (atr === null) return null;
  return (atr / price) * 100;
}

function relativeVolume(bars: DailyBar[]): number | null {
  if (bars.length < VOLUME_WINDOW + 1) return null;
  const last = bars[bars.length - 1]!.volume;
  if (!Number.isFinite(last) || last <= 0) return null;
  const base = bars.slice(bars.length - 1 - VOLUME_WINDOW, bars.length - 1);
  const volumes = base.map((b) => b.volume).filter((v) => v > 0);
  if (volumes.length < VOLUME_WINDOW / 2) return null;
  const avg = mean(volumes);
  if (avg === null || avg <= 0) return null;
  return last / avg;
}

export interface ComputeFactorsOptions {
  market?: MarketId;
  /** Live price; defaults to last close. */
  price?: number;
  /** Session day-change %; defaults to last bar open→close (or prior close→close). */
  dayChangePct?: number;
  scales?: SatScales;
}

/**
 * Compute factors from a completed daily series.
 * With fewer than 20 bars the result is `degraded` (day move only).
 */
export function computeFactors(bars: DailyBar[], options: ComputeFactorsOptions = {}): FactorScores {
  const market = options.market ?? "US";
  const scales = options.scales ?? SAT_SCALES[market];
  const completed = bars.filter((b) => Number.isFinite(b.close) && b.close > 0);
  const last = completed[completed.length - 1];
  const price = options.price ?? last?.close ?? 0;

  let dayChangePct = options.dayChangePct;
  if (dayChangePct === undefined) {
    if (completed.length >= 2) {
      dayChangePct = pctChange(completed[completed.length - 2]!.close, last!.close) ?? 0;
    } else if (last) {
      dayChangePct = pctChange(last.open, last.close) ?? 0;
    } else {
      dayChangePct = 0;
    }
  }

  const day = norm(dayChangePct, scales.dayPct);

  if (completed.length < MA_LONG || !Number.isFinite(price) || price <= 0) {
    return {
      trend: 0,
      momentum: 0,
      rangePos: 0,
      volume: 0,
      dayChange: day,
      volatility: 0,
      detail: emptyDetail({
        dayChangePct,
        sessions: completed.length,
        degraded: true,
      }),
    };
  }

  const maOf = (n: number): number | null => {
    const take = n - 1;
    const tail = completed.slice(completed.length - take);
    const values = [...tail.map((b) => b.close), price];
    return mean(values);
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
  const volume =
    rvol !== null ? clamp((rvol - 1) / scales.rvol, -1, 1) : 0;

  const atr = atrPct(completed, price);
  const volatility = atr !== null ? clamp(atr / scales.atrPct, 0, 1) : 0;

  return {
    trend,
    momentum,
    rangePos,
    volume,
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
      dayChangePct,
      sessions: completed.length,
      degraded: false,
    },
  };
}

function contributions(f: FactorScores): Array<{ weight: number; value: number }> {
  const degraded = f.detail.degraded;
  return [
    { weight: degraded ? 0 : W_TREND, value: f.trend },
    { weight: degraded ? 0 : W_MOMENTUM, value: f.momentum },
    { weight: degraded ? 0 : W_RANGE, value: f.rangePos },
    { weight: degraded ? 0 : W_VOLUME, value: f.volume },
    { weight: degraded ? 35 : W_DAY, value: f.dayChange },
  ];
}

/** `50 + Σ(factor × weight)`, then shrunk toward 50 by volatility. */
export function scoreFromFactors(f: FactorScores): number {
  const raw = 50 + contributions(f).reduce((sum, c) => sum + c.value * c.weight, 0);
  const shrunk = 50 + (raw - 50) * (1 - VOL_SHRINK * clamp(f.volatility, 0, 1));
  return clamp(round1(shrunk), 0, 100);
}

export function stanceFromFactors(score: number, f: FactorScores): Stance {
  if (f.detail.degraded) {
    if (score >= LONG_SCORE_MIN && f.detail.dayChangePct > 0.5) return "bullish";
    if (score <= SHORT_SCORE_MAX && f.detail.dayChangePct < -0.5) return "bearish";
    return "neutral";
  }
  if (score >= LONG_SCORE_MIN && f.trend > TREND_CONFIRM) return "bullish";
  if (score <= SHORT_SCORE_MAX && f.trend < -TREND_CONFIRM) return "bearish";
  return "neutral";
}

function pct1(v: number): string {
  return `${v >= 0 ? "+" : ""}${toFixed(v, 1)}%`;
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
  const tag = toFixed(d.rangePct, 0);
  if (d.rangePct >= 85) return `Near 20-day high (range ${tag}%)`;
  if (d.rangePct >= 60) return `Upper 20-day range (${tag}%)`;
  if (d.rangePct <= 15) return `Near 20-day low (range ${tag}%)`;
  if (d.rangePct <= 40) return `Lower 20-day range (${tag}%)`;
  return `Mid 20-day range (${tag}%)`;
}

function volumePhrase(d: FactorDetail): string | null {
  if (d.rvol === null) return null;
  const tag = toFixed(d.rvol, 2);
  if (d.rvol >= 1.5) return `Volume ${tag}× 20-day average`;
  if (d.rvol >= 1.15) return `Mild volume lift ${tag}×`;
  if (d.rvol <= 0.6) return `Clear volume dry-up ${tag}×`;
  if (d.rvol <= 0.85) return `Light volume ${tag}×`;
  return `Volume steady (${tag}×)`;
}

/** Dominant factors for this ticker, quoting real values (English). */
export function reasonFromFactors(f: FactorScores, score: number): string {
  const d = f.detail;
  const tail = `｜ session ${pct1(d.dayChangePct)} · score ${toFixed(score, 0)}`;

  if (d.degraded) {
    return `Factors: history incomplete (${d.sessions} sessions); scored from day change only ${tail}`;
  }

  const parts: string[] = [];
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
  if (parts.length === 0) {
    parts.push("No clear trend, momentum, or volume direction");
  }
  if (d.atrPct !== null) {
    const band = d.atrPct >= 4 ? "elevated" : d.atrPct >= 2 ? "moderate" : "low";
    parts.push(`ATR ${toFixed(d.atrPct, 1)}% (${band})`);
  }
  return `Factors: ${parts.join(" · ")} ${tail}`;
}
