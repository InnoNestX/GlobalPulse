import type { Env } from "./env";
import { getStoredJson, putStoredJson } from "./state-store";

export interface MarketDataProviderSettings {
  alphaVantageApiKey?: string;
  finnhubApiKey?: string;
  twelveDataApiKey?: string;
  coingeckoApiKey?: string;
  newsApiKey?: string;
}

const MARKET_DATA_SETTINGS_KEY = "settings:market-data-providers:v1";

export async function getMarketDataProviderSettings(env: Env): Promise<MarketDataProviderSettings> {
  const stored = await getStoredJson<MarketDataProviderSettings>(env, MARKET_DATA_SETTINGS_KEY);
  return normalizeMarketDataProviderSettings(stored);
}

export async function saveMarketDataProviderSettings(env: Env, value: unknown): Promise<MarketDataProviderSettings> {
  const settings = normalizeMarketDataProviderSettings(value);
  await putStoredJson(env, MARKET_DATA_SETTINGS_KEY, settings);
  return settings;
}

export async function mergeMarketDataProviderSettings(env: Env): Promise<Env> {
  const settings = await getMarketDataProviderSettings(env);
  const runtimeEnv = { ...env } as Env & Record<string, string | undefined>;

  assignIfMissing(runtimeEnv, "ALPHA_VANTAGE_API_KEY", settings.alphaVantageApiKey);
  assignIfMissing(runtimeEnv, "FINNHUB_API_KEY", settings.finnhubApiKey);
  assignIfMissing(runtimeEnv, "TWELVE_DATA_API_KEY", settings.twelveDataApiKey);
  assignIfMissing(runtimeEnv, "COINGECKO_API_KEY", settings.coingeckoApiKey);
  assignIfMissing(runtimeEnv, "NEWSAPI_API_KEY", settings.newsApiKey);

  return runtimeEnv;
}

function normalizeMarketDataProviderSettings(value: unknown): MarketDataProviderSettings {
  if (!isRecord(value)) return {};
  return {
    ...readOptionalSecret(value.alphaVantageApiKey, "alphaVantageApiKey"),
    ...readOptionalSecret(value.finnhubApiKey, "finnhubApiKey"),
    ...readOptionalSecret(value.twelveDataApiKey, "twelveDataApiKey"),
    ...readOptionalSecret(value.coingeckoApiKey, "coingeckoApiKey"),
    ...readOptionalSecret(value.newsApiKey, "newsApiKey"),
  };
}

function readOptionalSecret(value: unknown, key: keyof MarketDataProviderSettings): Partial<MarketDataProviderSettings> {
  if (typeof value !== "string") return {};
  const trimmed = value.trim();
  return trimmed ? { [key]: trimmed.slice(0, 260) } : {};
}

function assignIfMissing(env: Env & Record<string, string | undefined>, key: string, value: string | undefined): void {
  if (!env[key] && value) env[key] = value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
