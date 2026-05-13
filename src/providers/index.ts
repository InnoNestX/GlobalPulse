import type { Env } from "../env";
import type { ProviderName } from "../messages";
import { feishuProvider } from "./feishu";
import { telegramProvider } from "./telegram";
import type { Provider } from "./types";
import { wechatAiAgentProvider } from "./wechat-ai-agent";
import { wechatOfficialAccountProvider } from "./wechat-official-account";

export const providers = [
  feishuProvider,
  wechatOfficialAccountProvider,
  wechatAiAgentProvider,
  telegramProvider,
] satisfies Provider[];

export function getProvider(name: ProviderName): Provider {
  const provider = providers.find((entry) => entry.name === name);

  if (!provider) {
    throw new Error(`Unknown provider "${name}"`);
  }

  return provider;
}

export function getProviderStatus(env: Env) {
  return providers.map((provider) => ({
    name: provider.name,
    configured: provider.isConfigured(env),
  }));
}
