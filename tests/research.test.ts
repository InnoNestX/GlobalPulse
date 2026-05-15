import { describe, expect, it } from "vitest";
import { capConfidence } from "../src/research/scoring/confidence";
import { buildEvidenceItems } from "../src/research/sources/news";
import { evaluateDataQuality } from "../src/research/validate/dataQuality";
import { defaultDecisionPolicy } from "../src/research/types/common";

describe("research engine safety rules", () => {
  it("caps confidence when evidence is insufficient", () => {
    const confidence = capConfidence({
      confidence: 88,
      evidenceCount: 1,
      sourceGradeMax: "A",
      hasPrimarySource: true,
      dataQuality: {
        completeness_score: 95,
        freshness_score: 95,
        source_score: 90,
        consistency_score: 90,
        missing_fields: [],
        degrade_level: "none",
      },
      llmFailed: false,
      policy: defaultDecisionPolicy,
    });

    expect(confidence).toBeLessThanOrEqual(55);
  });

  it("caps confidence for C-grade evidence", () => {
    const confidence = capConfidence({
      confidence: 90,
      evidenceCount: 4,
      sourceGradeMax: "C",
      hasPrimarySource: false,
      dataQuality: {
        completeness_score: 95,
        freshness_score: 95,
        source_score: 40,
        consistency_score: 90,
        missing_fields: [],
        degrade_level: "none",
      },
      llmFailed: false,
      policy: defaultDecisionPolicy,
    });

    expect(confidence).toBeLessThanOrEqual(50);
  });

  it("deduplicates news and keeps C-grade sources out of conclusions", () => {
    const evidence = buildEvidenceItems([
      { title: "TSLA forum rumor says demand is changing", url: "https://example.com/a", source: "Hacker News", summary: "TSLA discussion" },
      { title: "TSLA forum rumor says demand is changing", url: "https://example.com/b", source: "Hacker News", summary: "TSLA discussion duplicate" },
    ], "us_stock", ["TSLA"]);

    expect(evidence).toHaveLength(1);
    expect(evidence[0]?.duplicate_count).toBe(2);
    expect(evidence[0]?.source_grade).toBe("C");
    expect(evidence[0]?.used_in_conclusion).toBe(false);
  });

  it("marks missing market data as degraded", () => {
    const quality = evaluateDataQuality({
      indices: [],
      universe: [],
      evidence: [],
      usages: [{ provider: "alpha", endpoint: "quote", success: false, latency_ms: 10, rate_limited: true }],
      requiredFields: [],
    });

    expect(quality.degrade_level).toBe("market_data_failed");
    expect(quality.missing_fields).toContain("market.indices");
  });
});

