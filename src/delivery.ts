import { getSettings, mergeProviderSettings, type AppSettings } from "./config";
import type { Env } from "./env";
import { getProvider } from "./providers";
import type { ProviderResult } from "./providers/types";
import { type IncomingMessageBody, normalizeTargets, parseDefaultTargets, toPushMessage } from "./messages";

export interface DeliverySummary {
  ok: boolean;
  delivered: number;
  failed: number;
  results: ProviderResult[];
}

export async function sendIncomingMessage(incomingMessage: IncomingMessageBody, env: Env, settings?: AppSettings): Promise<DeliverySummary> {
  const deliveryEnv = await createDeliveryEnv(env, settings);
  const targets = normalizeTargets(incomingMessage.target, parseDefaultTargets(deliveryEnv.DEFAULT_TARGETS));
  const message = toPushMessage(incomingMessage);
  const results = await Promise.all(targets.map((target) => getProvider(target).send(message, deliveryEnv)));
  const delivered = results.filter((result) => result.ok).length;
  const failed = results.length - delivered;

  return {
    ok: failed === 0,
    delivered,
    failed,
    results,
  };
}

export async function createDeliveryEnv(env: Env, settings?: AppSettings): Promise<Env> {
  if (settings) {
    return mergeProviderSettings(env, settings);
  }

  try {
    return mergeProviderSettings(env, await getSettings(env));
  } catch (error) {
    console.warn("Failed to load provider settings from KV", error);

    return env;
  }
}
