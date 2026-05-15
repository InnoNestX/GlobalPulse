import type { ActionLevel, ProfessionalView, ShortTermBias, SourceGrade } from "./common";

export interface ResearchStockCard {
  ticker: string;
  score_total: number;
  professional_view: ProfessionalView;
  short_term_bias: ShortTermBias;
  action_level: ActionLevel;
  confidence: number;
  timeframe: string;
  key_drivers: string[];
  valuation_note: string;
  technical_note: string;
  news_note: string;
  entry_rule: string;
  stop_rule: string;
  invalidation_rule: string;
  risk_note: string;
  evidence_count: number;
  source_grade_max: SourceGrade;
}

export interface ResearchReportJson {
  executive_summary: string;
  market_view: {
    bias: "偏多" | "中性" | "偏空";
    confidence: number;
    drivers: string[];
    macro_risks: string[];
  };
  stock_cards: ResearchStockCard[];
  news_review: Array<{
    title: string;
    source: string;
    source_grade: SourceGrade;
    used_in_conclusion: boolean;
    why: string;
  }>;
  risk_actions: {
    positioning: string;
    hedge_note: string;
    watch_items_next_session: string[];
  };
}

