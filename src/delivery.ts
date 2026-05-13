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

export async function sendIncomingMessage(incomingMessage: IncomingMessageBody, env: Env): Promise<DeliverySummary> {
  const targets = normalizeTargets(incomingMessage.target, parseDefaultTargets(env.DEFAULT_TARGETS));
  const message = toPushMessage(incomingMessage);
  const results = await Promise.all(targets.map((target) => getProvider(target).send(message, env)));
  const delivered = results.filter((result) => result.ok).length;
  const failed = results.length - delivered;

  return {
    ok: failed === 0,
    delivered,
    failed,
    results,
  };
}
