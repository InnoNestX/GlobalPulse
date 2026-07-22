import type { Env } from "./env";

const APP_STATE_OBJECT_NAME = "globalpulse-state";
const SETTINGS_KEY = "settings:v1";

export async function getStoredText(env: Env, key: string): Promise<string | null> {
  const kvValue = await readFromKv(env, key);
  const durableValue = await readFromDurableObject(env, key);

  if (key === SETTINGS_KEY) {
    const merged = mergeSettingsTexts(kvValue, durableValue);
    if (merged && merged !== kvValue) {
      // Incomplete KV can shadow richer Durable Object state after APP_KV was bound.
      await writeToKv(env, key, merged).catch(() => undefined);
      await writeToDurableObject(env, key, merged).catch(() => undefined);
    }
    return merged;
  }

  if (kvValue !== null) {
    return kvValue;
  }

  if (durableValue !== null) {
    await writeToKv(env, key, durableValue).catch(() => undefined);
    return durableValue;
  }

  return null;
}

export async function putStoredText(env: Env, key: string, value: string, ttlSeconds?: number): Promise<void> {
  const kvOk = await writeToKv(env, key, value, ttlSeconds);
  const doOk = await writeToDurableObject(env, key, value, ttlSeconds);

  if (!kvOk && !doOk && !env.APP_KV && !env.APP_STATE_DO) {
    return;
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

async function readFromKv(env: Env, key: string): Promise<string | null> {
  if (!env.APP_KV) {
    return null;
  }

  try {
    return await env.APP_KV.get(key);
  } catch (error) {
    console.warn("KV get failed", { key, error: normalizeError(error) });
    return null;
  }
}

async function writeToKv(env: Env, key: string, value: string, ttlSeconds?: number): Promise<boolean> {
  if (!env.APP_KV) {
    return false;
  }

  try {
    await env.APP_KV.put(key, value, ttlSeconds ? { expirationTtl: ttlSeconds } : undefined);
    return true;
  } catch (error) {
    console.warn("KV put failed", { key, error: normalizeError(error) });
    return false;
  }
}

async function readFromDurableObject(env: Env, key: string): Promise<string | null> {
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

async function writeToDurableObject(env: Env, key: string, value: string, ttlSeconds?: number): Promise<boolean> {
  if (!env.APP_STATE_DO) {
    return false;
  }

  try {
    await fetchFromStateObject(env, "/put", { key, value, ttlSeconds });
    return true;
  } catch (error) {
    console.warn("Durable Object put failed", { key, error: normalizeError(error) });
    return false;
  }
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

/** Prefer non-empty KV fields, keep Durable Object secrets that KV never received. */
export function mergeSettingsTexts(kvValue: string | null, durableValue: string | null): string | null {
  if (!kvValue) {
    return durableValue;
  }
  if (!durableValue) {
    return kvValue;
  }

  try {
    const kv = JSON.parse(kvValue) as unknown;
    const durable = JSON.parse(durableValue) as unknown;
    if (!isRecord(kv) || !isRecord(durable)) {
      return kvValue;
    }

    const merged: Record<string, unknown> = {
      ...durable,
      ...kv,
      providerSettings: mergeProviderSettingMaps(
        isRecord(durable.providerSettings) ? durable.providerSettings : {},
        isRecord(kv.providerSettings) ? kv.providerSettings : {},
      ),
      emailRecipients: pickRicherArray(kv.emailRecipients, durable.emailRecipients),
      schedules: pickRicherArray(kv.schedules, durable.schedules),
    };

    if (
      kv.appName === "GlobalPulse"
      && typeof durable.appName === "string"
      && durable.appName.trim()
      && durable.appName !== "GlobalPulse"
    ) {
      merged.appName = durable.appName;
    }

    return JSON.stringify(merged);
  } catch {
    return kvValue;
  }
}

function mergeProviderSettingMaps(
  durableSettings: Record<string, unknown>,
  kvSettings: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...durableSettings };

  for (const [key, value] of Object.entries(kvSettings)) {
    if (typeof value === "string") {
      if (value.trim()) {
        merged[key] = value;
      }
      continue;
    }
    if (value !== undefined && value !== null) {
      merged[key] = value;
    }
  }

  return merged;
}

function pickRicherArray(primary: unknown, fallback: unknown): unknown {
  if (Array.isArray(primary) && primary.length > 0) {
    return primary;
  }
  if (Array.isArray(fallback) && fallback.length > 0) {
    return fallback;
  }
  if (Array.isArray(primary)) {
    return primary;
  }
  if (Array.isArray(fallback)) {
    return fallback;
  }
  return primary ?? fallback ?? [];
}

function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
