import type { ReportType } from "../../config";

export type SourceGrade = "S" | "A" | "B" | "C";
export type DegradeLevel =
  | "none"
  | "minor_missing_data"
  | "major_missing_data"
  | "llm_failed"
  | "market_data_failed"
  | "macro_data_failed"
  | "news_data_failed";
export type ActionLevel = "no_action" | "watch" | "prepare" | "trade_candidate";
export type TradingSession = "pre_market" | "regular" | "after_hours" | "closed" | "holiday";
export type OutcomeWindow = "1d" | "3d" | "5d" | "20d";
export type ProfessionalView = "看多" | "观察" | "看空";
export type ShortTermBias = "偏上" | "震荡" | "偏下";
export type VerificationStatus = "verified" | "partially_verified" | "unverified" | "conflicted";

export interface DataQuality {
  completeness_score: number;
  freshness_score: number;
  source_score: number;
  consistency_score: number;
  missing_fields: string[];
  degraded_reason?: string | undefined;
  degrade_level: DegradeLevel;
}

export interface DecisionPolicy {
  min_evidence_for_trade_view: number;
  min_source_grade_for_high_confidence: SourceGrade;
  allow_c_level_in_conclusion: boolean;
  max_confidence_without_primary_source: number;
  require_invalidation_rule: boolean;
}

export interface ApiUsageEntry {
  provider: string;
  endpoint: string;
  success: boolean;
  latency_ms: number;
  error?: string | undefined;
  message?: string | undefined;
  rate_limited: boolean;
}

export interface ResearchMeta {
  run_id: string;
  asof_local: string;
  market: ReportType;
  report_type: string;
  trading_session: TradingSession;
  timezone_local: string;
}

export const defaultDecisionPolicy: DecisionPolicy = {
  min_evidence_for_trade_view: 2,
  min_source_grade_for_high_confidence: "A",
  allow_c_level_in_conclusion: false,
  max_confidence_without_primary_source: 60,
  require_invalidation_rule: true,
};
