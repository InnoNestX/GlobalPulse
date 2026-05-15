import { describe, expect, it } from "vitest";
import { capConfidence } from "../src/research/scoring/confidence";
import { buildEvidenceItems } from "../src/research/sources/news";
import { evaluateDataQuality } from "../src/research/validate/dataQuality";
import { defaultDecisionPolicy } from "../src/research/types/common";
import { renderResearchMarkdown } from "../src/research/render/markdown";
import { formatPlainText } from "../src/providers/format";
import type { StockPacket } from "../src/research/types/packet";
import type { ResearchReportJson } from "../src/research/types/report";

describe("research engine safety rules", () => {
  it("caps confidence when evidence is insufficient", () => {
    const confidence = capConfidence({
      confidence: 88,
      evidenceCount: 1,
      sourceGradeMax: "A",
      hasPrimarySource: true,
      dataQuality: {
        completeness_score: 95,
        freshness_score: 95,
        source_score: 90,
        consistency_score: 90,
        missing_fields: [],
        degrade_level: "none",
      },
      llmFailed: false,
      policy: defaultDecisionPolicy,
    });

    expect(confidence).toBeLessThanOrEqual(55);
  });

  it("caps confidence for C-grade evidence", () => {
    const confidence = capConfidence({
      confidence: 90,
      evidenceCount: 4,
      sourceGradeMax: "C",
      hasPrimarySource: false,
      dataQuality: {
        completeness_score: 95,
        freshness_score: 95,
        source_score: 40,
        consistency_score: 90,
        missing_fields: [],
        degrade_level: "none",
      },
      llmFailed: false,
      policy: defaultDecisionPolicy,
    });

    expect(confidence).toBeLessThanOrEqual(50);
  });

  it("deduplicates news and keeps C-grade sources out of conclusions", () => {
    const evidence = buildEvidenceItems([
      { title: "TSLA forum rumor says demand is changing", url: "https://example.com/a", source: "Hacker News", summary: "TSLA discussion" },
      { title: "TSLA forum rumor says demand is changing", url: "https://example.com/b", source: "Hacker News", summary: "TSLA discussion duplicate" },
    ], "us_stock", ["TSLA"]);

    expect(evidence).toHaveLength(1);
    expect(evidence[0]?.duplicate_count).toBe(2);
    expect(evidence[0]?.source_grade).toBe("C");
    expect(evidence[0]?.used_in_conclusion).toBe(false);
  });

  it("marks missing market data as degraded", () => {
    const quality = evaluateDataQuality({
      indices: [],
      universe: [],
      evidence: [],
      usages: [{ provider: "alpha", endpoint: "quote", success: false, latency_ms: 10, rate_limited: true }],
      requiredFields: [],
    });

    expect(quality.degrade_level).toBe("market_data_failed");
    expect(quality.missing_fields).toContain("market.indices");
  });
});

describe("research report deterministic templates", () => {
  it("renders US stock report in the locked final order without crypto contamination", () => {
    const body = renderResearchMarkdown(
      mockPacket("us_stock", "pre_open", [
        { symbol: "SPY", price: 739.32, change_pct: 0.15, source: "mock" },
        { symbol: "QQQ", price: 710.99, change_pct: 0.53, source: "mock" },
        { symbol: "DIA", price: 495.11, change_pct: -0.56, source: "mock" },
        { symbol: "IWM", price: 281.76, change_pct: -0.29, source: "mock" },
      ]),
      mockReport({ summary: "BTC 不应污染美股摘要。", newsTitle: "Fed policy supports growth stocks" }),
    );

    expect(body.split("\n")[0]).toBe("📊 **美股开盘前预判 (2026-05-15 20:30 北京时间)**");
    expect(body).toContain("| 指数/ETF | 价格 | 涨跌 | 状态 |");
    expect(body).toContain("| SPY | $739.32 | +0.15% 🟢 | 震荡偏强 |");
    expect(body).toContain("### 💡 市场状态判断");
    expect(body).toContain("### 🧪 数据质量与自动化诊断");
    expect(body.indexOf("### 🧪 数据质量与自动化诊断")).toBeGreaterThan(body.indexOf("### 📝 小结"));
    expect(body).toContain("暂无配置，已跳过个股/个币分析。");
    expect(body).not.toMatch(/\b(BTC|ETH|SOL|DOGE|XRP|Crypto Fear|funding rate|liquidation)\b/i);
  });

  it("renders A-share report with Chinese index names and filters overseas tech noise", () => {
    const body = renderResearchMarkdown(
      mockPacket("a_share", "intraday", [
        { symbol: "SH000001", name: "上证指数", price: 3123.45, change_pct: 0.25, source: "mock" },
        { symbol: "SZ399001", name: "深证成指", price: 10234.56, change_pct: -0.18, source: "mock" },
        { symbol: "SH000300", name: "沪深300", price: 3914.6, change_pct: -0.1, source: "mock" },
        { symbol: "SZ399006", name: "创业板指", price: 2123.45, change_pct: 0.42, source: "mock" },
      ]),
      mockReport({ newsTitle: "GitHub Trending MacBook RTX RAV4" }),
    );

    expect(body.split("\n")[0]).toBe("📊 **A股盘中监控 (2026-05-15 20:30 北京时间)**");
    expect(body).toContain("| 指数 | 点位 | 涨跌 | 状态 |");
    expect(body).toContain("| 上证指数 | 3,123.45 | +0.25% 🟢 | 震荡偏强 |");
    expect(body).not.toMatch(/GitHub Trending|Hacker News|RAV4|RTX|MacBook|BTC|ETH|SPY|QQQ/i);
  });

  it("renders crypto report with crypto-specific table and allows crypto diagnostics", () => {
    const body = renderResearchMarkdown(
      mockPacket("crypto", "post_close", [
        { symbol: "BTC", price: 103250, change_pct: 1.2, source: "mock" },
        { symbol: "ETH", price: 3820, change_pct: -0.35, source: "mock" },
        { symbol: "BNB", price: 690, change_pct: 0.18, source: "mock" },
      ]),
      mockReport({ summary: "加密市场短线震荡，BTC Dominance 与 funding rate 是关键变量。", newsTitle: "Bitcoin ETF inflow improves crypto liquidity" }),
    );

    expect(body.split("\n")[0]).toBe("📊 **加密日度复盘 (2026-05-15 20:30 北京时间)**");
    expect(body).toContain("| 资产 | 价格 | 24H涨跌 | 状态 |");
    expect(body).toContain("| BTC | $103,250 | +1.20% 🟢 | 偏强 |");
    expect(body).toMatch(/BTC Dominance|funding rate/);
    expect(body).not.toMatch(/上证指数|深证成指|SPY|QQQ/);
  });

  it("keeps the fixed template when market data is missing", () => {
    const body = renderResearchMarkdown(
      {
        ...mockPacket("a_share", "late_risk_check", []),
        data_quality: {
          completeness_score: 35,
          freshness_score: 40,
          source_score: 45,
          consistency_score: 60,
          missing_fields: ["market.indices"],
          degraded_reason: "A股行情接口失败",
          degrade_level: "market_data_failed",
        },
      },
      mockReport({ newsTitle: "A股成交额下降" }),
    );

    expect(body.split("\n")[0]).toBe("📊 **A股盘尾风险检查 (2026-05-15 20:30 北京时间)**");
    expect(body).toContain("| 上证指数 | 暂无 ⚠️ | 暂无 ⚠️ | 数据不足 |");
    expect(body).toContain("### 🧪 数据质量与自动化诊断");
    expect(body).toContain("- 缺失字段：market.indices");
  });

  it("does not prepend provider title text to locked research reports", () => {
    const body = renderResearchMarkdown(
      mockPacket("us_stock", "post_close", [
        { symbol: "SPY", price: 739.32, change_pct: 0.15, source: "mock" },
        { symbol: "QQQ", price: 710.99, change_pct: 0.53, source: "mock" },
        { symbol: "DIA", price: 495.11, change_pct: -0.56, source: "mock" },
        { symbol: "IWM", price: 281.76, change_pct: -0.29, source: "mock" },
      ]),
      mockReport({ newsTitle: "Fed policy supports growth stocks" }),
    );

    const plain = formatPlainText({
      title: "GlobalPulse",
      body,
      level: "info",
      actions: [],
      tags: [],
      metadata: {},
    });

    expect(plain.split("\n")[0]).toBe("📊 **美股收盘复盘 (2026-05-15 20:30 北京时间)**");
    expect(plain).not.toContain("[Info] GlobalPulse");
  });
});

function mockPacket(market: StockPacket["meta"]["market"], reportType: string, indices: StockPacket["market"]["indices"]): StockPacket {
  return {
    meta: {
      run_id: "test-run",
      asof_local: "2026-05-15 20:30",
      market,
      report_type: reportType,
      trading_session: "regular",
      timezone_local: "Asia/Shanghai",
    },
    macro: {
      rates: {},
      calendar: [],
      notes: market === "crypto"
        ? ["BTC Dominance、funding rate 与 open interest 是本轮加密波动关键。"]
        : ["宏观数据与资金状态共同影响风险偏好。"],
    },
    market: {
      report_type: market,
      indices,
      leaders: [
        { symbol: market === "crypto" ? "BTC" : market === "a_share" ? "SH600519" : "TSLA", price: 100, change_pct: 3.62, source: "mock" },
      ],
      losers: [
        { symbol: market === "crypto" ? "ETH" : market === "a_share" ? "SZ300750" : "MSFT", price: 100, change_pct: -1.04, source: "mock" },
      ],
      sentiment: { breadth: 0.2, average_change_pct: 0.18 },
    },
    stocks: [],
    news: [
      {
        id: "news-1",
        title: market === "a_share" ? "GitHub Trending MacBook RTX RAV4" : "Fed policy supports growth stocks",
        source: market === "a_share" ? "Hacker News" : "Reuters",
        source_grade: market === "a_share" ? "C" : "A",
        url: "https://example.com/news",
        used_in_conclusion: market !== "a_share",
        used_reason: "该新闻与市场风险偏好相关。",
        verification_status: "partially_verified",
        event_type: "macro",
        relevance_score: 80,
        canonical_event_id: "news-1",
        duplicate_count: 1,
        related_tickers: [],
      },
    ],
    data_quality: {
      completeness_score: 90,
      freshness_score: 88,
      source_score: 82,
      consistency_score: 86,
      missing_fields: [],
      degrade_level: "none",
    },
    api_usage: [{ provider: "mock", endpoint: "quotes", success: true, latency_ms: 1, rate_limited: false }],
    decision_policy: defaultDecisionPolicy,
    risk_profile: {
      max_position_pct: 0.1,
      max_loss_per_trade_pct: 0.005,
      max_daily_drawdown_pct: 0.02,
    },
  };
}

function mockReport(options: { summary?: string; newsTitle?: string }): ResearchReportJson {
  return {
    executive_summary: options.summary ?? "市场震荡分化，短线以观察为主。",
    market_view: {
      bias: "中性",
      confidence: 62,
      drivers: ["核心资产表现分化，需等待量能确认。"],
      macro_risks: ["宏观数据仍可能影响风险偏好。"],
    },
    stock_cards: [],
    news_review: [{
      title: options.newsTitle ?? "Fed policy supports growth stocks",
      source: "Reuters",
      source_grade: "A",
      used_in_conclusion: true,
      why: "该新闻解释了当前风险偏好的变化。",
    }],
    risk_actions: {
      positioning: "控制仓位，等待确认。",
      hedge_note: "必要时降低风险暴露。",
      watch_items_next_session: ["观察核心资产是否延续强势", "观察量能是否放大", "观察宏观数据是否扰动市场", "观察弱势资产是否止跌"],
    },
  };
}
