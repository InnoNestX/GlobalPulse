import type { ReportType } from "../../config";
import type { TopicItem } from "../../sources";
import { normalizeTicker } from "../normalize/ticker";
import type { EvidenceItem, EventType } from "../types/evidence";
import type { SourceGrade } from "../types/common";

export function buildEvidenceItems(items: TopicItem[], reportType: ReportType, symbols: string[]): EvidenceItem[] {
  const normalizedSymbols = symbols.map((symbol) => normalizeTicker(symbol, reportType)).filter(Boolean);
  const seen = new Map<string, EvidenceItem>();

  for (const item of items) {
    const title = item.title.trim();
    if (!title) continue;
    const canonical = canonicalEventId(title);
    const existing = seen.get(canonical);
    const related = normalizedSymbols.filter((symbol) => containsSymbol(`${title}\n${item.summary ?? ""}`, symbol));
    const grade = gradeSource(item.source ?? item.category ?? "");
    const evidence: EvidenceItem = {
      id: `${canonical}:${seen.size}`,
      title,
      source: item.source ?? "Unknown",
      source_grade: grade,
      ...(item.url ? { url: item.url } : {}),
      ...(item.publishedAt ? { published_at: item.publishedAt } : {}),
      ...(related[0] ? { ticker: related[0] } : {}),
      ...(item.summary ? { summary: item.summary } : {}),
      used_in_conclusion: grade !== "C" && related.length > 0,
      used_reason: grade === "C"
        ? "C级来源仅进入新闻复核，不单独进入结论。"
        : related.length > 0
          ? `新闻直接关联 ${related.join("、")}，可进入对应标的证据链。`
          : "未命中关注/持仓标的，仅作为市场背景。",
      verification_status: grade === "S" || grade === "A" ? "partially_verified" : "unverified",
      event_type: classifyEventType(title, item.summary),
      relevance_score: scoreRelevance(item, related.length),
      canonical_event_id: canonical,
      duplicate_count: 1,
      related_tickers: related,
    };

    if (existing) {
      existing.duplicate_count += 1;
      existing.related_tickers = Array.from(new Set([...existing.related_tickers, ...related]));
      existing.relevance_score = Math.max(existing.relevance_score, evidence.relevance_score);
      if (gradeRank(evidence.source_grade) < gradeRank(existing.source_grade)) {
        existing.source_grade = evidence.source_grade;
        existing.source = evidence.source;
        if (evidence.used_reason) {
          existing.used_reason = evidence.used_reason;
        }
      }
    } else {
      seen.set(canonical, evidence);
    }
  }

  return Array.from(seen.values())
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, 24);
}

export function gradeSource(source: string): SourceGrade {
  const lower = source.toLowerCase();
  if (/hacker news|github|reddit|x\.com|twitter|stocktwits|forum|社区|论坛|爆料/.test(lower)) return "C";
  if (/sec|edgar|fred|bls|bea|fed|fomc|exchange|ir|公告|交易所|巨潮/.test(lower)) return "S";
  if (/reuters|bloomberg|wsj|cnbc|marketwatch|alpha|finnhub|fmp/.test(lower)) return "A";
  if (/sina|finance|证券|财联社|eastmoney|google news|news/.test(lower)) return "B";
  return "C";
}

function canonicalEventId(title: string): string {
  return title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "event";
}

function containsSymbol(text: string, symbol: string): boolean {
  return text.toUpperCase().includes(symbol.toUpperCase());
}

function classifyEventType(title: string, summary?: string): EventType {
  const text = `${title}\n${summary ?? ""}`.toLowerCase();
  if (/earnings|eps|财报|业绩/.test(text)) return "earnings";
  if (/guidance|指引|预期/.test(text)) return "guidance";
  if (/fed|cpi|ppi|gdp|pce|macro|通胀|利率|降息|宏观/.test(text)) return "macro";
  if (/policy|监管|政策|sec|证监/.test(text)) return "policy";
  if (/sector|industry|板块|行业/.test(text)) return "sector";
  if (/analyst|rating|target price|评级|目标价/.test(text)) return "analyst";
  if (/insider|form 4|减持|增持/.test(text)) return "insider";
  if (/lawsuit|litigation|诉讼|调查/.test(text)) return "litigation";
  if (/product|launch|发布|产品/.test(text)) return "product";
  return "other";
}

function scoreRelevance(item: TopicItem, relatedCount: number): number {
  const recency = item.publishedAt && Number.isFinite(Date.parse(item.publishedAt))
    ? Math.max(0, 30 - ((Date.now() - Date.parse(item.publishedAt)) / (1000 * 60 * 60)))
    : 6;
  const source = gradeSource(item.source ?? "");
  return Math.round(Math.min(100, relatedCount * 28 + recency + (4 - gradeRank(source)) * 10 + (item.score ?? 0) / 20));
}

function gradeRank(grade: SourceGrade): number {
  return { S: 0, A: 1, B: 2, C: 3 }[grade];
}
