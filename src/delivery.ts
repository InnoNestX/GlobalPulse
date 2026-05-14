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
  const deliveryEnv = await createDeliveryEnv(env, settings, incomingMessage.emailRecipientOverride);
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

export async function createDeliveryEnv(env: Env, settings?: AppSettings, emailRecipientOverride?: string): Promise<Env> {
  const merged = settings
    ? mergeProviderSettings(env, settings)
    : await (async () => {
        try {
          return mergeProviderSettings(env, await getSettings(env));
        } catch (error) {
          console.warn("Failed to load provider settings from KV", error);
          return env;
        }
      })();

  // Inject per-schedule email recipient override
  if (emailRecipientOverride !== undefined) {
    if (emailRecipientOverride === "") {
      // Empty = explicitly no email for this schedule
      (merged as Env & { EMAIL_DISABLED?: boolean }).EMAIL_DISABLED = true;
      (merged as Env & { EMAIL_TO?: string }).EMAIL_TO = "";
    } else {
      (merged as Env & { EMAIL_DISABLED?: boolean }).EMAIL_DISABLED = false;
      (merged as Env & { EMAIL_TO?: string }).EMAIL_TO = emailRecipientOverride;
    }
  }

  return merged;
}
