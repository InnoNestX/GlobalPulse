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
  const rows = await fetchTencentUsQuotes(symbols);
  const indexSet = new Set(["SPY", "QQQ", "DIA", "IWM"]);
  return {
    indices: rows.filter((row) => indexSet.has(row.symbol)),
    universe: rows,
    usages: [{ provider: "tencent", endpoint: "us_quotes", success: rows.length > 0, latency_ms: 0, rate_limited: false }],
  };
}

async function fetchAShareMarket(focus: string[], positions: string[]): Promise<MarketDataResult> {
  const symbols = dedupeSymbols([...A_POOL, ...focus, ...positions])
    .map((symbol) => normalizeAShareCode(symbol) ?? symbol)
    .slice(0, 70);
  const rows = await fetchTencentAQuotes(symbols);
  const indexSet = new Set(["SH000001", "SZ399001", "SH000300", "SZ399006"]);
  return {
    indices: rows.filter((row) => indexSet.has(row.symbol.toUpperCase())),
    universe: rows,
    usages: [{ provider: "tencent", endpoint: "a_share_quotes", success: rows.length > 0, latency_ms: 0, rate_limited: false }],
  };
}

async function fetchCryptoMarket(env: Env, focus: string[], positions: string[]): Promise<MarketDataResult> {
  const symbols = dedupeSymbols([...CRYPTO_POOL, ...focus.map(toCryptoPair), ...positions.map(toCryptoPair)]).slice(0, 40);
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
  return {
    indices: rows.filter((row) => ["BTC", "ETH", "SOL", "DOGE"].includes(row.symbol)),
    universe: rows,
    usages: [result.usage],
  };
}

async function fetchTencentUsQuotes(symbols: string[]): Promise<MarketQuote[]> {
  const rows: MarketQuote[] = [];
  for (const chunk of chunkArray(symbols, 36)) {
    try {
      const raw = await fetch(`https://qt.gtimg.cn/q=${chunk.map((symbol) => `us${symbol.toUpperCase()}`).join(",")}`, {
        headers: { "User-Agent": "globalpulse-worker/0.1" },
      }).then((res) => res.text());
      rows.push(...parseTencentQuoteLines(raw).map((row) => ({
        symbol: row.code.startsWith("us") ? row.code.slice(2).toUpperCase().split(".")[0] ?? row.code.toUpperCase() : row.code.toUpperCase(),
        name: row.name,
        price: row.price,
        change_pct: row.changePercent,
        source: "Tencent",
      })));
    } catch {
      // keep partial market data
    }
  }
  return dedupeQuotes(rows);
}

async function fetchTencentAQuotes(symbols: string[]): Promise<MarketQuote[]> {
  const rows: MarketQuote[] = [];
  for (const chunk of chunkArray(symbols, 48)) {
    try {
      const raw = await fetch(`https://qt.gtimg.cn/q=${chunk.join(",")}`, {
        headers: { "User-Agent": "globalpulse-worker/0.1" },
      }).then((res) => res.text());
      rows.push(...parseTencentQuoteLines(raw).map((row) => ({
        symbol: row.code.toUpperCase(),
        name: resolveAShareDisplayName(row.code, row.name),
        price: row.price,
        change_pct: row.changePercent,
        source: "Tencent",
      })));
    } catch {
      // keep partial market data
    }
  }
  return dedupeQuotes(rows);
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

function resolveAShareDisplayName(symbol: string, sourceName?: string): string {
  const map: Record<string, string> = {
    sh000001: "上证指数",
    sz399001: "深证成指",
    sh000300: "沪深300",
    sz399006: "创业板指",
  };
  const fixed = map[symbol.toLowerCase()];
  if (fixed) return fixed;
  const raw = (sourceName ?? "").trim();
  return raw && !raw.includes("�") ? raw : symbol.toUpperCase();
}

function chunkArray<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
}

function dedupeQuotes(rows: MarketQuote[]): MarketQuote[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = row.symbol.toUpperCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

