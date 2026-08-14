import { describe, expect, it } from "vitest";
import {
  classifyHardFilter,
  isShellName,
  listedDaysFromYmd,
  minTurnover,
  MIN_LISTED_DAYS,
  passesHardFilters,
  percentiles,
  stage1Score,
  type LiquidityRow,
} from "../src/research/universe/liquidity";

function row(partial: Partial<LiquidityRow> & Pick<LiquidityRow, "symbol" | "name">): LiquidityRow {
  return {
    price: 10,
    cap: 1e10,
    turnover: 5e8,
    turnoverRate: 2,
    volRatio: 1,
    chg60d: 5,
    ytd: 10,
    changePct: 1,
    listedDays: 365,
    ...partial,
  };
}

describe("liquidity filters", () => {
  it("exposes market turnover floors", () => {
    expect(minTurnover("US")).toBe(20e6);
    expect(minTurnover("CN")).toBe(1e8);
    expect(minTurnover("HK")).toBe(5e7);
  });

  it("rejects ST / delisting / PT shells by name", () => {
    for (const name of ["*ST星源", "ST美丽", "国华退", "PT金田A", "*ST石化A"]) {
      expect(isShellName(name)).toBe(true);
      expect(classifyHardFilter(row({ symbol: "X", name }), "CN")).toBe("shell");
    }
    expect(isShellName("贵州茅台")).toBe(false);
  });

  it("rejects thin / cheap / too new / no cap rows", () => {
    expect(classifyHardFilter(row({ symbol: "A", name: "A", turnover: 1 }), "CN")).toBe("thin");
    expect(classifyHardFilter(row({ symbol: "A", name: "A", price: 0.5 }), "CN")).toBe("cheap");
    expect(
      classifyHardFilter(row({ symbol: "A", name: "A", listedDays: MIN_LISTED_DAYS - 1 }), "CN"),
    ).toBe("too_new");
    expect(classifyHardFilter(row({ symbol: "A", name: "A", cap: 0 }), "US")).toBe("no_cap");
    expect(passesHardFilters(row({ symbol: "A", name: "AAPL" }), "US")).toBe(true);
  });

  it("computes tie-aware percentiles", () => {
    expect(percentiles([1])).toEqual([0.5]);
    expect(percentiles([1, 2, 3])).toEqual([0, 0.5, 1]);
    expect(percentiles([5, 5, 5])).toEqual([0.5, 0.5, 0.5]);
  });

  it("approximates trading days from YYYYMMDD listing dates", () => {
    expect(listedDaysFromYmd(20260101, 20260101)).toBe(0);
    // ~365 calendar days → floor(365*5/7)=260
    expect(listedDaysFromYmd(20250101, 20260101)).toBe(Math.floor((20260101 - 20250101) * 5 / 7));
    expect(
      classifyHardFilter(
        row({ symbol: "N", name: "New", listedDays: null, listedOn: 20260701 }),
        "CN",
        20260814,
      ),
    ).toBe("too_new");
  });
});
