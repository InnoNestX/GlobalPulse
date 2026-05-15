import type { ReportType } from "../../config";
import type { Env } from "../../env";
import type { TopicItem } from "../../sources";
import type { ApiUsageEntry } from "../types/common";
import type { MacroSnapshot } from "../types/packet";

export interface MacroDataResult {
  snapshot: MacroSnapshot;
  usages: ApiUsageEntry[];
}

type FredObservation = {
  value?: string;
  date?: string;
};

type FredSeriesResult = {
  latest?: number;
  latestDate?: string;
  previous?: number;
  yoy?: number;
};

const FRED_SERIES = {
  tenYearYield: "DGS10",
  twoYearYield: "DGS2",
  fedFunds: "DFF",
  vix: "VIXCLS",
  dollarIndex: "DTWEXBGS",
  unemploymentRate: "UNRATE",
  cpi: "CPIAUCSL",
};

export async function fetchMacroData(env: Env, reportType: ReportType, items: TopicItem[]): Promise<MacroDataResult> {
  const usages: ApiUsageEntry[] = [];
  const newsNotes = buildNewsMacroNotes(reportType, items);
  const fallbackNotes = buildDefaultMacroNotes(reportType);
  const rates: MacroSnapshot["rates"] = {};
  const calendar = buildMacroCalendar(items);

  if (!env.FRED_API_KEY) {
    return {
      snapshot: {
        rates: buildDefaultRateFields(reportType),
        calendar,
        notes: dedupeNotes([...newsNotes, ...fallbackNotes]),
      },
      usages: [apiUsage("macro", "news_and_market_context", true, 0, false)],
    };
  }

  const started = Date.now();
  try {
    const [tenYear, twoYear, fedFunds, vix, dollarIndex, unemployment, cpi] = await Promise.all([
      fetchFredSeries(env.FRED_API_KEY, FRED_SERIES.tenYearYield),
      fetchFredSeries(env.FRED_API_KEY, FRED_SERIES.twoYearYield),
      fetchFredSeries(env.FRED_API_KEY, FRED_SERIES.fedFunds),
      fetchFredSeries(env.FRED_API_KEY, FRED_SERIES.vix),
      fetchFredSeries(env.FRED_API_KEY, FRED_SERIES.dollarIndex),
      fetchFredSeries(env.FRED_API_KEY, FRED_SERIES.unemploymentRate),
      fetchFredSeries(env.FRED_API_KEY, FRED_SERIES.cpi, 13),
    ]);

    setRate(rates, "美国10年期国债收益率", tenYear.latest);
    setRate(rates, "美国2年期国债收益率", twoYear.latest);
    setRate(rates, "美联储有效联邦基金利率", fedFunds.latest);
    setRate(rates, "VIX波动率指数", vix.latest);
    setRate(rates, "美元广义指数", dollarIndex.latest);
    setRate(rates, "美国失业率", unemployment.latest);
    setRate(rates, "美国CPI同比", cpi.yoy);

    const notes = dedupeNotes([
      ...newsNotes,
      ...buildFredMacroNotes(reportType, { tenYear, twoYear, fedFunds, vix, dollarIndex, unemployment, cpi }),
      ...fallbackNotes,
    ]).slice(0, 6);

    usages.push(apiUsage("fred", "macro_series_bundle", true, Date.now() - started, false));
    return { snapshot: { rates, calendar, notes }, usages };
  } catch (error) {
    usages.push(apiUsage("fred", "macro_series_bundle", false, Date.now() - started, isRateLimitError(error), error instanceof Error ? error.message.slice(0, 220) : "unknown error"));
    return {
      snapshot: {
        rates: buildDefaultRateFields(reportType),
        calendar,
        notes: dedupeNotes([...newsNotes, ...fallbackNotes]),
      },
      usages,
    };
  }
}

async function fetchFredSeries(apiKey: string, seriesId: string, limit = 2): Promise<FredSeriesResult> {
  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", String(limit));
  const response = await fetch(url.toString(), { headers: jsonHeaders() });
  const text = await response.text();
  if (!response.ok) throw new Error(`FRED ${seriesId} HTTP ${response.status}: ${text.slice(0, 120)}`);
  const payload = JSON.parse(text) as { observations?: FredObservation[]; error_message?: string };
  if (payload.error_message) throw new Error(`FRED ${seriesId}: ${payload.error_message.slice(0, 160)}`);
  const observations = (payload.observations ?? [])
    .map((item) => ({ value: Number(item.value), date: item.date }))
    .filter((item) => Number.isFinite(item.value) && item.date);
  const latest = observations[0];
  const previous = observations[1];
  const yearAgo = observations.find((_, index) => index >= 11) ?? observations.at(-1);
  const result: FredSeriesResult = {};
  if (latest) {
    result.latest = latest.value;
    result.latestDate = latest.date;
  }
  if (previous) result.previous = previous.value;
  if (latest && yearAgo && yearAgo.value !== 0 && observations.length >= 12) {
    result.yoy = ((latest.value - yearAgo.value) / yearAgo.value) * 100;
  }
  return result;
}

function buildNewsMacroNotes(reportType: ReportType, items: TopicItem[]): string[] {
  const text = items.map((item) => `${item.title}\n${item.summary ?? ""}`).join("\n").toLowerCase();
  const notes: string[] = [];
  if (/fed|fomc|powell|美联储|降息|加息|利率/.test(text)) notes.push("新闻线索显示利率与央行预期仍是主要宏观变量。利率上行通常压制成长股估值，利率下行通常改善风险偏好。");
  if (/cpi|ppi|pce|通胀|inflation/.test(text)) notes.push("新闻线索显示通胀数据仍会影响市场对降息节奏和估值水平的判断。");
  if (/就业|非农|job|payroll|unemployment/.test(text)) notes.push("就业数据会影响美联储政策预期，强就业通常推高利率压力，弱就业则可能增加宽松预期。 ");
  if (/美元|汇率|人民币|dollar|usd|dxy/.test(text)) notes.push("汇率与美元走势会影响外资风险偏好、商品价格以及跨市场资金流向。");
  if (reportType === "a_share" && /政策|刺激|财政|货币|央行|降准|贷款/.test(text)) notes.push("A股宏观主线需要关注政策预期、流动性和财政发力节奏。 ");
  if (reportType === "crypto" && /liquidity|流动性|etf|资金费率|funding|open interest|清算/.test(text)) notes.push("加密市场对全球流动性、ETF资金流和杠杆指标更敏感。 ");
  return notes;
}

function buildDefaultMacroNotes(reportType: ReportType): string[] {
  if (reportType === "a_share") {
    return [
      "A股宏观观察重点：国内政策预期、人民币汇率、海外利率、成交额和北向资金会共同影响风险偏好。",
      "当政策预期改善且成交额放大时，指数反弹更容易延续；若汇率承压或成交缩量，市场更容易转为结构性轮动。",
    ];
  }
  if (reportType === "crypto") {
    return [
      "加密市场宏观观察重点：美元流动性、美债收益率、ETF资金流、BTC Dominance、资金费率和未平仓合约。",
      "当美元走弱、利率下行且杠杆不过热时，风险资产更容易扩张；若资金费率过热或未平仓合约快速上升，需要警惕剧烈波动。",
    ];
  }
  return [
    "美股宏观观察重点：美债收益率、美元指数、通胀数据、就业数据和美联储政策预期。",
    "当利率下行且美元不强时，成长股和科技股通常更受益；若利率上行或通胀反复，估值压力会增加。",
  ];
}

function buildFredMacroNotes(reportType: ReportType, data: Record<string, FredSeriesResult>): string[] {
  const notes: string[] = [];
  const tenYear = data.tenYear.latest;
  const twoYear = data.twoYear.latest;
  const fedFunds = data.fedFunds.latest;
  const vix = data.vix.latest;
  const dollar = data.dollarIndex.latest;
  const unemployment = data.unemployment.latest;
  const cpiYoy = data.cpi.yoy;

  if (Number.isFinite(tenYear)) {
    notes.push(`美国10年期国债收益率约 ${formatMetric(tenYear)}%，是估值和风险偏好的核心锚。收益率上行通常压制科技成长股，收益率下行通常改善风险偏好。`);
  }
  if (Number.isFinite(tenYear) && Number.isFinite(twoYear)) {
    const spread = Number(tenYear) - Number(twoYear);
    notes.push(`美债10Y-2Y利差约 ${spread.toFixed(2)} 个百分点，用于观察经济周期预期和衰退担忧。`);
  }
  if (Number.isFinite(fedFunds)) {
    notes.push(`有效联邦基金利率约 ${formatMetric(fedFunds)}%，用于衡量当前美元资金成本。`);
  }
  if (Number.isFinite(cpiYoy)) {
    notes.push(`美国CPI同比约 ${formatMetric(cpiYoy)}%，通胀回落有利于降息预期，通胀反复会抬升估值压力。`);
  }
  if (Number.isFinite(unemployment)) {
    notes.push(`美国失业率约 ${formatMetric(unemployment)}%，就业走弱会提高宽松预期，但也可能带来增长担忧。`);
  }
  if (Number.isFinite(vix)) {
    notes.push(`VIX约 ${formatMetric(vix)}，${Number(vix) >= 20 ? "市场避险情绪偏高，需要控制仓位。" : "市场波动压力相对可控，但仍需观察突发事件。"}`);
  }
  if (Number.isFinite(dollar)) {
    notes.push(`美元广义指数约 ${formatMetric(dollar)}，美元走强通常压制风险资产和非美市场流动性。`);
  }

  if (reportType === "a_share") notes.push("结合A股特性，还需要同步观察人民币汇率、北向资金、成交额和政策预期。 ");
  if (reportType === "crypto") notes.push("结合加密市场特性，还需要同步观察资金费率、未平仓合约、ETF资金流和稳定币流动性。 ");
  return notes;
}

function buildMacroCalendar(items: TopicItem[]): MacroSnapshot["calendar"] {
  const text = items.map((item) => `${item.title}\n${item.summary ?? ""}`).join("\n").toLowerCase();
  const events: MacroSnapshot["calendar"] = [];
  if (/fomc|fed|美联储|powell/.test(text)) events.push({ event: "美联储/FOMC相关事件", source: "news", source_grade: "B" });
  if (/cpi|ppi|pce|通胀/.test(text)) events.push({ event: "通胀数据相关事件", source: "news", source_grade: "B" });
  if (/非农|就业|payroll|unemployment/.test(text)) events.push({ event: "就业数据相关事件", source: "news", source_grade: "B" });
  return events.slice(0, 5);
}

function buildDefaultRateFields(reportType: ReportType): MacroSnapshot["rates"] {
  if (reportType === "a_share") {
    return {
      国内政策预期: "未指定",
      人民币汇率压力: "未指定",
      海外利率压力: "未指定",
      市场成交额状态: "未指定",
    };
  }
  if (reportType === "crypto") {
    return {
      美元流动性: "未指定",
      美债收益率压力: "未指定",
      杠杆热度: "未指定",
      ETF资金流: "未指定",
    };
  }
  return {
    美国10年期国债收益率: "未指定",
    美元指数压力: "未指定",
    通胀压力: "未指定",
    美联储政策预期: "未指定",
  };
}

function setRate(rates: MacroSnapshot["rates"], key: string, value: number | undefined): void {
  rates[key] = Number.isFinite(value) ? Number(Number(value).toFixed(2)) : "未指定";
}

function dedupeNotes(notes: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const note of notes.map((item) => item.replace(/\s+/g, " ").trim()).filter(Boolean)) {
    if (seen.has(note)) continue;
    seen.add(note);
    result.push(note);
  }
  return result;
}

function formatMetric(value: number | undefined): string {
  return Number.isFinite(value) ? Number(value).toFixed(2) : "未指定";
}

function apiUsage(provider: string, endpoint: string, success: boolean, latencyMs: number, rateLimited: boolean, message?: string): ApiUsageEntry {
  const entry: ApiUsageEntry = { provider, endpoint, success, latency_ms: latencyMs, rate_limited: rateLimited };
  if (message) entry.message = message;
  return entry;
}

function jsonHeaders(): Record<string, string> {
  return { "Accept": "application/json,text/plain,*/*", "User-Agent": "Mozilla/5.0 (compatible; GlobalPulse/1.0; +https://github.com/InnoNestX/GlobalPulse)" };
}

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /429|rate|limit|too many|forbidden|HTTP 403/i.test(message);
}
