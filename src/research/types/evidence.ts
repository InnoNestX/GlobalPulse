import type { SourceGrade, VerificationStatus } from "./common";

export type EventType =
  | "earnings"
  | "guidance"
  | "macro"
  | "policy"
  | "sector"
  | "analyst"
  | "insider"
  | "litigation"
  | "product"
  | "other";

export interface EvidenceItem {
  id: string;
  title: string;
  source: string;
  source_grade: SourceGrade;
  url?: string;
  published_at?: string;
  ticker?: string;
  summary?: string;
  used_in_conclusion: boolean;
  used_reason?: string;
  verification_status: VerificationStatus;
  event_type: EventType;
  relevance_score: number;
  canonical_event_id: string;
  duplicate_count: number;
  related_tickers: string[];
}

export interface NewsDedupResult {
  canonical_event_id: string;
  duplicate_count: number;
  related_tickers: string[];
  relevance_score: number;
  event_type: EventType;
}

