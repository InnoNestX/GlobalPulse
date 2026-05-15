import type { Env } from "../../env";
import type { ReportType } from "../../config";
import { dedupeSymbols, normalizeAShareCode, toCryptoPair } from "../normalize/ticker";
import type { ApiUsageEntry } from "../types/common";
import type { MarketQuote } from "../types/packet";
import { cachedJsonFetch } from "./rateLimiter";

export interface MarketDataResult {
  indices: MarketQuote[];
  universe: MarketQuote[];
  usages: ApiUsageEntry[];
}

const US_POOL = ["SPY", "QQQ", "DIA", "IWM", "XLK", "XLF", "XLE", "XLV", "SMH", "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "AMD", "AVGO", "JPM", "LLY", "COIN", "MSTR"];
const A_POOL = ["sh000001", "sz399001", "sh000300", "sz399006", "sh600519", "sz000858", "sh601318", "sh600036", "sz300750", "sh688981", "sz002594", "sz300059", "sh600030"];
const CRYPTO_POOL = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT", "AVAXUSDT", "LINKUSDT", "TONUSDT", "PEPEUSDT"];

export async function fetchMarketData(env: Env, reportType: ReportType, focus: string[], positions: string[]): Promise<MarketDataResult> {
  if (reportType === "crypto") return fetchCryptoMarket(env, focus, positions);
  if (reportType === "a_share") return fetchAShareMarket(focus, positions);
  return fetchUsMarket(focus, positions);
}

async function fetchUsMarket(focus: string[], positions: string[]): Promise<MarketDataResult> {
  const symbols = dedupeSymbols([...US_POOL, ...focus, ...positions]).slice(0, 70);
  const { rows, usages } = await fetchWithFallback(symbols, [
    { provider: "tencent", endpoint: "us_quotes", fetcher: fetchTencentUsQuotes },
    { provider: "yahoo", endpoint: "finance_quote", fetcher: fetchYahooUsQuotes },
    { provider: "stooq", endpoint: "quote_csv", fetcher: fetchStooqUsQuotes },
  ]);
  const indexSet = new Set(["SPY", "QQQ", "DIA", "IWM"]);
  return {
    indices: rows.filter((row) => indexSet.has(row.symbol.toUpperCase())),
    universe: rows,
    usages,
  };
}

async function fetchAShareMarket(focus: string[], positions: string[]): Promise<MarketDataResult> {
  const symbols = dedupeSymbols([...A_POOL, ...focus, ...positions])
    .map((symbol) => normalizeAShareCode(symbol) ?? symbol)
    .slice(0, 70);
  const { rows, usages } = await fetchWithFallback(symbols, [
    { provider: "tencent", endpoint: "a_share_quotes", fetcher: fetchTencentAQuotes },
    { provider: "sina", endpoint: "a_share_simple_quotes", fetcher: fetchSinaAQuotes },
    { provider: "eastmoney", endpoint: "push2_ulist", fetcher: fetchEastmoneyAQuotes },
  ]);
  const indexSet = new Set(["SH000001", "SZ399001", "SH000300", "SZ399006"]);
  return {
    indices: rows.filter((row) => indexSet.has(row.symbol.toUpperCase())),
    universe: rows,
    usages,
  };
}

async function fetchCryptoMarket(env: Env, focus: string[], positions: string[]): Promise<MarketDataResult> {
  const symbols = dedupeSymbols([...CRYPTO_POOL, ...focus.map(toCryptoPair), ...positions.map(toCryptoPair)]).slice(0, 40);
  const binance = await fetchBinanceQuotes(env, symbols);
  let rows = binance.rows;
  const usages = [binance.usage];

  if (quoteCoverage(rows, symbols) < 0.85) {
    const coingecko = await fetchCoingeckoQuotes(symbols);
    usages.push(coingecko.usage);
    rows = mergeQuoteRows(rows, coingecko.rows);
  }

  if (quoteCoverage(rows, symbols) < 0.85) {
    const alternative = await fetchAlternativeMeQuotes(symbols);
    usages.push(alternative.usage);
    rows = mergeQuoteRows(rows, alternative.rows);
  }

  return {
    indices: rows.filter((row) => ["BTC", "ETH", "SOL", "DOGE"].includes(row.symbol.toUpperCase())),
    universe: rows,
    usages,
  };
}

async function fetchWithFallback(
  symbols: string[],
  sources: Array<{ provider: string; endpoint: string; fetcher: (symbols: string[]) => Promise<MarketQuote[]> }>,
): Promise<{ rows: MarketQuote[]; usages: ApiUsageEntry[] }> {
  let rows: MarketQuote[] = [];
  const usages: ApiUsageEntry[] = [];

  for (const source of sources) {
    const started = Date.now();
    try {
      const fetched = await source.fetcher(symbols);
      rows = mergeQuoteRows(rows, fetched);
      usages.push({
        provider: source.provider,
        endpoint: source.endpoint,
        success: fetched.length > 0,
        latency_ms: Date.now() - started,
        rate_limited: false,
      });
      if (quoteCoverage(rows, symbols) >= 0.85) {
        break;
      }
    } catch (error) {
      usages.push({
        provider: source.provider,
        endpoint: source.endpoint,
        success: false,
        latency_ms: Date.now() - started,
        rate_limited: isRateLimitError(error),
        message: error instanceof Error ? error.message.slice(0, 160) : "unknown error",
      });
    }
  }

  return { rows: sanitizeQuotes(rows), usages };
}

async function fetchBinanceQuotes(env: Env, symbols: string[]): Promise<{ rows: MarketQuote[]; usage: ApiUsageEntry }> {
  const url = new URL("https://api.binance.com/api/v3/ticker/24hr");
  url.searchParams.set("symbols", JSON.stringify(symbols));
  const result = await cachedJsonFetch<Array<{ symbol?: string; lastPrice?: string; priceChangePercent?: string }>>(
    env,
    "binance",
    "ticker_24hr",
    url.toString(),
    { headers: { "User-Agent": "globalpulse-worker/0.1" } },
    180,
  );
  const rows = (result.data ?? []).flatMap((entry): MarketQuote[] => {
    const symbol = entry.symbol?.toUpperCase();
    const price = Number(entry.lastPrice);
    const change = Number(entry.priceChangePercent);
    if (!symbol || !Number.isFinite(price) || !Number.isFinite(change)) return [];
    return [{ symbol: symbol.replace(/USDT$/, ""), price, change_pct: change, source: "Binance" }];
  });
  return { rows, usage: result.usage };
}

async function fetchTencentUsQuotes(symbols: string[]): Promise<MarketQuote[]> {
  const rows: MarketQuote[] = [];
  for (const chunk of chunkArray(symbols, 36)) {
    const raw = await fetch(`https://qt.gtimg.cn/q=${chunk.map((symbol) => `us${symbol.toUpperCase()}`).join(",")}`, {
      headers: { "User-Agent": "globalpulse-worker/0.1" },
    }).then(assertTextResponse);
    rows.push(...parseTencentQuoteLines(raw).map((row) => ({
      symbol: row.code.startsWith("us") ? row.code.slice(2).toUpperCase().split(".")[0] ?? row.code.toUpperCase() : row.code.toUpperCase(),
      name: row.name,
      price: row.price,
      change_pct: row.changePercent,
      source: "Tencent",
    })));
  }
  return sanitizeQuotes(rows);
}

async function fetchYahooUsQuotes(symbols: string[]): Promise<MarketQuote[]> {
  const rows: MarketQuote[] = [];
  for (const chunk of chunkArray(symbols, 40)) {
    const url = new URL("https://query1.finance.yahoo.com/v7/finance/quote");
    url.searchParams.set("symbols", chunk.join(","));
    const payload = await fetch(url.toString(), {
      headers: { "User-Agent": "globalpulse-worker/0.1", "Accept": "application/json" },
    }).then(assertJsonResponse) as { quoteResponse?: { result?: Array<Record<string, unknown>> } };
    const result = payload.quoteResponse?.result ?? [];
    rows.push(...result.flatMap((entry): MarketQuote[] => {
      const symbol = String(entry.symbol ?? "").toUpperCase();
      const price = Number(entry.regularMarketPrice);
      const change = Number(entry.regularMarketChangePercent);
      if (!symbol || !Number.isFinite(price) || !Number.isFinite(change)) return [];
      return [{
        symbol: symbol.split(".")[0] ?? symbol,
        name: typeof entry.shortName === "string" ? entry.shortName : symbol,
        price,
        change_pct: change,
        source: "Yahoo Finance",
      }];
    }));
  }
  return sanitizeQuotes(rows);
}

async function fetchStooqUsQuotes(symbols: string[]): Promise<MarketQuote[]> {
  const rows: MarketQuote[] = [];
  for (const chunk of chunkArray(symbols, 80)) {
    const stooqSymbols = chunk.map((symbol) => `${symbol.toLowerCase().replace(".", "-")}.us`).join(",");
    const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbols)}&f=sd2t2oc&h&e=csv`;
    const csv = await fetch(url, {
      headers: { "User-Agent": "globalpulse-worker/0.1" },
    }).then(assertTextResponse);
    rows.push(...parseStooqCsv(csv));
  }
  return sanitizeQuotes(rows);
}

async function fetchTencentAQuotes(symbols: string[]): Promise<MarketQuote[]> {
  const rows: MarketQuote[] = [];
  for (const chunk of chunkArray(symbols, 48)) {
    const raw = await fetch(`https://qt.gtimg.cn/q=${chunk.join(",")}`, {
      headers: { "User-Agent": "globalpulse-worker/0.1" },
    }).then(assertTextResponse);
    rows.push(...parseTencentQuoteLines(raw).map((row) => ({
      symbol: row.code.toUpperCase(),
      name: resolveAShareDisplayName(row.code, row.name),
      price: row.price,
      change_pct: row.changePercent,
      source: "Tencent",
    })));
  }
  return sanitizeQuotes(rows);
}

async function fetchSinaAQuotes(symbols: string[]): Promise<MarketQuote[]> {
  const rows: MarketQuote[] = [];
  for (const chunk of chunkArray(symbols, 80)) {
    const query = chunk.map((symbol) => `s_${symbol.toLowerCase()}`).join(",");
    const raw = await fetch(`https://hq.sinajs.cn/list=${query}`, {
      headers: { "User-Agent": "Mozilla/5.0 globalpulse-worker/0.1", "Referer": "https://finance.sina.com.cn/" },
    }).then(assertTextResponse);
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
    const payload = await fetch(url.toString(), {
      headers: { "User-Agent": "globalpulse-worker/0.1", "Accept": "application/json" },
    }).then(assertJsonResponse) as { data?: { diff?: Array<Record<string, unknown>> } };
    rows.push(...(payload.data?.diff ?? []).flatMap((entry): MarketQuote[] => {
      const code = String(entry.f12 ?? "");
      const price = Number(entry.f2);
      const change = Number(entry.f3);
      const symbol = eastmoneyCodeToSymbol(code, symbols);
      if (!symbol || !Number.isFinite(price) || !Number.isFinite(change)) return [];
      return [{
        symbol: symbol.toUpperCase(),
        name: resolveAShareDisplayName(symbol, typeof entry.f14 === "string" ? entry.f14 : undefined),
        price,
        change_pct: change,
        source: "Eastmoney",
      }];
    }));
  }
  return sanitizeQuotes(rows);
}

async function fetchCoingeckoQuotes(symbols: string[]): Promise<{ rows: MarketQuote[]; usage: ApiUsageEntry }> {
  const started = Date.now();
  try {
    const ids = symbols.map((symbol) => cryptoIdMap[symbol.replace(/USDT$/i, "").toUpperCase()]).filter(Boolean);
    if (!ids.length) throw new Error("no supported CoinGecko symbols");
    const url = new URL("https://api.coingecko.com/api/v3/simple/price");
    url.searchParams.set("ids", [...new Set(ids)].join(","));
    url.searchParams.set("vs_currencies", "usd");
    url.searchParams.set("include_24hr_change", "true");
    const payload = await fetch(url.toString(), {
      headers: { "User-Agent": "globalpulse-worker/0.1", "Accept": "application/json" },
    }).then(assertJsonResponse) as Record<string, { usd?: number; usd_24h_change?: number }>;
    const rows = Object.entries(payload).flatMap(([id, entry]): MarketQuote[] => {
      const symbol = reverseCryptoIdMap[id];
      if (!symbol || !Number.isFinite(entry.usd) || !Number.isFinite(entry.usd_24h_change)) return [];
      return [{ symbol, price: Number(entry.usd), change_pct: Number(entry.usd_24h_change), source: "CoinGecko" }];
    });
    return { rows, usage: { provider: "coingecko", endpoint: "simple_price", success: rows.length > 0, latency_ms: Date.now() - started, rate_limited: false } };
  } catch (error) {
    return { rows: [], usage: { provider: "coingecko", endpoint: "simple_price", success: false, latency_ms: Date.now() - started, rate_limited: isRateLimitError(error), message: error instanceof Error ? error.message.slice(0, 160) : "unknown error" } };
  }
}

async function fetchAlternativeMeQuotes(symbols: string[]): Promise<{ rows: MarketQuote[]; usage: ApiUsageEntry }> {
  const started = Date.now();
  try {
    const wanted = new Set(symbols.map((symbol) => symbol.replace(/USDT$/i, "").toUpperCase()));
    const payload = await fetch("https://api.alternative.me/v2/ticker/?limit=100", {
      headers: { "User-Agent": "globalpulse-worker/0.1", "Accept": "application/json" },
    }).then(assertJsonResponse) as { data?: Record<string, { symbol?: string; quotes?: { USD?: { price?: number; percent_change_24h?: number } } }> };
    const rows = Object.values(payload.data ?? {}).flatMap((entry): MarketQuote[] => {
      const symbol = entry.symbol?.toUpperCase();
      const quote = entry.quotes?.USD;
      if (!symbol || !wanted.has(symbol) || !Number.isFinite(quote?.price) || !Number.isFinite(quote?.percent_change_24h)) return [];
      return [{ symbol, price: Number(quote?.price), change_pct: Number(quote?.percent_change_24h), source: "alternative.me" }];
    });
    return { rows, usage: { provider: "alternative.me", endpoint: "ticker", success: rows.length > 0, latency_ms: Date.now() - started, rate_limited: false } };
  } catch (error) {
    return { rows: [], usage: { provider: "alternative.me", endpoint: "ticker", success: false, latency_ms: Date.now() - started, rate_limited: isRateLimitError(error), message: error instanceof Error ? error.message.slice(0, 160) : "unknown error" } };
  }
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
    const name = resolveAShareDisplayName(symbol, fields[0]);
    const price = Number(fields[1]);
    const change = Number(fields[3]);
    if (!symbol || !Number.isFinite(price) || !Number.isFinite(change)) return [];
    return [{ symbol, name, price, change_pct: change, source: "Sina" }];
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
  return raw && !raw.includes("�") && !/[\u00c0-\u00ff]{2,}/.test(raw) ? raw : symbol.toUpperCase();
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
  return {
    ...row,
    symbol,
    name: row.name?.trim() || undefined,
    price,
    change_pct: change,
    source: row.source || "unknown",
  };
}

function quoteCoverage(rows: MarketQuote[], requestedSymbols: string[]): number {
  if (!requestedSymbols.length) return rows.length > 0 ? 1 : 0;
  const available = new Set(rows.map((row) => row.symbol.toUpperCase().replace(/USDT$/, "")));
  const requested = new Set(requestedSymbols.map((symbol) => symbol.toUpperCase().replace(/^(US|S_)/, "").replace(/USDT$/, "")));
  let hits = 0;
  for (const symbol of requested) {
    if (available.has(symbol)) hits += 1;
  }
  return hits / requested.size;
}

async function assertTextResponse(response: Response): Promise<string> {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function assertJsonResponse(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /429|rate|limit|too many/i.test(message);
}

function chunkArray<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
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
