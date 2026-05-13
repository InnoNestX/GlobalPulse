import type { Env } from "./env";

const APP_STATE_OBJECT_NAME = "globalpulse-state";

export async function getStoredText(env: Env, key: string): Promise<string | null> {
  if (env.APP_KV) {
    try {
      const value = await env.APP_KV.get(key);
      if (value !== null) {
        return value;
      }
    } catch (error) {
      console.warn("KV get failed, falling back to Durable Object", { key, error: normalizeError(error) });
    }
  }

  if (!env.APP_STATE_DO) {
    return null;
  }

  try {
    const response = await fetchFromStateObject(env, "/get", { key });

    if (!response.ok) {
      return null;
    }

    const body = await response.json().catch(() => undefined) as unknown;

    if (!isRecord(body)) {
      return null;
    }

    const value = body.value;
    return typeof value === "string" ? value : null;
  } catch (error) {
    console.warn("Durable Object get failed", { key, error: normalizeError(error) });
    return null;
  }
}

export async function putStoredText(env: Env, key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (env.APP_KV) {
    try {
      await env.APP_KV.put(key, value, ttlSeconds ? { expirationTtl: ttlSeconds } : undefined);
    } catch (error) {
      console.warn("KV put failed", { key, error: normalizeError(error) });
    }
  }

  if (!env.APP_STATE_DO) {
    return;
  }

  try {
    await fetchFromStateObject(env, "/put", { key, value, ttlSeconds });
  } catch (error) {
    console.warn("Durable Object put failed", { key, error: normalizeError(error) });
  }
}

export async function getStoredJson<T>(env: Env, key: string): Promise<T | undefined> {
  const text = await getStoredText(env, key);

  if (text === null) {
    return undefined;
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.warn("Stored JSON parse failed", { key, error: normalizeError(error) });
    return undefined;
  }
}

export async function putStoredJson(env: Env, key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  await putStoredText(env, key, JSON.stringify(value), ttlSeconds);
}

async function fetchFromStateObject(env: Env, pathname: string, body: unknown): Promise<Response> {
  if (!env.APP_STATE_DO) {
    throw new Error("APP_STATE_DO is not configured");
  }

  const stub = env.APP_STATE_DO.getByName(APP_STATE_OBJECT_NAME);
  return stub.fetch(`https://state${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
