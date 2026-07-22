export interface StockScoreFingerprint {
  ticker: string;
  score: number;
  view: string;
  bias: string;
  action: string;
}

export interface PulseSnapshot {
  scheduleId: string;
  asOf: string;
  language: "zh" | "en";
  mode: "market" | "digest";
  bias?: string;
  confidence?: number;
  drivers: string[];
  macroRisks: string[];
  stocks: StockScoreFingerprint[];
  newsFingerprints: string[];
  headlineHashes: string[];
  title: string;
}

export interface ContinuityDelta {
  previousAsOf: string | null;
  hasPrevious: boolean;
  biasChanged: boolean;
  previousBias?: string;
  currentBias?: string;
  newDrivers: string[];
  droppedDrivers: string[];
  newRisks: string[];
  droppedRisks: string[];
  viewFlips: Array<{ ticker: string; from: string; to: string }>;
  scoreJumps: Array<{ ticker: string; from: number; to: number; delta: number }>;
  newHeadlines: string[];
  fadedHeadlines: string[];
  summaryLines: string[];
}
