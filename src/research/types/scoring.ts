import type { SourceGrade } from "./common";

export interface SignalScores {
  macro: number;
  technical: number;
  news: number;
  momentum: number;
  risk: number;
  total: number;
}

export interface ConfidenceInput {
  baseConfidence: number;
  evidenceCount: number;
  sourceGradeMax: SourceGrade;
  hasPrimarySource: boolean;
  degradeLevel: string;
  llmFailed: boolean;
}

