import type { Env } from "../../env";

export interface ResearchRunSummary {
  id: string;
  scheduleId: string;
  market: string;
  reportType: string;
  model: string;
  degradeLevel: string;
  createdAt: string;
}

export async function listResearchRuns(env: Env, limit = 20): Promise<ResearchRunSummary[]> {
  if (!env.RESEARCH_DB) return [];
  try {
    const result = await env.RESEARCH_DB.prepare(
      `SELECT id, schedule_id, market, report_type, model, degrade_level, created_at
       FROM research_runs
       ORDER BY created_at DESC
       LIMIT ?`,
    ).bind(Math.max(1, Math.min(50, limit))).all<{
      id: string;
      schedule_id: string;
      market: string;
      report_type: string;
      model: string;
      degrade_level: string;
      created_at: string;
    }>();

    return (result.results ?? []).map((row) => ({
      id: row.id,
      scheduleId: row.schedule_id,
      market: row.market,
      reportType: row.report_type,
      model: row.model,
      degradeLevel: row.degrade_level,
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.warn("listResearchRuns failed", error);
    return [];
  }
}
