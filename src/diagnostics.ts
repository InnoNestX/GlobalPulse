import { getLogs, getSettings, mergeProviderSettings, type DeliveryLog } from "./config";
import type { Env } from "./env";
import { getProviderStatus } from "./providers";
import { getStoredJson, putStoredJson } from "./state-store";

const LAST_CRON_KEY = "cron:last:v1";

export interface BindingCheck {
  id: string;
  ok: boolean;
  label: string;
  detail: string;
}

export interface LastCronState {
  at: string;
  checked: number;
  executed: number;
  skipped: number;
  ok: boolean;
  message: string;
}

export interface DiagnosticsPayload {
  generatedAt: string;
  bindings: BindingCheck[];
  secrets: BindingCheck[];
  providers: Array<{ name: string; configured: boolean }>;
  schedules: {
    total: number;
    enabled: number;
  };
  lastCron: LastCronState | null;
  recentFailures: DeliveryLog[];
  readyForFirstBriefing: boolean;
  checklist: Array<{ id: string; ok: boolean; label: string }>;
}

export async function createDiagnosticsPayload(env: Env, now = new Date()): Promise<DiagnosticsPayload> {
  const settings = await getSettings(env).catch(() => null);
  const deliveryEnv = settings ? mergeProviderSettings(env, settings) : env;
  const providers = getProviderStatus(deliveryEnv);
  const logs = await getLogs(env).catch(() => [] as DeliveryLog[]);
  const lastCron = await getLastCronState(env);
  const enabledSchedules = settings?.schedules.filter((schedule) => schedule.enabled) ?? [];
  const configuredProviders = providers.filter((provider) => provider.configured);
  const hasProvider = configuredProviders.length > 0;
  const hasSchedule = enabledSchedules.length > 0;

  const bindings: BindingCheck[] = [
    {
      id: "kv",
      ok: Boolean(env.APP_KV),
      label: "APP_KV",
      detail: env.APP_KV ? "Bound" : "missing — create with wrangler kv namespace create APP_KV",
    },
    {
      id: "d1",
      ok: Boolean(env.RESEARCH_DB),
      label: "RESEARCH_DB",
      detail: env.RESEARCH_DB ? "bound" : "optional — create with wrangler d1 create globalpulse-research",
    },
    {
      id: "ai",
      ok: Boolean(env.AI),
      label: "Workers AI",
      detail: env.AI ? "bound" : "optional — enable ai binding in wrangler.jsonc",
    },
    {
      id: "cron",
      ok: true,
      label: "Cron trigger",
      detail: "Worker expects */5 * * * * (configured in wrangler.jsonc triggers.crons)",
    },
  ];

  const secrets: BindingCheck[] = [
    {
      id: "admin",
      ok: Boolean(env.ADMIN_PASSWORD?.trim()),
      label: "ADMIN_PASSWORD",
      detail: env.ADMIN_PASSWORD?.trim() ? "set" : "missing",
    },
    {
      id: "api",
      ok: Boolean(env.API_TOKEN?.trim()),
      label: "API_TOKEN",
      detail: env.API_TOKEN?.trim() ? "set" : "missing",
    },
  ];

  const checklist = [
    { id: "bindings_kv", ok: Boolean(env.APP_KV), label: "KV bound" },
    { id: "secrets", ok: Boolean(env.ADMIN_PASSWORD?.trim() && env.API_TOKEN?.trim()), label: "Admin + API secrets set" },
    { id: "provider", ok: hasProvider, label: "At least one push provider configured" },
    { id: "schedule", ok: hasSchedule, label: "At least one enabled schedule" },
    { id: "preview", ok: hasProvider && hasSchedule, label: "Ready to preview / send" },
  ];

  return {
    generatedAt: now.toISOString(),
    bindings,
    secrets,
    providers,
    schedules: {
      total: settings?.schedules.length ?? 0,
      enabled: enabledSchedules.length,
    },
    lastCron,
    recentFailures: logs.filter((log) => !log.ok).slice(0, 5),
    readyForFirstBriefing: checklist.every((item) => item.ok),
    checklist,
  };
}

export async function getLastCronState(env: Env): Promise<LastCronState | null> {
  const value = await getStoredJson<LastCronState>(env, LAST_CRON_KEY);
  return value && typeof value.at === "string" ? value : null;
}

export async function saveLastCronState(env: Env, state: LastCronState): Promise<void> {
  await putStoredJson(env, LAST_CRON_KEY, state);
}
