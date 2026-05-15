import type { Env } from "../../env";
import type { ReportType } from "../../config";
import { dedupeSymbols, normalizeAShareCode, toCryptoPair } from "../normalize/ticker";
import type { ApiUsageEntry } from "../types/common";
import type { MarketQuote } from "../types/packet";

export interface MarketDataResult {
  indices: MarketQuote[];
  universe: MarketQuote[];
  usages: ApiUsageEntry[];
}

type MarketEnv = Env & {
  ALPHA_VANTAGE_API_KEY?: string;
  FINNHUB_API_KEY?: string;
  TWELVE_DATA_API_KEY?: string;
  COINGECKO_API_KEY?: string;
};

type QuoteSource = {
  provider: string;
  endpoint: string;
  fetcher: (symbols: string[]) => Promise<MarketQuote[]>;
  requiresKey?: keyof MarketEnv;
};

type QuoteCoveragePredicate = (rows: MarketQuote[]) => boolean;

const MIN_QUOTE_COVERAGE = 0.85;
const US_POOL = ["SPY", "QQQ", "DIA", "IWM", "XLK", "SMH", "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "AMD"];
const A_POOL = ["sh000001", "sz399001", "sh000300", "sz399006", "sh600519", "sz000858", "sh601318", "sh600036", "sz300750", "sh688981", "sz002594", "sz300059", "sh600030"];
const CRYPTO_POOL = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT", "AVAXUSDT", "LINKUSDT", "TONUSDT", "PEPEUSDT"];

export async function fetchMarketData(env: Env, reportType: ReportType, focus: string[], positions: string[]): Promise<MarketDataResult> {
  const marketEnv = env as MarketEnv;
  if (reportType === "crypto") return fetchCryptoMarket(marketEnv, focus, positions);
  if (reportType === "a_share") return fetchAShareMarket(marketEnv, focus, positions);
  return fetchUsMarket(marketEnv, focus, positions);
}

async function fetchUsMarket(env: MarketEnv, focus: string[], positions: string[]): Promise<MarketDataResult> {
  const symbols = dedupeSymbols([...US_POOL, ...focus, ...positions]).slice(0, 18);
  const indexSet = new Set(["SPY", "QQQ", "DIA", "IWM"]);
  const { rows, usages } = await fetchWithFallback(symbols, [
    { provider: "twelve_data", endpoint: "quote", fetcher: (items) => fetchTwelveDataUsQuotes(env, items), requiresKey: "TWELVE_DATA_API_KEY" },
    { provider: "stooq", endpoint: "quote_csv", fetcher: fetchStooqUsQuotes },
    { provider: "finnhub", endpoint: "quote_limited", fetcher: (items) => fetchFinnhubUsQuotes(env, items), requiresKey: "FINNHUB_API_KEY" },
    { provider: "alpha_vantage", endpoint: "global_quote_limited", fetcher: (items) => fetchAlphaVantageUsQuotes(env, items), requiresKey: "ALPHA_VANTAGE_API_KEY" },
    { provider: "yahoo", endpoint: "chart_quote_limited", fetcher: fetchYahooChartUsQuotes },
    { provider: "yahoo", endpoint: "finance_quote", fetcher: fetchYahooUsQuotes },
  ], env, (rows) => hasCoreUsCoverage(rows, indexSet));
  return { indices: rows.filter((row) => indexSet.has(row.symbol.toUpperCase())), universe: rows, usages };
}

async function fetchAShareMarket(env: MarketEnv, focus: string[], positions: string[]): Promise<MarketDataResult> {
  const symbols = dedupeSymbols([...A_POOL, ...focus, ...positions]).map((symbol) => normalizeAShareCode(symbol) ?? symbol).slice(0, 60);
  const { rows, usages } = await fetchWithFallback(symbols, [
    { provider: "eastmoney", endpoint: "push2_ulist", fetcher: fetchEastmoneyAQuotes },
    { provider: "sina", endpoint: "a_share_simple_quotes", fetcher: fetchSinaAQuotes },
    { provider: "tencent", endpoint: "a_share_quotes", fetcher: fetchTencentAQuotes },
    { provider: "twelve_data", endpoint: "quote_cn", fetcher: (items) => fetchTwelveDataAShareQuotes(env, items), requiresKey: "TWELVE_DATA_API_KEY" },
    { provider: "alpha_vantage", endpoint: "global_quote_cn", fetcher: (items) => fetchAlphaVantageAShareQuotes(env, items), requiresKey: "ALPHA_VANTAGE_API_KEY" },
  ], env);
  const indexSet = new Set(["SH000001", "SZ399001", "SH000300", "SZ399006"]);
  return { indices: rows.filter((row) => indexSet.has(row.symbol.toUpperCase())), universe: rows, usages };
}

async function fetchCryptoMarket(env: MarketEnv, focus: string[], positions: string[]): Promise<MarketDataResult> {
  const symbols = dedupeSymbols([...CRYPTO_POOL, ...focus.map(toCryptoPair), ...positions.map(toCryptoPair)]).slice(0, 30);
  let rows: MarketQuote[] = [];
  const usages: ApiUsageEntry[] = [];
  const providers = [
    async () => fetchBinanceQuotes(symbols),
    async () => fetchCoingeckoQuotes(env, symbols),
    async () => fetchTwelveDataCryptoQuotes(env, symbols),
    async () => fetchAlternativeMeQuotes(symbols),
  ];
  for (const provider of providers) {
    const result = await provider();
    usages.push(result.usage);
    rows = mergeQuoteRows(rows, result.rows);
    if (quoteCoverage(rows, symbols) >= MIN_QUOTE_COVERAGE) break;
  }
  return { indices: rows.filter((row) => ["BTC", "ETH", "SOL", "DOGE"].includes(row.symbol.toUpperCase())), universe: rows, usages };
}

async function fetchWithFallback(
  symbols: string[],
  sources: QuoteSource[],
  env: MarketEnv,
  isCoverageEnough?: QuoteCoveragePredicate,
): Promise<{ rows: MarketQuote[]; usages: ApiUsageEntry[] }> {
  let rows: MarketQuote[] = [];
  const usages: ApiUsageEntry[] = [];
  const hasEnoughCoverage = () => isCoverageEnough ? isCoverageEnough(rows) : quoteCoverage(rows, symbols) >= MIN_QUOTE_COVERAGE;
  for (const source of sources) {
    const started = Date.now();
    if (source.requiresKey && !env[source.requiresKey]) {
      continue;
    }
    try {
      const missing = symbols.filter((symbol) => !hasQuote(rows, symbol));
      const fetched = await source.fetcher(missing.length ? missing : symbols);
      rows = mergeQuoteRows(rows, fetched);
      usages.push(apiUsage(source.provider, source.endpoint, fetched.length > 0, Date.now() - started, false, fetched.length > 0 ? undefined : "empty result"));
      if (hasEnoughCoverage()) break;
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 220) : "unknown error";
      usages.push(apiUsage(source.provider, source.endpoint, false, Date.now() - started, isRateLimitError(error), message));
    }
  }
  return { rows: sanitizeQuotes(rows), usages };
}

async function fetchAlphaVantageUsQuotes(env: MarketEnv, symbols: string[]): Promise<MarketQuote[]> {
  const rows: MarketQuote[] = [];
  for (const symbol of symbols.slice(0, 5)) {
    const quote = await fetchAlphaVantageGlobalQuote(env, symbol);
    if (quote) rows.push(quote);
  }
  return sanitizeQuotes(rows);
}

async function fetchAlphaVantageAShareQuotes(env: MarketEnv, symbols: string[]): Promise<MarketQuote[]> {
  const rows: MarketQuote[] = [];
  for (const symbol of symbols.slice(0, 8)) {
    for (const candidate of toAlphaVantageAShareSymbols(symbol)) {
      const quote = await fetchAlphaVantageGlobalQuote(env, candidate, symbol);
      if (quote) {
        rows.push(withOptionalName({ ...quote, symbol: symbol.toUpperCase() }, resolveAShareDisplayName(symbol, quote.name)));
        break;
      }
    }
  }
  return sanitizeQuotes(rows);
}

async function fetchAlphaVantageGlobalQuote(env: MarketEnv, apiSymbol: string, displaySymbol = apiSymbol): Promise<MarketQuote | undefined> {
  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "GLOBAL_QUOTE");
  url.searchParams.set("symbol", apiSymbol);
  url.searchParams.set("apikey", env.ALPHA_VANTAGE_API_KEY ?? "");
  const payload = await fetch(url.toString(), { headers: jsonHeaders() }).then(assertJsonResponse) as { "Global Quote"?: Record<string, string>; Note?: string; Information?: string };
  if (payload.Note || payload.Information) throw new Error(`Alpha Vantage: ${(payload.Note ?? payload.Information ?? "rate limited").slice(0, 160)}`);
  const quote = payload["Global Quote"] ?? {};
  const price = Number(quote["05. price"]);
  const change = Number(String(quote["10. change percent"] ?? "").replace("%", ""));
  if (!Number.isFinite(price) || !Number.isFinite(change)) return undefined;
  return { symbol: displaySymbol.toUpperCase(), price, change_pct: change, source: "Alpha Vantage" };
}

async function fetchFinnhubUsQuotes(env: MarketEnv, symbols: string[]): Promise<MarketQuote[]> {
  const rows: MarketQuote[] = [];
  for (const symbol of symbols.slice(0, 6)) {
    const url = new URL("https://finnhub.io/api/v1/quote");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("token", env.FINNHUB_API_KEY ?? "");
    const payload = await fetch(url.toString(), { headers: jsonHeaders() }).then(assertJsonResponse) as { c?: number; pc?: number };
    const price = Number(payload.c);
    const previousClose = Number(payload.pc);
    if (!Number.isFinite(price) || !Number.isFinite(previousClose) || previousClose <= 0) continue;
    rows.push({ symbol: symbol.toUpperCase(), price, change_pct: ((price - previousClose) / previousClose) * 100, source: "Finnhub" });
  }
  return sanitizeQuotes(rows);
}

async function fetchTwelveDataUsQuotes(env: MarketEnv, symbols: string[]): Promise<MarketQuote[]> {
  const rows: MarketQuote[] = [];
  for (const chunk of chunkArray(symbols.slice(0, 18), 8)) {
    const url = new URL("https://api.twelvedata.com/quote");
    url.searchParams.set("symbol", chunk.join(","));
    url.searchParams.set("apikey", env.TWELVE_DATA_API_KEY ?? "");
    const payload = await fetch(url.toString(), { headers: jsonHeaders() }).then(assertJsonResponse) as Record<string, unknown>;
    rows.push(...parseTwelveDataQuotePayload(payload, chunk));
  }
  return sanitizeQuotes(rows);
}

async function fetchTwelveDataAShareQuotes(env: MarketEnv, symbols: string[]): Promise<MarketQuote[]> {
  const rows: MarketQuote[] = [];
  for (const chunk of chunkArray(symbols.slice(0, 16), 8)) {
    const url = new URL("https://api.twelvedata.com/quote");
    url.searchParams.set("symbol", chunk.map(toTwelveDataAShareSymbol).join(","));
    url.searchParams.set("apikey", env.TWELVE_DATA_API_KEY ?? "");
    const payload = await fetch(url.toString(), { headers: jsonHeaders() }).then(assertJsonResponse) as Record<string, unknown>;
    rows.push(...parseTwelveDataQuotePayload(payload, chunk, (symbol) => symbol.toUpperCase(), true));
  }
  return sanitizeQuotes(rows);
}

async function fetchTwelveDataCryptoQuotes(env: MarketEnv, symbols: string[]): Promise<{ rows: MarketQuote[]; usage: ApiUsageEntry }> {
  const started = Date.now();
  try {
    if (!env.TWELVE_DATA_API_KEY) throw new Error("missing TWELVE_DATA_API_KEY");
    const pairs = symbols.slice(0, 16).map((symbol) => `${symbol.replace(/USDT$/i, "")}/USD`);
    const rows: MarketQuote[] = [];
    for (const chunk of chunkArray(pairs, 8)) {
      const url = new URL("https://api.twelvedata.com/quote");
      url.searchParams.set("symbol", chunk.join(","));
      url.searchParams.set("apikey", env.TWELVE_DATA_API_KEY);
      const payload = await fetch(url.toString(), { headers: jsonHeaders() }).then(assertJsonResponse) as Record<string, unknown>;
      rows.push(...parseTwelveDataQuotePayload(payload, chunk, (symbol) => symbol.replace(/\/USD$/i, "")));
    }
    return { rows: sanitizeQuotes(rows), usage: apiUsage("twelve_data", "quote_crypto", rows.length > 0, Date.now() - started, false, rows.length ? undefined : "empty result") };
  } catch (error) {
    return { rows: [], usage: apiUsage("twelve_data", "quote_crypto", false, Date.now() - started, isRateLimitError(error), error instanceof Error ? error.message.slice(0, 220) : "unknown error") };
  }
}

async function fetchBinanceQuotes(symbols: string[]): Promise<{ rows: MarketQuote[]; usage: ApiUsageEntry }> {
  const started = Date.now();
  try {
    const url = new URL("https://api.binance.com/api/v3/ticker/24hr");
    url.searchParams.set("symbols", JSON.stringify(symbols.slice(0, 30)));
    const payload = await fetch(url.toString(), { headers: userAgentHeaders() }).then(assertJsonResponse) as Array<{ symbol?: string; lastPrice?: string; priceChangePercent?: string }>;
    const rows = payload.flatMap((entry): MarketQuote[] => {
      const symbol = entry.symbol?.toUpperCase();
      const price = Number(entry.lastPrice);
      const change = Number(entry.priceChangePercent);
      if (!symbol || !Number.isFinite(price) || !Number.isFinite(change)) return [];
      return [{ symbol: symbol.replace(/USDT$/, ""), price, change_pct: change, source: "Binance" }];
    });
    return { rows, usage: apiUsage("binance", "ticker_24hr", rows.length > 0, Date.now() - started, false, rows.length ? undefined : "empty result") };
  } catch (error) {
    return { rows: [], usage: apiUsage("binance", "ticker_24hr", false, Date.now() - started, isRateLimitError(error), error instanceof Error ? error.message.slice(0, 220) : "unknown error") };
  }
}

async function fetchYahooUsQuotes(symbols: string[]): Promise<MarketQuote[]> {
  const rows: MarketQuote[] = [];
  for (const chunk of chunkArray(symbols.slice(0, 18), 18)) {
    const url = new URL("https://query1.finance.yahoo.com/v7/finance/quote");
    url.searchParams.set("symbols", chunk.join(","));
    const payload = await fetch(url.toString(), { headers: jsonHeaders() }).then(assertJsonResponse) as { quoteResponse?: { result?: Array<Record<string, unknown>> } };
    const result = payload.quoteResponse?.result ?? [];
    rows.push(...result.flatMap((entry): MarketQuote[] => {
      const symbol = String(entry.symbol ?? "").toUpperCase();
      const price = Number(entry.regularMarketPrice);
      const change = Number(entry.regularMarketChangePercent);
      if (!symbol || !Number.isFinite(price) || !Number.isFinite(change)) return [];
      return [withOptionalName({ symbol: symbol.split(".")[0] ?? symbol, price, change_pct: change, source: "Yahoo Finance" }, sanitizeUsDisplayName(typeof entry.shortName === "string" ? entry.shortName : symbol, symbol))];
    }));
  }
  return sanitizeQuotes(rows);
}

async function fetchYahooChartUsQuotes(symbols: string[]): Promise<MarketQuote[]> {
  const rows: MarketQuote[] = [];
  const candidates = dedupeSymbols(["SPY", "QQQ", "DIA", "IWM", ...symbols]).slice(0, 6);
  for (const symbol of candidates) {
    const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
    url.searchParams.set("range", "5d");
    url.searchParams.set("interval", "1d");
    const payload = await fetch(url.toString(), { headers: jsonHeaders() }).then(assertJsonResponse) as { chart?: { result?: Array<{ meta?: Record<string, unknown>; indicators?: { quote?: Array<{ close?: Array<number | null> }> } }> } };
    const result = payload.chart?.result?.[0];
    const meta = result?.meta ?? {};
    const price = Number(meta.regularMarketPrice);
    const previousClose = Number(meta.previousClose ?? meta.chartPreviousClose);
    if (Number.isFinite(price) && Number.isFinite(previousClose) && previousClose > 0) {
      rows.push({ symbol: symbol.toUpperCase(), price, change_pct: ((price - previousClose) / previousClose) * 100, source: "Yahoo Chart" });
      continue;
    }
    const closes = result?.indicators?.quote?.[0]?.close?.filter((value): value is number => typeof value === "number" && Number.isFinite(value)) ?? [];
    const last = closes.at(-1);
    const prev = closes.at(-2);
    if (typeof last === "number" && typeof prev === "number" && Number.isFinite(last) && Number.isFinite(prev) && prev > 0) {
      rows.push({ symbol: symbol.toUpperCase(), price: last, change_pct: ((last - prev) / prev) * 100, source: "Yahoo Chart" });
    }
  }
  return sanitizeQuotes(rows);
}

async function fetchStooqUsQuotes(symbols: string[]): Promise<MarketQuote[]> {
  const stooqSymbols = symbols.slice(0, 18).map((symbol) => `${symbol.toLowerCase().replace(".", "-")}.us`).join("+");
  if (!stooqSymbols) return [];
  const url = `https://stooq.com/q/l/?s=${stooqSymbols}&f=sd2t2oc&h&e=csv`;
  const csv = await fetch(url, { headers: userAgentHeaders() }).then(assertTextResponse);
  return sanitizeQuotes(parseStooqCsv(csv));
}

async function fetchTencentAQuotes(symbols: string[]): Promise<MarketQuote[]> {
  const rows: MarketQuote[] = [];
  for (const chunk of chunkArray(symbols, 48)) {
    const raw = await fetch(`https://qt.gtimg.cn/q=${chunk.join(",")}`, { headers: userAgentHeaders() }).then(assertTextResponse);
    rows.push(...parseTencentQuoteLines(raw).map((row) => withOptionalName({ symbol: row.code.toUpperCase(), price: row.price, change_pct: row.changePercent, source: "Tencent" }, resolveAShareDisplayName(row.code, row.name))));
  }
  return sanitizeQuotes(rows);
}

async function fetchSinaAQuotes(symbols: string[]): Promise<MarketQuote[]> {
  const rows: MarketQuote[] = [];
  for (const chunk of chunkArray(symbols, 80)) {
    const query = chunk.map((symbol) => `s_${symbol.toLowerCase()}`).join(",");
    const raw = await fetch(`https://hq.sinajs.cn/list=${query}`, { headers: { ...userAgentHeaders(), "Referer": "https://finance.sina.com.cn/" } }).then(assertTextResponse);
    rows.push(...parseSinaSimpleQuoteLines(raw));
  }
  return sanitizeQuotes(rows);
}

async function fetchEastmoneyAQuotes(symbols: string[]): Promise<MarketQuote[]> {
  const rows: MarketQuote[] = [];
  for (const chunk of chunkArray(symbols, 80)) {
    const secids = chunk.map(toEastmoneySecId).filter(Boolean).join(",");
    if (!secids) continue;
    const url = new URL("https://push2.eastmoney.com/api/qt/ulist.np/get");
    url.searchParams.set("fltt", "2");
    url.searchParams.set("invt", "2");
    url.searchParams.set("fields", "f12,f14,f2,f3");
    url.searchParams.set("secids", secids);
    const payload = await fetch(url.toString(), { headers: jsonHeaders() }).then(assertJsonResponse) as { data?: { diff?: Array<Record<string, unknown>> } };
    rows.push(...(payload.data?.diff ?? []).flatMap((entry): MarketQuote[] => {
      const code = String(entry.f12 ?? "");
      const price = Number(entry.f2);
      const change = Number(entry.f3);
      const symbol = eastmoneyCodeToSymbol(code, symbols);
      if (!symbol || !Number.isFinite(price) || !Number.isFinite(change)) return [];
      return [withOptionalName({ symbol: symbol.toUpperCase(), price, change_pct: change, source: "Eastmoney" }, resolveAShareDisplayName(symbol, typeof entry.f14 === "string" ? entry.f14 : undefined))];
    }));
  }
  return sanitizeQuotes(rows);
}

async function fetchCoingeckoQuotes(env: MarketEnv, symbols: string[]): Promise<{ rows: MarketQuote[]; usage: ApiUsageEntry }> {
  const started = Date.now();
  try {
    const ids = symbols.map((symbol) => cryptoIdMap[symbol.replace(/USDT$/i, "").toUpperCase()]).filter(Boolean);
    if (!ids.length) throw new Error("no supported CoinGecko symbols");
    const url = new URL("https://api.coingecko.com/api/v3/simple/price");
    url.searchParams.set("ids", [...new Set(ids)].join(","));
    url.searchParams.set("vs_currencies", "usd");
    url.searchParams.set("include_24hr_change", "true");
    const headers = jsonHeaders();
    if (env.COINGECKO_API_KEY) headers["x-cg-demo-api-key"] = env.COINGECKO_API_KEY;
    const payload = await fetch(url.toString(), { headers }).then(assertJsonResponse) as Record<string, { usd?: number; usd_24h_change?: number }>;
    const rows = Object.entries(payload).flatMap(([id, entry]): MarketQuote[] => {
      const symbol = reverseCryptoIdMap[id];
      if (!symbol || !Number.isFinite(entry.usd) || !Number.isFinite(entry.usd_24h_change)) return [];
      return [{ symbol, price: Number(entry.usd), change_pct: Number(entry.usd_24h_change), source: "CoinGecko" }];
    });
    return { rows, usage: apiUsage("coingecko", "simple_price", rows.length > 0, Date.now() - started, false, rows.length ? undefined : "empty result") };
  } catch (error) {
    return { rows: [], usage: apiUsage("coingecko", "simple_price", false, Date.now() - started, isRateLimitError(error), error instanceof Error ? error.message.slice(0, 220) : "unknown error") };
  }
}

async function fetchAlternativeMeQuotes(symbols: string[]): Promise<{ rows: MarketQuote[]; usage: ApiUsageEntry }> {
  const started = Date.now();
  try {
    const wanted = new Set(symbols.map((symbol) => symbol.replace(/USDT$/i, "").toUpperCase()));
    const payload = await fetch("https://api.alternative.me/v2/ticker/?limit=100", { headers: jsonHeaders() }).then(assertJsonResponse) as { data?: Record<string, { symbol?: string; quotes?: { USD?: { price?: number; percent_change_24h?: number } } }> };
    const rows = Object.values(payload.data ?? {}).flatMap((entry): MarketQuote[] => {
      const symbol = entry.symbol?.toUpperCase();
      const quote = entry.quotes?.USD;
      if (!symbol || !wanted.has(symbol) || !Number.isFinite(quote?.price) || !Number.isFinite(quote?.percent_change_24h)) return [];
      return [{ symbol, price: Number(quote?.price), change_pct: Number(quote?.percent_change_24h), source: "alternative.me" }];
    });
    return { rows, usage: apiUsage("alternative.me", "ticker", rows.length > 0, Date.now() - started, false, rows.length ? undefined : "empty result") };
  } catch (error) {
    return { rows: [], usage: apiUsage("alternative.me", "ticker", false, Date.now() - started, isRateLimitError(error), error instanceof Error ? error.message.slice(0, 220) : "unknown error") };
  }
}

function parseTwelveDataQuotePayload(payload: Record<string, unknown>, requested: string[], mapSymbol = (symbol: string) => symbol, isAShare = false): MarketQuote[] {
  const candidates = requested.length === 1 && isRecord(payload) && typeof payload.symbol === "string" ? [payload] : Object.values(payload).filter(isRecord);
  return candidates.flatMap((entry): MarketQuote[] => {
    const rawSymbol = String(entry.symbol ?? "");
    const symbol = mapSymbol(rawSymbol || String(entry.name ?? ""));
    const price = Number(entry.close ?? entry.price);
    const changePct = Number(entry.percent_change ?? entry.percent_change_24h);
    if (!symbol || !Number.isFinite(price) || !Number.isFinite(changePct)) return [];
    const normalizedSymbol = isAShare ? normalizeTwelveDataAShareBack(symbol).toUpperCase() : symbol.toUpperCase();
    return [withOptionalName({ symbol: normalizedSymbol, price, change_pct: changePct, source: "Twelve Data" }, typeof entry.name === "string" ? (isAShare ? entry.name : sanitizeUsDisplayName(entry.name, normalizedSymbol)) : undefined)];
  });
}

function parseTencentQuoteLines(raw: string): Array<{ code: string; name: string; price: number; changePercent: number }> {
  return raw.split(";").flatMap((line) => {
    const match = /v_([^=]+)=\"([^\"]*)\"/.exec(line.trim());
    if (!match) return [];
    const code = match[1] ?? "";
    const fields = (match[2] ?? "").split("~");
    const price = Number(fields[3]);
    const changePercent = Number(fields[32]);
    if (!Number.isFinite(price) || !Number.isFinite(changePercent)) return [];
    return [{ code, name: fields[1] ?? code, price, changePercent }];
  });
}

function parseSinaSimpleQuoteLines(raw: string): MarketQuote[] {
  return raw.split(";").flatMap((line): MarketQuote[] => {
    const match = /hq_str_s_([^=]+)=\"([^\"]*)\"/.exec(line.trim());
    if (!match) return [];
    const symbol = (match[1] ?? "").toUpperCase();
    const fields = (match[2] ?? "").split(",");
    const price = Number(fields[1]);
    const change = Number(fields[3]);
    if (!symbol || !Number.isFinite(price) || !Number.isFinite(change)) return [];
    return [withOptionalName({ symbol, price, change_pct: change, source: "Sina" }, resolveAShareDisplayName(symbol, fields[0]))];
  });
}

function parseStooqCsv(csv: string): MarketQuote[] {
  return csv.split("\n").slice(1).flatMap((line): MarketQuote[] => {
    const [symbolRaw, , , openRaw, closeRaw] = line.split(",").map((cell) => cell.trim());
    if (!symbolRaw || !closeRaw || closeRaw === "N/D") return [];
    const symbol = symbolRaw.replace(/\.US$/i, "").replace("-", ".").toUpperCase();
    const price = Number(closeRaw);
    const open = Number(openRaw);
    const change = Number.isFinite(open) && open > 0 ? ((price - open) / open) * 100 : 0;
    if (!Number.isFinite(price) || !Number.isFinite(change)) return [];
    return [{ symbol, price, change_pct: change, source: "Stooq" }];
  });
}

function resolveAShareDisplayName(symbol: string, sourceName?: string): string {
  const map: Record<string, string> = {
    sh000001: "上证指数",
    sz399001: "深证成指",
    sh000300: "沪深300",
    sz399006: "创业板指",
    sh600519: "贵州茅台",
    sz000858: "五粮液",
    sh601318: "中国平安",
    sh600036: "招商银行",
    sz300750: "宁德时代",
    sh688981: "中芯国际",
    sz002594: "比亚迪",
    sz300059: "东方财富",
    sh600030: "中信证券",
  };
  const fixed = map[symbol.toLowerCase()];
  if (fixed) return fixed;
  const raw = (sourceName ?? "").trim();
  return isCleanDisplayName(raw) ? raw : symbol.toUpperCase();
}

function sanitizeUsDisplayName(sourceName: string | undefined, symbol: string): string {
  const raw = (sourceName ?? "").trim();
  return isCleanDisplayName(raw) ? raw : symbol.toUpperCase();
}

function isCleanDisplayName(value: string): boolean {
  return Boolean(value) && !value.includes("�") && !/[\u00c0-\u00ff]{2,}/.test(value);
}

function toAlphaVantageAShareSymbols(symbol: string): string[] {
  const code = symbol.toLowerCase().replace(/^(sh|sz)/, "");
  if (!/^\d{6}$/.test(code)) return [symbol];
  if (symbol.toLowerCase().startsWith("sh") || code.startsWith("6")) return [`${code}.SHH`, `${code}.SS`];
  return [`${code}.SHZ`, `${code}.SZ`];
}

function toTwelveDataAShareSymbol(symbol: string): string {
  const code = symbol.toLowerCase().replace(/^(sh|sz)/, "");
  if (symbol.toLowerCase().startsWith("sh") || code.startsWith("6")) return `${code}:SSE`;
  return `${code}:SZSE`;
}

function normalizeTwelveDataAShareBack(symbol: string): string {
  const [code, exchange] = symbol.split(":");
  if (!code) return symbol;
  if (/SSE/i.test(exchange ?? "") || code.startsWith("6")) return `SH${code}`;
  return `SZ${code}`;
}

function toEastmoneySecId(symbol: string): string | undefined {
  const normalized = symbol.toLowerCase();
  const code = normalized.replace(/^(sh|sz)/, "");
  if (!/^\d{6}$/.test(code)) return undefined;
  if (normalized.startsWith("sh") || code.startsWith("6") || code.startsWith("5") || code.startsWith("9")) return `1.${code}`;
  if (normalized.startsWith("sz") || code.startsWith("0") || code.startsWith("2") || code.startsWith("3")) return `0.${code}`;
  return undefined;
}

function eastmoneyCodeToSymbol(code: string, requestedSymbols: string[]): string | undefined {
  const match = requestedSymbols.find((symbol) => symbol.replace(/^(sh|sz)/i, "") === code);
  if (match) return match;
  if (code.startsWith("6") || code.startsWith("5") || code.startsWith("9")) return `sh${code}`;
  if (code.startsWith("0") || code.startsWith("2") || code.startsWith("3")) return `sz${code}`;
  return undefined;
}

function mergeQuoteRows(primary: MarketQuote[], fallback: MarketQuote[]): MarketQuote[] {
  const bySymbol = new Map<string, MarketQuote>();
  for (const row of [...primary, ...fallback]) {
    const normalized = sanitizeQuote(row);
    if (!normalized) continue;
    const key = normalized.symbol.toUpperCase();
    if (!bySymbol.has(key)) bySymbol.set(key, normalized);
  }
  return [...bySymbol.values()];
}

function sanitizeQuotes(rows: MarketQuote[]): MarketQuote[] {
  return mergeQuoteRows([], rows);
}

function sanitizeQuote(row: MarketQuote): MarketQuote | undefined {
  const symbol = row.symbol?.trim().toUpperCase();
  const price = Number(row.price);
  const change = Number(row.change_pct);
  if (!symbol || !Number.isFinite(price) || !Number.isFinite(change)) return undefined;
  const base: MarketQuote = { ...row, symbol, price, change_pct: change, source: row.source || "unknown" };
  return withOptionalName(base, row.name?.trim());
}

function withOptionalName(row: MarketQuote, name?: string): MarketQuote {
  const clean = name?.trim();
  if (!clean) {
    const { name: _name, ...withoutName } = row;
    return withoutName;
  }
  return { ...row, name: clean };
}

function hasQuote(rows: MarketQuote[], symbol: string): boolean {
  return rows.some((row) => normalizeCoverageSymbol(row.symbol) === normalizeCoverageSymbol(symbol));
}

function quoteCoverage(rows: MarketQuote[], requestedSymbols: string[]): number {
  if (!requestedSymbols.length) return rows.length > 0 ? 1 : 0;
  const available = new Set(rows.map((row) => normalizeCoverageSymbol(row.symbol)));
  const requested = new Set(requestedSymbols.map(normalizeCoverageSymbol));
  let hits = 0;
  for (const symbol of requested) {
    if (available.has(symbol)) hits += 1;
  }
  return hits / requested.size;
}

function hasCoreUsCoverage(rows: MarketQuote[], indexSet: Set<string>): boolean {
  const available = new Set(rows.map((row) => row.symbol.toUpperCase()));
  const hasAllIndices = [...indexSet].every((symbol) => available.has(symbol));
  return hasAllIndices && rows.length >= Math.min(10, US_POOL.length);
}

function normalizeCoverageSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/^(US|S_)/, "").replace(/USDT$/, "").replace(/\.US$/, "").replace(/:SSE$|:SZSE$/, "").replace(/^(SH|SZ)(\d{6})$/, "$1$2");
}

function apiUsage(provider: string, endpoint: string, success: boolean, latencyMs: number, rateLimited: boolean, message?: string): ApiUsageEntry {
  const entry: ApiUsageEntry = { provider, endpoint, success, latency_ms: latencyMs, rate_limited: rateLimited };
  if (message) entry.message = message;
  return entry;
}

async function assertTextResponse(response: Response): Promise<string> {
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 160)}`);
  return text;
}

async function assertJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 160)}`);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Invalid JSON: ${text.slice(0, 160)}`);
  }
}

function jsonHeaders(): Record<string, string> {
  return { ...userAgentHeaders(), "Accept": "application/json,text/plain,*/*" };
}

function userAgentHeaders(): Record<string, string> {
  return { "User-Agent": "Mozilla/5.0 (compatible; GlobalPulse/1.0; +https://github.com/InnoNestX/GlobalPulse)", "Accept-Language": "en-US,en;q=0.9" };
}

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /429|rate|limit|too many|forbidden|HTTP 403/i.test(message);
}

function chunkArray<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const cryptoIdMap: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  DOGE: "dogecoin",
  ADA: "cardano",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  TON: "the-open-network",
  PEPE: "pepe",
};

const reverseCryptoIdMap = Object.fromEntries(Object.entries(cryptoIdMap).map(([symbol, id]) => [id, symbol]));
