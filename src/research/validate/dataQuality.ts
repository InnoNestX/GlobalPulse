import type { ApiUsageEntry, DataQuality, DegradeLevel } from "../types/common";
import type { EvidenceItem } from "../types/evidence";
import type { MarketQuote } from "../types/packet";

export function evaluateDataQuality(input: {
  indices: MarketQuote[];
  universe: MarketQuote[];
  evidence: EvidenceItem[];
  usages: ApiUsageEntry[];
  requiredFields: string[];
}): DataQuality {
  const missing_fields: string[] = [];
  if (input.indices.length === 0) missing_fields.push("market.indices");
  if (input.universe.length === 0) missing_fields.push("market.universe");
  if (input.evidence.length === 0) missing_fields.push("news.evidence");
  for (const field of input.requiredFields) {
    if (!field) missing_fields.push(field);
  }

  const failed = input.usages.filter((entry) => !entry.success);
  const freshness_score = input.evidence.some((item) => {
    if (!item.published_at) return false;
    const ageHours = (Date.now() - Date.parse(item.published_at)) / (1000 * 60 * 60);
    return Number.isFinite(ageHours) && ageHours <= 36;
  }) ? 88 : input.evidence.length > 0 ? 62 : 35;
  const completeness_score = clamp(100 - missing_fields.length * 18 - failed.length * 8, 0, 100);
  const source_score = input.evidence.some((item) => item.source_grade === "S") ? 92
    : input.evidence.some((item) => item.source_grade === "A") ? 80
      : input.evidence.some((item) => item.source_grade === "B") ? 62
        : 42;
  const consistency_score = failed.length === 0 ? 90 : failed.length <= 2 ? 68 : 45;
  const degrade_level = resolveDegradeLevel(missing_fields, failed);
  const degraded_reason = degrade_level === "none"
    ? undefined
    : `数据降级：${degrade_level}；缺失 ${missing_fields.join("、") || "无"}；失败接口 ${failed.map((entry) => `${entry.provider}/${entry.endpoint}`).join("、") || "无"}`;

  return {
    completeness_score,
    freshness_score,
    source_score,
    consistency_score,
    missing_fields,
    degrade_level,
    ...(degraded_reason ? { degraded_reason } : {}),
  };
}

function resolveDegradeLevel(missingFields: string[], failed: ApiUsageEntry[]): DegradeLevel {
  if (missingFields.includes("market.indices") || missingFields.includes("market.universe")) return "market_data_failed";
  if (missingFields.includes("news.evidence")) return "news_data_failed";
  if (missingFields.length >= 2 || failed.length >= 3) return "major_missing_data";
  if (missingFields.length > 0 || failed.length > 0) return "minor_missing_data";
  return "none";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

