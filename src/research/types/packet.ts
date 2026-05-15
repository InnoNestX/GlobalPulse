import type { ReportType } from "../../config";
import type { ApiUsageEntry, DataQuality, DecisionPolicy, ResearchMeta } from "./common";
import type { EvidenceItem } from "./evidence";
import type { SignalScores } from "./scoring";

export interface MarketQuote {
  symbol: string;
  name?: string;
  price: number;
  change_pct: number;
  volume_ratio?: number;
  source: string;
}

export interface MacroSnapshot {
  rates: Record<string, number | "未指定">;
  calendar: Array<{
    event: string;
    source: string;
    source_grade: string;
    release_time?: string;
  }>;
  notes: string[];
}

export interface StockResearchInput {
  ticker: string;
  name?: string;
  timeframe: "intraday" | "swing" | "medium" | "long";
  quote?: MarketQuote;
  technical: Record<string, number | "未指定">;
  fundamental: Record<string, number | string>;
  ownership: Record<string, number | string>;
  evidence: EvidenceItem[];
  signals: SignalScores;
}

export interface StockPacket {
  meta: ResearchMeta;
  macro: MacroSnapshot;
  market: {
    report_type: ReportType;
    indices: MarketQuote[];
    leaders: MarketQuote[];
    losers: MarketQuote[];
    sentiment: Record<string, number | string>;
  };
  stocks: StockResearchInput[];
  news: EvidenceItem[];
  data_quality: DataQuality;
  api_usage?: ApiUsageEntry[];
  decision_policy: DecisionPolicy;
  risk_profile: {
    max_position_pct: number;
    max_loss_per_trade_pct: number;
    max_daily_drawdown_pct: number;
  };
}
