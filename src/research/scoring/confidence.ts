import type { DataQuality, DecisionPolicy, SourceGrade } from "../types/common";

export function capConfidence(input: {
  confidence: number;
  evidenceCount: number;
  sourceGradeMax: SourceGrade;
  hasPrimarySource: boolean;
  dataQuality: DataQuality;
  llmFailed: boolean;
  policy: DecisionPolicy;
}): number {
  let cap = 95;
  if (input.evidenceCount < input.policy.min_evidence_for_trade_view) cap = Math.min(cap, 55);
  if (input.sourceGradeMax === "C") cap = Math.min(cap, 50);
  if (input.sourceGradeMax === "B" && !input.hasPrimarySource) cap = Math.min(cap, 65);
  if (!input.hasPrimarySource) cap = Math.min(cap, input.policy.max_confidence_without_primary_source);
  if (input.dataQuality.degrade_level === "major_missing_data") cap = Math.min(cap, 50);
  if (input.llmFailed) cap = Math.min(cap, 60);
  return Math.max(0, Math.min(cap, Math.round(input.confidence)));
}

export function maxSourceGrade(grades: SourceGrade[]): SourceGrade {
  if (grades.includes("S")) return "S";
  if (grades.includes("A")) return "A";
  if (grades.includes("B")) return "B";
  return "C";
}

export function hasPrimarySource(grade: SourceGrade): boolean {
  return grade === "S" || grade === "A";
}

