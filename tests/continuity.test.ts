import { describe, expect, it } from "vitest";
import { buildDigestSnapshot, buildMarketSnapshot, diffPulseSnapshots } from "../src/continuity";
import type { ResearchReportJson } from "../src/research/types/report";

const sampleReport = (bias: "偏多" | "中性" | "偏空", view: "看多" | "观察" | "看空", score: number): ResearchReportJson => ({
  executive_summary: "summary",
  market_view: {
    bias,
    confidence: 60,
    drivers: ["rates", "earnings"],
    macro_risks: ["oil"],
  },
  stock_cards: [{
    ticker: "AAPL",
    score_total: score,
    professional_view: view,
    short_term_bias: "偏上",
    action_level: "watch",
    confidence: 55,
    timeframe: "1-5d",
    key_drivers: ["momentum"],
    valuation_note: "",
    technical_note: "",
    news_note: "",
    entry_rule: "",
    stop_rule: "",
    invalidation_rule: "",
    risk_note: "",
    evidence_count: 2,
    source_grade_max: "A",
  }],
  news_review: [{
    title: "Fed speakers watch inflation",
    source: "Reuters",
    source_grade: "A",
    used_in_conclusion: true,
    why: "macro",
  }],
  risk_actions: {
    positioning: "neutral",
    hedge_note: "",
    watch_items_next_session: [],
  },
});

describe("continuity diff", () => {
  it("builds a first-run baseline summary", () => {
    const current = buildMarketSnapshot({
      scheduleId: "s1",
      asOf: "2026-07-22",
      language: "zh",
      title: "Brief",
      report: sampleReport("偏多", "看多", 70),
    });
    const delta = diffPulseSnapshots(null, current);
    expect(delta.hasPrevious).toBe(false);
    expect(delta.summaryLines[0]).toContain("首次");
  });

  it("detects bias flips, score jumps, and new headlines", () => {
    const previous = buildMarketSnapshot({
      scheduleId: "s1",
      asOf: "day-1",
      language: "en",
      title: "Brief",
      report: sampleReport("偏空", "看空", 40),
    });
    const nextReport = sampleReport("偏多", "看多", 70);
    nextReport.news_review = [{
      title: "Breakout catalyst arrives",
      source: "FT",
      source_grade: "A",
      used_in_conclusion: true,
      why: "catalyst",
    }];
    const current = buildMarketSnapshot({
      scheduleId: "s1",
      asOf: "day-2",
      language: "en",
      title: "Brief",
      report: nextReport,
    });
    const delta = diffPulseSnapshots(previous, current);
    expect(delta.biasChanged).toBe(true);
    expect(delta.viewFlips[0]?.ticker).toBe("AAPL");
    expect(delta.scoreJumps[0]?.delta).toBe(30);
    expect(delta.newHeadlines.some((line) => line.includes("Breakout"))).toBe(true);
  });

  it("fingerprints digest headlines", () => {
    const snap = buildDigestSnapshot({
      scheduleId: "hot",
      asOf: "now",
      language: "zh",
      title: "Hot",
      items: [{ title: "Headline A", url: "https://x.test/a", source: "x" }],
    });
    expect(snap.newsFingerprints).toHaveLength(1);
    expect(snap.mode).toBe("digest");
  });
});
