import { describe, expect, it } from "vitest";
import {
  computeFactors,
  LONG_SCORE_MIN,
  reasonFromFactors,
  scoreFromFactors,
  SHORT_SCORE_MAX,
  stanceFromFactors,
  type DailyBar,
} from "../src/research/scoring/factors";

function barsFrom(closes: number[], spread: number, volume: number): DailyBar[] {
  return closes.map((close, i) => ({
    date: `2026-06-${String((i % 28) + 1).padStart(2, "0")}`,
    open: close,
    high: close + spread,
    low: close - spread,
    close,
    volume,
  }));
}

function flatSeries(n: number, level: number): number[] {
  return Array.from({ length: n }, () => level);
}

describe("factors", () => {
  it("marks short history as degraded", () => {
    const f = computeFactors(barsFrom(flatSeries(10, 100), 1, 1000));
    expect(f.detail.degraded).toBe(true);
    expect(f.detail.sessions).toBe(10);
    expect(f.detail.ma5).toBeNull();
  });

  it("scores a flat series near neutral", () => {
    const f = computeFactors(barsFrom(flatSeries(30, 100), 0.5, 1000), {
      price: 100,
      dayChangePct: 0,
    });
    expect(f.detail.degraded).toBe(false);
    expect(f.detail.ma5).toBe(100);
    expect(f.detail.ma20).toBe(100);
    expect(f.detail.rvol).toBe(1);
    const score = scoreFromFactors(f);
    expect(Math.abs(score - 50)).toBeLessThan(1);
    expect(stanceFromFactors(score, f)).toBe("neutral");
  });

  it("scores a steady uptrend bullish", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 * 1.012 ** i);
    const last = closes[closes.length - 1]!;
    const price = last * 1.012;
    const f = computeFactors(barsFrom(closes, last * 0.01, 1000), {
      price,
      dayChangePct: 1.2,
    });
    expect(f.trend).toBeGreaterThan(0.2);
    expect(f.momentum).toBeGreaterThan(0.4);
    const score = scoreFromFactors(f);
    expect(score).toBeGreaterThanOrEqual(LONG_SCORE_MIN);
    expect(stanceFromFactors(score, f)).toBe("bullish");
    const reason = reasonFromFactors(f, score);
    expect(reason).toContain("Above MA5/MA20");
    expect(reason).toMatch(/Factors:/);
  });

  it("does not call a green day inside a downtrend bullish", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 150 * 0.993 ** i);
    const last = closes[closes.length - 1]!;
    const price = last * 1.03;
    const f = computeFactors(barsFrom(closes, last * 0.01, 1000), {
      price,
      dayChangePct: 3,
    });
    expect(f.detail.dayChangePct).toBeGreaterThan(0);
    expect(f.trend).toBeLessThan(0);
    expect(stanceFromFactors(scoreFromFactors(f), f)).not.toBe("bullish");
  });

  it("scores a deep downtrend bearish", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 200 * 0.99 ** i);
    const last = closes[closes.length - 1]!;
    const f = computeFactors(barsFrom(closes, last * 0.005, 1000), {
      price: last * 0.995,
      dayChangePct: -0.5,
    });
    const score = scoreFromFactors(f);
    expect(score).toBeLessThanOrEqual(SHORT_SCORE_MAX);
    expect(stanceFromFactors(score, f)).toBe("bearish");
    expect(reasonFromFactors(f, score)).toContain("Below MA5/MA20");
  });

  it("lets volatility only shrink conviction", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 * 1.005 ** i);
    const last = closes[closes.length - 1]!;
    const calm = computeFactors(barsFrom(closes, last * 0.002, 1000), {
      price: last * 1.005,
      dayChangePct: 0.5,
    });
    const wild = computeFactors(barsFrom(closes, last * 0.05, 1000), {
      price: last * 1.005,
      dayChangePct: 0.5,
    });
    expect(wild.volatility).toBeGreaterThan(calm.volatility);
    const sCalm = scoreFromFactors(calm);
    const sWild = scoreFromFactors(wild);
    expect(sWild).toBeLessThan(sCalm);
    expect(sWild).toBeGreaterThan(50);
  });

  it("computes relative volume from the prior window", () => {
    const bars = barsFrom(flatSeries(30, 100), 1, 1000);
    bars[bars.length - 1]!.volume = 2000;
    const f = computeFactors(bars, { price: 100, dayChangePct: 0 });
    expect(f.detail.rvol).toBe(2);
    expect(reasonFromFactors(f, 50)).toContain("Volume 2.00×");
  });

  it("keeps scores inside 0–100", () => {
    const up = Array.from({ length: 30 }, (_, i) => 10 * 1.1 ** i);
    const down = Array.from({ length: 30 }, (_, i) => 10_000 * 0.9 ** i);
    const hot = computeFactors(barsFrom(up, 0.01, 1000), {
      price: up[up.length - 1]! * 1.2,
      dayChangePct: 20,
    });
    const cold = computeFactors(barsFrom(down, 0.01, 1000), {
      price: down[down.length - 1]! * 0.8,
      dayChangePct: -20,
    });
    const sHot = scoreFromFactors(hot);
    const sCold = scoreFromFactors(cold);
    expect(sHot).toBeGreaterThanOrEqual(0);
    expect(sHot).toBeLessThanOrEqual(100);
    expect(sCold).toBeGreaterThanOrEqual(0);
    expect(sCold).toBeLessThanOrEqual(100);
    expect(sHot).toBeGreaterThan(80);
    expect(sCold).toBeLessThan(20);
  });
});
