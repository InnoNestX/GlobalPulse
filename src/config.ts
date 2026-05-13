import type { Env } from "./env";
import { type MarketCalendar, parseHolidayDates, readMarketCalendar } from "./market-calendar";
import { type ProviderName, providerNames } from "./messages";

export type AppLanguage = "zh" | "en";
export type OutputFormat = "markdown" | "text" | "json";

export interface PulseSchedule {
  id: string;
  name: string;
  enabled: boolean;
  time: string;
  days: number[];
  timezone: string;
  language: AppLanguage;
  outputFormat: OutputFormat;
  targets: ProviderName[];
  marketCalendar: MarketCalendar;
  marketHolidayDates: string[];
  topicQuery: string;
  sourceUrl?: string;
  template: string;
}

export interface AppSettings {
  appName: string;
  language: AppLanguage;
  timezone: string;
  defaultTargets: ProviderName[];
  outputFormat: OutputFormat;
  topicFocus: string;
  template: string;
  schedules: PulseSchedule[];
}

export interface DeliveryLog {
  id: string;
  scheduleId?: string;
  scheduleName?: string;
  ok: boolean;
  delivered: number;
  failed: number;
  message: string;
  createdAt: string;
}

const SETTINGS_KEY = "settings:v1";
const LOGS_KEY = "logs:recent:v1";

const zhTemplate = [
  "# GlobalPulse 热点简报",
  "",
  "- 时间：{{generatedAt}}",
  "- 时区：{{timezone}}",
  "- 主题：{{topicQuery}}",
  "",
  "{{itemsMarkdown}}",
  "",
  "> 数据来源：{{sourceUrl}}",
].join("\n");

const enTemplate = [
  "# GlobalPulse Brief",
  "",
  "- Time: {{generatedAt}}",
  "- Timezone: {{timezone}}",
  "- Focus: {{topicQuery}}",
  "",
  "{{itemsMarkdown}}",
  "",
  "> Source: {{sourceUrl}}",
].join("\n");

export function createDefaultSettings(): AppSettings {
  return {
    appName: "GlobalPulse",
    language: "zh",
    timezone: "Asia/Hong_Kong",
    defaultTargets: ["feishu"],
    outputFormat: "markdown",
    topicFocus: "全球金融市场、宏观经济、地缘政治与国际热点",
    template: zhTemplate,
    schedules: [
      {
        id: "asia-morning",
        name: "Asia Morning Pulse",
        enabled: true,
        time: "08:30",
        days: [1, 2, 3, 4, 5],
        timezone: "Asia/Hong_Kong",
        language: "zh",
        outputFormat: "markdown",
        targets: ["feishu"],
        marketCalendar: "a_share",
        marketHolidayDates: [],
        topicQuery: "global markets OR finance OR geopolitics",
        template: zhTemplate,
      },
      {
        id: "us-evening",
        name: "US Close Pulse",
        enabled: true,
        time: "21:30",
        days: [1, 2, 3, 4, 5],
        timezone: "Asia/Hong_Kong",
        language: "en",
        outputFormat: "markdown",
        targets: ["feishu"],
        marketCalendar: "us_stock",
        marketHolidayDates: [],
        topicQuery: "markets central banks geopolitics global economy",
        template: enTemplate,
      },
    ],
  };
}

export async function getSettings(env: Env): Promise<AppSettings> {
  const kv = requireKV(env);
  const stored = await kv.get<AppSettings>(SETTINGS_KEY, "json");

  return normalizeSettings(stored);
}

export async function saveSettings(env: Env, settings: unknown): Promise<AppSettings> {
  const kv = requireKV(env);
  const normalizedSettings = normalizeSettings(settings);
  await kv.put(SETTINGS_KEY, JSON.stringify(normalizedSettings));

  return normalizedSettings;
}

export async function getLogs(env: Env): Promise<DeliveryLog[]> {
  const kv = requireKV(env);
  const logs = await kv.get<DeliveryLog[]>(LOGS_KEY, "json");

  return Array.isArray(logs) ? logs : [];
}

export async function appendLog(env: Env, log: DeliveryLog): Promise<void> {
  const kv = requireKV(env);
  const logs = await getLogs(env);
  logs.unshift(log);
  await kv.put(LOGS_KEY, JSON.stringify(logs.slice(0, 50)));
}

export function getRunMarkerKey(scheduleId: string, localDate: string, localTime: string): string {
  return `runs:v1:${scheduleId}:${localDate}:${localTime}`;
}

export function requireKV(env: Env): KVNamespace {
  if (!env.APP_KV) {
    throw new Error("APP_KV KV namespace is not configured");
  }

  return env.APP_KV;
}

function normalizeSettings(value: unknown): AppSettings {
  const defaults = createDefaultSettings();

  if (!isRecord(value)) {
    return defaults;
  }

  const settings: AppSettings = {
    appName: readString(value.appName, defaults.appName).slice(0, 80),
    language: readLanguage(value.language, defaults.language),
    timezone: readString(value.timezone, defaults.timezone),
    defaultTargets: readTargets(value.defaultTargets, defaults.defaultTargets),
    outputFormat: readOutputFormat(value.outputFormat, defaults.outputFormat),
    topicFocus: readString(value.topicFocus, defaults.topicFocus).slice(0, 500),
    template: readString(value.template, defaults.template).slice(0, 8000),
    schedules: readSchedules(value.schedules, defaults.schedules),
  };

  return settings;
}

function readSchedules(value: unknown, fallback: PulseSchedule[]): PulseSchedule[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const schedules = value.flatMap((entry, index) => {
    if (!isRecord(entry)) {
      return [];
    }

    const schedule: PulseSchedule = {
      id: sanitizeId(readString(entry.id, `schedule-${index + 1}`)),
      name: readString(entry.name, `Schedule ${index + 1}`).slice(0, 100),
      enabled: typeof entry.enabled === "boolean" ? entry.enabled : true,
      time: readTime(entry.time, "09:00"),
      days: readDays(entry.days),
      timezone: readString(entry.timezone, "Asia/Hong_Kong"),
      language: readLanguage(entry.language, "zh"),
      outputFormat: readOutputFormat(entry.outputFormat, "markdown"),
      targets: readTargets(entry.targets, ["feishu"]),
      marketCalendar: readMarketCalendar(entry.marketCalendar, inferMarketCalendar(entry)),
      marketHolidayDates: parseHolidayDates(entry.marketHolidayDates),
      topicQuery: readString(entry.topicQuery, "global finance international news").slice(0, 300),
      template: readString(entry.template, readLanguage(entry.language, "zh") === "zh" ? zhTemplate : enTemplate).slice(0, 8000),
    };
    const sourceUrl = readOptionalUrl(entry.sourceUrl);

    if (sourceUrl) {
      schedule.sourceUrl = sourceUrl;
    }

    return [schedule];
  });

  return schedules.slice(0, 20);
}

function inferMarketCalendar(entry: Record<string, unknown>): MarketCalendar {
  const hint = `${typeof entry.id === "string" ? entry.id : ""} ${typeof entry.name === "string" ? entry.name : ""} ${typeof entry.topicQuery === "string" ? entry.topicQuery : ""}`.toLowerCase();

  if (hint.includes("crypto") || hint.includes("bitcoin") || hint.includes("btc")) {
    return "crypto";
  }

  if (hint.includes("us-") || hint.includes("us ") || hint.includes("nyse") || hint.includes("nasdaq")) {
    return "us_stock";
  }

  if (hint.includes("asia") || hint.includes("a-share") || hint.includes("ashare") || hint.includes("china")) {
    return "a_share";
  }

  return "everyday";
}

function readString(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : fallback;
}

function readLanguage(value: unknown, fallback: AppLanguage): AppLanguage {
  return value === "zh" || value === "en" ? value : fallback;
}

function readOutputFormat(value: unknown, fallback: OutputFormat): OutputFormat {
  return value === "markdown" || value === "text" || value === "json" ? value : fallback;
}

function readTargets(value: unknown, fallback: ProviderName[]): ProviderName[] {
  const rawTargets = Array.isArray(value) ? value : typeof value === "string" ? [value] : fallback;
  const targets = rawTargets.filter((target): target is ProviderName => (
    typeof target === "string" && providerNames.includes(target as ProviderName)
  ));

  return targets.length > 0 ? [...new Set(targets)] : fallback;
}

function readTime(value: unknown, fallback: string): string {
  if (typeof value === "string" && /^\d{2}:\d{2}$/.test(value)) {
    const [hour, minute] = value.split(":").map(Number);

    if (hour !== undefined && minute !== undefined && hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
      return value;
    }
  }

  return fallback;
}

function readDays(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [1, 2, 3, 4, 5];
  }

  const days = value.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6);

  return days.length > 0 ? [...new Set(days)] : [1, 2, 3, 4, 5];
}

function readOptionalUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  try {
    const url = new URL(value);

    return ["http:", "https:"].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function sanitizeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || crypto.randomUUID();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
