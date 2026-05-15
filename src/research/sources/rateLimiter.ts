import type { Env } from "../../env";
import { getStoredJson, putStoredJson } from "../../state-store";
import type { ApiUsageEntry } from "../types/common";

export interface ResearchFetchResult<T> {
  data?: T;
  usage: ApiUsageEntry;
  rateLimited: boolean;
}

export async function cachedJsonFetch<T>(
  env: Env,
  provider: string,
  endpoint: string,
  url: string,
  init: RequestInit = {},
  ttlSeconds = 300,
): Promise<ResearchFetchResult<T>> {
  const cacheKey = `research:cache:${provider}:${endpoint}:${hashString(url)}`;
  const cached = await getStoredJson<T>(env, cacheKey);
  if (cached !== undefined) {
    return {
      data: cached,
      rateLimited: false,
      usage: { provider, endpoint, success: true, latency_ms: 0, rate_limited: false },
    };
  }

  const started = Date.now();
  try {
    const response = await fetch(url, init);
    const latency = Date.now() - started;
    const rateLimited = response.status === 429;
    if (!response.ok) {
      return {
        rateLimited,
        usage: {
          provider,
          endpoint,
          success: false,
          latency_ms: latency,
          error: `HTTP ${response.status}`,
          rate_limited: rateLimited,
        },
      };
    }
    const data = await response.json() as T;
    await putStoredJson(env, cacheKey, data, ttlSeconds);
    return {
      data,
      rateLimited: false,
      usage: { provider, endpoint, success: true, latency_ms: latency, rate_limited: false },
    };
  } catch (error) {
    return {
      rateLimited: false,
      usage: {
        provider,
        endpoint,
        success: false,
        latency_ms: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
        rate_limited: false,
      },
    };
  }
}

export function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

