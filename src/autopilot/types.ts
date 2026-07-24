import type { ProviderName } from "../messages";

export type AutopilotRuleKind = "symbol_move" | "fear_greed_extreme" | "news_burst" | "bias_flip";

export interface AutopilotRule {
  id: string;
  enabled: boolean;
  name: string;
  kind: AutopilotRuleKind;
  params: Record<string, number | string | boolean>;
  cooldownMinutes: number;
  targets: ProviderName[];
  severity: "info" | "warning" | "error";
}

export interface AutopilotSettings {
  enabled: boolean;
  rules: AutopilotRule[];
}

export interface AutopilotTrigger {
  rule: AutopilotRule;
  title: string;
  body: string;
  reason: string;
}

export interface AutopilotRunResult {
  checked: number;
  triggered: number;
  skipped: number;
  triggers: AutopilotTrigger[];
}

export function createDefaultAutopilotSettings(): AutopilotSettings {
  return {
    enabled: true,
    rules: [
      {
        id: "position-move-3pct",
        enabled: true,
        name: "持仓异动 ±3%",
        kind: "symbol_move",
        params: { thresholdPct: 3, usePositions: true },
        cooldownMinutes: 60,
        targets: [],
        severity: "warning",
      },
      {
        id: "fear-greed-extreme",
        enabled: true,
        name: "恐慌贪婪极端值",
        kind: "fear_greed_extreme",
        params: { low: 20, high: 80 },
        cooldownMinutes: 180,
        targets: [],
        severity: "warning",
      },
      {
        id: "news-burst",
        enabled: true,
        name: "新闻爆发",
        kind: "news_burst",
        params: { minItems: 5, windowMinutes: 90 },
        cooldownMinutes: 120,
        targets: [],
        severity: "info",
      },
    ],
  };
}
