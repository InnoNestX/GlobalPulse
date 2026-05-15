import type { Env } from "../../env";
import type { ApiUsageEntry } from "../types/common";
import type { StockPacket } from "../types/packet";
import type { ResearchReportJson } from "../types/report";
import type { LlmResult } from "../llm/provider";
import { hashString } from "../sources/rateLimiter";

export async function persistResearchRun(env: Env, packet: StockPacket, report: ResearchReportJson, llm: LlmResult, usages: ApiUsageEntry[]): Promise<void> {
  if (!env.RESEARCH_DB) return;
  const db = env.RESEARCH_DB;
  const now = new Date().toISOString();

  try {
    await db.batch([
      db.prepare(`INSERT OR REPLACE INTO research_runs (id, schedule_id, schedule_name, market, report_type, model, degrade_level, data_quality_json, api_usage_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(packet.meta.run_id, packet.meta.run_id.split(":")[0] ?? packet.meta.run_id, "", packet.meta.market, packet.meta.report_type, `${llm.provider}/${llm.model}`, packet.data_quality.degrade_level, JSON.stringify(packet.data_quality), JSON.stringify(usages), now),
      db.prepare(`INSERT OR REPLACE INTO research_ai_outputs (id, run_id, provider, model, prompt_hash, raw_output, parsed_output, is_valid_json, fallback_used, error_message, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(`${packet.meta.run_id}:ai`, packet.meta.run_id, llm.provider, llm.model, hashString(JSON.stringify(packet).slice(0, 4000)), llm.rawOutput, JSON.stringify(llm.parsedOutput), llm.fallbackUsed ? 0 : 1, llm.fallbackUsed ? 1 : 0, llm.errorMessage ?? "", now),
      db.prepare(`INSERT OR REPLACE INTO research_data_snapshots (id, run_id, snapshot_json, created_at)
        VALUES (?, ?, ?, ?)`)
        .bind(`${packet.meta.run_id}:snapshot`, packet.meta.run_id, JSON.stringify({ market: packet.market, macro: packet.macro, stocks: packet.stocks }), now),
    ]);

    for (const item of packet.news) {
      await db.prepare(`INSERT OR REPLACE INTO research_evidence (id, run_id, title, source, source_grade, url, published_at, ticker, used_in_conclusion, used_reason, verification_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(item.id, packet.meta.run_id, item.title, item.source, item.source_grade, item.url ?? "", item.published_at ?? "", item.ticker ?? "", item.used_in_conclusion ? 1 : 0, item.used_reason ?? "", item.verification_status, now)
        .run();
    }

    for (const stock of packet.stocks) {
      await db.prepare(`INSERT OR REPLACE INTO research_signals (id, run_id, ticker, macro_score, technical_score, news_score, momentum_score, risk_score, total_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(`${packet.meta.run_id}:signal:${stock.ticker}`, packet.meta.run_id, stock.ticker, stock.signals.macro, stock.signals.technical, stock.signals.news, stock.signals.momentum, stock.signals.risk, stock.signals.total, now)
        .run();
    }

    for (const card of report.stock_cards) {
      await db.prepare(`INSERT OR REPLACE INTO research_stock_cards (id, run_id, ticker, score_total, professional_view, short_term_bias, action_level, confidence, evidence_count, source_grade_max, card_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(`${packet.meta.run_id}:card:${card.ticker}`, packet.meta.run_id, card.ticker, card.score_total, card.professional_view, card.short_term_bias, card.action_level, card.confidence, card.evidence_count, card.source_grade_max, JSON.stringify(card), now)
        .run();
    }
  } catch (error) {
    console.warn("Research D1 persistence failed", error);
  }
}

