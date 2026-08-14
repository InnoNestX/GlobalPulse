import type { ReportType } from "../../config";
import type { EvidenceItem } from "../types/evidence";
import type { MarketQuote, StockResearchInput } from "../types/packet";
import type { SignalScores } from "../types/scoring";
import {
  computeFactors,
  scoreFromFactors,
  type DailyBar,
} from "./factors";

export function buildSignalScores(reportType: ReportType, quote: MarketQuote | undefined, evidence: EvidenceItem[], marketAverage: number): SignalScores {
  const momentum = clamp((quote?.change_pct ?? marketAverage) * 8, -35, 35);
  const news = clamp(evidence.reduce((sum, item) => sum + evidenceSentiment(item), 0) * 12, -30, 30);
  const technical = clamp((quote?.change_pct ?? 0) >= 0 ? 10 + Math.min(Math.abs(quote?.change_pct ?? 0) * 3, 18) : -10 - Math.min(Math.abs(quote?.change_pct ?? 0) * 3, 18), -28, 28);
  const macro = reportType === "crypto" ? 0 : clamp(marketAverage * 5, -20, 20);
  const risk = evidence.some((item) => /risk|lawsuit|监管|诉讼|调查|crash|drop/i.test(`${item.title} ${item.summary ?? ""}`)) ? -12 : 4;
  const total = clamp(50 + momentum + news + technical + macro + risk, 0, 100);
  return { macro, technical, news, momentum, risk, total };
}

/**
 * When daily bars are available, blend multifactor technicals into the
 * quote-only path. Without enough bars, falls back to {@link buildSignalScores}.
 */
export function buildSignalScoresWithBars(
  reportType: ReportType,
  quote: MarketQuote | undefined,
  evidence: EvidenceItem[],
  marketAverage: number,
  bars: DailyBar[] | undefined,
): SignalScores {
  const base = buildSignalScores(reportType, quote, evidence, marketAverage);
  if (!bars || bars.length < 20) return base;

  const market = reportType === "a_share" ? "CN" : "US";
  const factors = computeFactors(bars, {
    price: quote?.price,
    dayChangePct: quote?.change_pct,
    market,
  });
  const factorScore = scoreFromFactors(factors);
  const technical = clamp(factorScore - 50, -28, 28);
  const momentum = clamp(factors.momentum * 30, -35, 35);
  const total = clamp(50 + momentum + base.news + technical + base.macro + base.risk, 0, 100);
  return { ...base, technical, momentum, total };
}

export function buildStockInputs(symbols: string[], universe: MarketQuote[], evidence: EvidenceItem[], reportType: ReportType): StockResearchInput[] {
  const average = universe.length > 0 ? universe.reduce((sum, row) => sum + row.change_pct, 0) / universe.length : 0;
  return symbols.map((symbol) => {
    const quote = universe.find((row) => row.symbol.toUpperCase() === symbol.toUpperCase());
    const related = evidence.filter((item) => item.related_tickers.includes(symbol.toUpperCase()) || item.ticker === symbol.toUpperCase());
    const bars = quoteBars(quote);
    const market = reportType === "a_share" ? "CN" : "US";
    const multifactor =
      bars && bars.length >= 20
        ? (() => {
            const factors = computeFactors(bars, {
              price: quote?.price,
              dayChangePct: quote?.change_pct,
              market,
            });
            return { factors, score: scoreFromFactors(factors) };
          })()
        : undefined;
    const input: StockResearchInput = {
      ticker: symbol.toUpperCase(),
      timeframe: "swing",
      ...(quote ? { quote } : {}),
      technical: {
        change_pct: quote?.change_pct ?? "未指定",
        rsi14: "未指定",
        ma20: multifactor?.factors.detail.ma20 ?? "未指定",
        ma60: "未指定",
        multifactor_score: multifactor?.score ?? "未指定",
        multifactor_degraded: multifactor
          ? multifactor.factors.detail.degraded
            ? 1
            : 0
          : "未指定",
      },
      fundamental: { revenue_yoy: "未指定", eps_revision_30d: "未指定", pe_ntm: "未指定" },
      ownership: { institutional_change: "未指定", insider_change: "未指定", short_interest_pct_float: "未指定" },
      evidence: related,
      signals: buildSignalScoresWithBars(reportType, quote, related, average, bars),
    };
    if (quote?.name) {
      input.name = quote.name;
    }
    return input;
  });
}

/** Optional daily bars may be attached by market providers under `bars`. */
function quoteBars(quote: MarketQuote | undefined): DailyBar[] | undefined {
  return quote?.bars?.length ? quote.bars : undefined;
}

function evidenceSentiment(item: EvidenceItem): number {
  const text = `${item.title} ${item.summary ?? ""}`.toLowerCase();
  const positive = /beat|surge|rise|rally|upgrade|增长|利好|突破|上调|超预期/.test(text);
  const negative = /miss|fall|drop|downgrade|risk|lawsuit|下跌|利空|回撤|风险|诉讼/.test(text);
  if (positive && !negative) return 1;
  if (negative && !positive) return -1;
  return 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
