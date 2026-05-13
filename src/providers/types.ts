import type { Env } from "../env";
import type { ProviderName, PushMessage } from "../messages";

export interface ProviderResult {
  provider: ProviderName;
  ok: boolean;
  status: number;
  message: string;
}

export interface Provider {
  name: ProviderName;
  isConfigured(env: Env): boolean;
  send(message: PushMessage, env: Env): Promise<ProviderResult>;
}
