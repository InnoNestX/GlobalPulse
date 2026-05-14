import type { Env } from "./env";
import { type MarketCalendar, type TradingDaySource, parseHolidayDates, readMarketCalendar, readTradingDaySource } from "./market-calendar";
import { coerceProviderName, type ProviderName } from "./messages";
import { getStoredJson, getStoredText, putStoredJson, putStoredText } from "./state-store";
import { isCronExpressionFiveMinuteCompatible, validateCronExpression } from "./cron";

export type AppLanguage = "zh" | "en";
export type OutputFormat = "markdown" | "text" | "json";
export type TriggerMode = "slots" | "cron";
export type ReportType = "a_share" | "us_stock" | "crypto" | "daily_hot" | "custom";
export type ReportMode = "digest" | "market";
export type MarketSession = "pre_open" | "intraday" | "post_close";

/** All available report modules — each can be toggled on/off independently. */
export type ReportModule =
  | "us_market"    // US stock ETF quotes + movers
  | "a_share"      // A-share index quotes
  | "crypto"       // Crypto spot prices
  | "fear_greed"   // Fear & Greed Index
  | "technicals"   // RSI / MA technical signals
  | "sentiment"    // News-based sentiment scoring
  | "news"         // News summary (Google News + Sina + HN)
  | "catalysts"    // Key policy / event catalysts extracted from news
  | "x_sentiment"  // X/Twitter sentiment (requires API token)
  | "positions"    // Position holders: live quotes + news narrative
  | "macro";       // Macro background (Fed, CPI, earnings season)

export interface ReportModuleSwitches {
  us_market?: boolean;   // default: true
  a_share?: boolean;     // default: false
  crypto?: boolean;      // default: false
  fear_greed?: boolean;  // default: false
  technicals?: boolean;  // default: false
  sentiment?: boolean;   // default: false
  news?: boolean;        // default: true
  catalysts?: boolean;   // default: false
  x_sentiment?: boolean; // default: false
  positions?: boolean;   // default: false
  macro?: boolean;       // default: false
}

export interface PulseSchedule {
  id: string;
  name: string;
  enabled: boolean;
  triggerMode: TriggerMode;
  skipNonTradingInCron: boolean;
  cronExpression?: string;
  time: string;
  days: number[];
  timezone: string;
  language: AppLanguage;
  outputFormat: OutputFormat;
  reportType: ReportType;
  reportMode: ReportMode;
  marketSession: MarketSession;
  focusSymbols: string[];
  positionSymbols: string[];
  moduleSwitches: ReportModuleSwitches;
  /** IDs of email recipients to send to for this schedule. Empty = no email for this schedule. */
  emailRecipientIds: string[];
  targets: ProviderName[];
  marketCalendar: MarketCalendar;
  tradingDaySource: TradingDaySource;
  marketHolidayDates: string[];
  topicQuery: string;
  sourceUrl?: string;
  template: string;
}

/** Single email recipient entry in the global address book. */
export interface EmailRecipient {
  id: string;       // unique stable ID (nanoid or uuid)
  address: string;  // email address
  note: string;     // display label / remark, e.g. "主送" or "量化团队"
  enabled: boolean; // soft delete — false = hidden from UI
}

export interface ProviderSettings {
  feishuWebhookUrl?: string;
  feishuSigningSecret?: string;
  wechatOfficialAppId?: string;
  wechatOfficialAppSecret?: string;
  wechatOfficialOpenId?: string;
  wechatClawbotWebhookUrl?: string;
  wechatClawbotWebhookKey?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  brevoApiKey?: string;
  emailFrom?: string;
  /** Optional override of the global EMAIL_FROM for this user */
  emailFromOverride?: string;
}

export interface AppSettings {
  appName: string;
  language: AppLanguage;
  timezone: string;
  defaultTargets: ProviderName[];
  outputFormat: OutputFormat;
  topicFocus: string;
  providerSettings: ProviderSettings;
  /** Global email address book — used by all schedules that send email */
  emailRecipients: EmailRecipient[];
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

type EnvStringKey = Exclude<{
  [Key in keyof Env]: Env[Key] extends string | undefined ? Key : never
}[keyof Env], undefined>;

const SETTINGS_KEY = "settings:v1";
const LOGS_KEY = "logs:recent:v1";

const zhTemplate = [
  "# GlobalPulse 热点简报",
  "",
  "- 时间：{{generatedAt}}",
  "- 时区：{{timezone}}",
  "- 主题：{{topicQuery}}",
  "",
  "{{marketReport}}",
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
  "{{marketReport}}",
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
    providerSettings: {},
    emailRecipients: [],
    template: zhTemplate,
    schedules: [
      {
        id: "asia-morning",
        name: "Asia Morning Pulse",
        enabled: true,
        triggerMode: "slots",
        skipNonTradingInCron: false,
        time: "08:30",
        days: [1, 2, 3, 4, 5],
        timezone: "Asia/Hong_Kong",
        language: "zh",
        outputFormat: "markdown",
        reportType: "a_share",
        reportMode: "market",
        marketSession: "pre_open",
        focusSymbols: [],
        positionSymbols: [],
        emailRecipientIds: [],
        moduleSwitches: {
          news: true,
          us_market: false,
          a_share: false,
          crypto: false,
          fear_greed: false,
          technicals: false,
          sentiment: false,
          catalysts: false,
          x_sentiment: false,
          positions: false,
          macro: false,
        },
        targets: ["feishu"],
        marketCalendar: "a_share",
        tradingDaySource: "external",
        marketHolidayDates: [],
        topicQuery: "global markets OR finance OR geopolitics",
        template: zhTemplate,
      },
      {
        id: "us-evening",
        name: "US Close Pulse",
        enabled: true,
        triggerMode: "slots",
        skipNonTradingInCron: false,
        time: "21:30",
        days: [1, 2, 3, 4, 5],
        timezone: "Asia/Hong_Kong",
        language: "en",
        outputFormat: "markdown",
        reportType: "us_stock",
        reportMode: "market",
        marketSession: "post_close",
        focusSymbols: [],
        positionSymbols: [],
        emailRecipientIds: [],
        moduleSwitches: {
          news: true,
          us_market: true,
          fear_greed: true,
          technicals: true,
          sentiment: true,
          catalysts: true,
          positions: true,
          macro: true,
          a_share: false,
          crypto: false,
          x_sentiment: false,
        },
        targets: ["feishu"],
        marketCalendar: "us_stock",
        tradingDaySource: "external",
        marketHolidayDates: [],
        topicQuery: "markets central banks geopolitics global economy",
        template: enTemplate,
      },
    ],
  };
}

export async function getSettings(env: Env): Promise<AppSettings> {
  const stored = await getStoredJson<AppSettings>(env, SETTINGS_KEY);

  return normalizeSettings(stored);
}

export async function saveSettings(env: Env, settings: unknown): Promise<AppSettings> {
  validateStrictSchedulesForSave(settings);
  const normalizedSettings = normalizeSettings(settings);
  await putStoredJson(env, SETTINGS_KEY, normalizedSettings);

  return normalizedSettings;
}

export async function getLogs(env: Env): Promise<DeliveryLog[]> {
  const logs = await getStoredJson<DeliveryLog[]>(env, LOGS_KEY);

  if (!Array.isArray(logs)) {
    return [];
  }

  return logs;
}

export async function appendLog(env: Env, log: DeliveryLog): Promise<void> {
  const logs = await getLogs(env);
  logs.unshift(log);
  await putStoredJson(env, LOGS_KEY, logs.slice(0, 50));
}

export function getRunMarkerKey(scheduleId: string, localDate: string, localTime: string): string {
  return `runs:v1:${scheduleId}:${localDate}:${localTime}`;
}

export async function getRunMarker(env: Env, scheduleId: string, localDate: string, localTime: string): Promise<string | null> {
  return getStoredText(env, getRunMarkerKey(scheduleId, localDate, localTime));
}

export async function setRunMarker(
  env: Env,
  scheduleId: string,
  localDate: string,
  localTime: string,
  value: string,
): Promise<void> {
  await putStoredText(env, getRunMarkerKey(scheduleId, localDate, localTime), value, 60 * 60 * 36);
}

export function requireKV(env: Env): KVNamespace {
  if (!env.APP_KV) {
    throw new Error("APP_KV KV namespace is not configured");
  }

  return env.APP_KV;
}

export function normalizeSettings(value: unknown): AppSettings {
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
    providerSettings: readProviderSettings(value.providerSettings),
    emailRecipients: readEmailRecipients(value.emailRecipients),
    template: readString(value.template, defaults.template).slice(0, 8000),
    schedules: readSchedules(value.schedules, defaults.schedules),
  };

  return settings;
}

export function mergeProviderSettings(env: Env, settings: AppSettings): Env {
  const providerSettings = settings.providerSettings;
  const deliveryEnv: Env = { ...env };

  assignIfMissing(deliveryEnv, "FEISHU_WEBHOOK_URL", providerSettings.feishuWebhookUrl);
  assignIfMissing(deliveryEnv, "FEISHU_SIGNING_SECRET", providerSettings.feishuSigningSecret);
  assignIfMissing(deliveryEnv, "WECHAT_OFFICIAL_APP_ID", providerSettings.wechatOfficialAppId);
  assignIfMissing(deliveryEnv, "WECHAT_OFFICIAL_APP_SECRET", providerSettings.wechatOfficialAppSecret);
  assignIfMissing(deliveryEnv, "WECHAT_OFFICIAL_OPENID", providerSettings.wechatOfficialOpenId);
  assignIfMissing(deliveryEnv, "WECHAT_CLAWBOT_WEBHOOK_URL", providerSettings.wechatClawbotWebhookUrl);
  assignIfMissing(deliveryEnv, "WECHAT_CLAWBOT_WEBHOOK_KEY", providerSettings.wechatClawbotWebhookKey);
  assignIfMissing(deliveryEnv, "TELEGRAM_BOT_TOKEN", providerSettings.telegramBotToken);
  assignIfMissing(deliveryEnv, "TELEGRAM_CHAT_ID", providerSettings.telegramChatId);
  assignIfMissing(deliveryEnv, "BREVO_API_KEY", providerSettings.brevoApiKey);
  assignIfMissing(deliveryEnv, "EMAIL_FROM", providerSettings.emailFrom);

  if (providerSettings.emailFromOverride) {
    (deliveryEnv as Env & { EMAIL_FROM_OVERRIDE?: string }).EMAIL_FROM_OVERRIDE = providerSettings.emailFromOverride;
  }

  return deliveryEnv;
}

function readEmailRecipients(value: unknown): EmailRecipient[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): EmailRecipient[] => {
    if (!isRecord(entry)) return [];
    const id = String(entry.id ?? Math.random().toString(36).slice(2));
    const address = readString(entry.address, "").trim();
    if (!address || !address.includes("@")) return [];
    return [{
      id,
      address,
      note: readString(entry.note, "").trim().slice(0, 100),
      enabled: typeof entry.enabled === "boolean" ? entry.enabled : true,
    }];
  });
}

function readSchedules(value: unknown, fallback: PulseSchedule[]): PulseSchedule[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const schedules = value.flatMap((entry, index) => {
    if (!isRecord(entry)) {
      return [];
    }

    const cronExpression = readCronExpression(entry.cronExpression);
    const scheduleBase = {
      id: sanitizeId(readString(entry.id, `schedule-${index + 1}`)),
      name: readString(entry.name, `Schedule ${index + 1}`).slice(0, 100),
      enabled: typeof entry.enabled === "boolean" ? entry.enabled : true,
      triggerMode: readTriggerMode(entry.triggerMode, typeof entry.cronExpression === "string" ? "cron" : "slots"),
      skipNonTradingInCron: typeof entry.skipNonTradingInCron === "boolean" ? entry.skipNonTradingInCron : false,
      time: readTime(entry.time, "09:00"),
      days: readDays(entry.days),
      timezone: readString(entry.timezone, "Asia/Hong_Kong"),
      language: readLanguage(entry.language, "zh"),
      outputFormat: readOutputFormat(entry.outputFormat, "markdown"),
      reportType: readReportType(entry.reportType, inferReportType(entry)),
      reportMode: readReportMode(entry.reportMode),
      marketSession: readMarketSession(entry.marketSession, inferMarketSession(entry)),
      focusSymbols: readSymbols(entry.focusSymbols),
      positionSymbols: readSymbols(entry.positionSymbols),
      emailRecipientIds: readEmailRecipientIds(entry.emailRecipientIds),
      moduleSwitches: readModuleSwitches(entry.moduleSwitches),
      targets: readTargets(entry.targets, ["feishu"]),
      marketCalendar: readMarketCalendar(entry.marketCalendar, inferMarketCalendar(entry)),
      tradingDaySource: readTradingDaySource(entry.tradingDaySource, inferTradingDaySource(entry)),
      marketHolidayDates: parseHolidayDates(entry.marketHolidayDates),
      topicQuery: readString(entry.topicQuery, "global finance international news").slice(0, 300),
      template: readString(entry.template, readLanguage(entry.language, "zh") === "zh" ? zhTemplate : enTemplate).slice(0, 8000),
    };
    const schedule: PulseSchedule = cronExpression
      ? { ...scheduleBase, cronExpression }
      : scheduleBase;
    const sourceUrl = readOptionalUrl(entry.sourceUrl);

    if (sourceUrl) {
      schedule.sourceUrl = sourceUrl;
    }

    if (schedule.triggerMode === "slots") {
      delete schedule.cronExpression;
    } else if (!schedule.cronExpression) {
      schedule.triggerMode = "slots";
    }

    if (schedule.marketCalendar === "a_share" || schedule.marketCalendar === "us_stock") {
      schedule.tradingDaySource = "external";
      schedule.marketHolidayDates = [];
    }

    return [schedule];
  });

  return schedules.slice(0, 20);
}

function readEmailRecipientIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((id) => String(id)).filter(Boolean).slice(0, 50);
}

function readModuleSwitches(value: unknown): ReportModuleSwitches {
  const defaults: Required<ReportModuleSwitches> = {
    us_market: true,
    a_share: false,
    crypto: false,
    fear_greed: false,
    technicals: false,
    sentiment: false,
    news: true,
    catalysts: false,
    x_sentiment: false,
    positions: false,
    macro: false,
  };

  if (!isRecord(value)) {
    return defaults;
  }

  return {
    us_market: typeof value.us_market === "boolean" ? value.us_market : defaults.us_market,
    a_share: typeof value.a_share === "boolean" ? value.a_share : defaults.a_share,
    crypto: typeof value.crypto === "boolean" ? value.crypto : defaults.crypto,
    fear_greed: typeof value.fear_greed === "boolean" ? value.fear_greed : defaults.fear_greed,
    technicals: typeof value.technicals === "boolean" ? value.technicals : defaults.technicals,
    sentiment: typeof value.sentiment === "boolean" ? value.sentiment : defaults.sentiment,
    news: typeof value.news === "boolean" ? value.news : defaults.news,
    catalysts: typeof value.catalysts === "boolean" ? value.catalysts : defaults.catalysts,
    x_sentiment: typeof value.x_sentiment === "boolean" ? value.x_sentiment : defaults.x_sentiment,
    positions: typeof value.positions === "boolean" ? value.positions : defaults.positions,
    macro: typeof value.macro === "boolean" ? value.macro : defaults.macro,
  };
}

function readProviderSettings(value: unknown): ProviderSettings {
  if (!isRecord(value)) {
    return {};
  }

  return {
    ...readOptionalUrlSetting(value.feishuWebhookUrl, "feishuWebhookUrl"),
    ...readOptionalSecret(value.feishuSigningSecret, "feishuSigningSecret", 500),
    ...readOptionalSecret(value.wechatOfficialAppId, "wechatOfficialAppId", 180),
    ...readOptionalSecret(value.wechatOfficialAppSecret, "wechatOfficialAppSecret", 260),
    ...readOptionalSecret(value.wechatOfficialOpenId, "wechatOfficialOpenId", 260),
    ...readOptionalUrlSetting(value.wechatClawbotWebhookUrl ?? value.wechatAiAgentWebhookUrl, "wechatClawbotWebhookUrl"),
    ...readOptionalSecret(value.wechatClawbotWebhookKey ?? value.wechatAiAgentWebhookKey, "wechatClawbotWebhookKey", 260),
    ...readOptionalSecret(value.telegramBotToken, "telegramBotToken", 260),
    ...readOptionalSecret(value.telegramChatId, "telegramChatId", 180),
    ...readOptionalSecret(value.brevoApiKey, "brevoApiKey", 260),
    ...readOptionalSecret(value.emailFrom, "emailFrom", 200),
    ...readOptionalSecret(value.emailFromOverride, "emailFromOverride", 200),
  };
}

function assignIfMissing(env: Env, key: EnvStringKey, value: string | undefined): void {
  if (!env[key] && value) {
    env[key] = value;
  }
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

function inferTradingDaySource(entry: Record<string, unknown>): TradingDaySource {
  const calendar = readMarketCalendar(entry.marketCalendar, inferMarketCalendar(entry));

  return calendar === "a_share" || calendar === "us_stock" ? "external" : "weekday";
}

function inferReportType(entry: Record<string, unknown>): ReportType {
  const calendar = readMarketCalendar(entry.marketCalendar, inferMarketCalendar(entry));

  if (calendar === "a_share") return "a_share";
  if (calendar === "us_stock") return "us_stock";
  if (calendar === "crypto") return "crypto";

  const hint = `${typeof entry.id === "string" ? entry.id : ""} ${typeof entry.name === "string" ? entry.name : ""} ${typeof entry.topicQuery === "string" ? entry.topicQuery : ""}`.toLowerCase();
  if (hint.includes("hot") || hint.includes("热点")) return "daily_hot";

  return "custom";
}

function inferMarketSession(entry: Record<string, unknown>): MarketSession {
  const hint = `${typeof entry.id === "string" ? entry.id : ""} ${typeof entry.name === "string" ? entry.name : ""}`.toLowerCase();

  if (hint.includes("pre") || hint.includes("开盘前")) return "pre_open";
  if (hint.includes("盘中") || hint.includes("intraday") || hint.includes("midday")) return "intraday";
  if (hint.includes("盘后") || hint.includes("close") || hint.includes("post")) return "post_close";

  return "intraday";
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

function readReportMode(value: unknown): ReportMode {
  return value === "market" || value === "digest" ? value : "market";
}

function readMarketSession(value: unknown, fallback: MarketSession): MarketSession {
  return value === "pre_open" || value === "intraday" || value === "post_close" ? value : fallback;
}

function readOutputFormat(value: unknown, fallback: OutputFormat): OutputFormat {
  return value === "markdown" || value === "text" || value === "json" ? value : fallback;
}

function readTriggerMode(value: unknown, fallback: TriggerMode): TriggerMode {
  return value === "slots" || value === "cron" ? value : fallback;
}

function readReportType(value: unknown, fallback: ReportType): ReportType {
  return value === "a_share"
    || value === "us_stock"
    || value === "crypto"
    || value === "daily_hot"
    || value === "custom"
    ? value
    : fallback;
}

function readTargets(value: unknown, fallback: ProviderName[]): ProviderName[] {
  const rawTargets = Array.isArray(value) ? value : typeof value === "string" ? [value] : fallback;
  const targets = rawTargets.flatMap((target) => {
    const providerName = coerceProviderName(target);

    return providerName ? [providerName] : [];
  });

  return targets.length > 0 ? [...new Set(targets)] : fallback;
}

function readOptionalSecret(value: unknown, key: keyof ProviderSettings, maxLength: number): Partial<ProviderSettings> {
  if (typeof value !== "string") {
    return {};
  }

  const trimmedValue = value.trim();

  return trimmedValue ? { [key]: trimmedValue.slice(0, maxLength) } : {};
}

function readCronExpression(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const cron = value.trim();

  if (!cron) {
    return undefined;
  }

  const validation = validateCronExpression(cron);

  return validation.ok ? cron : undefined;
}

function readOptionalUrlSetting(value: unknown, key: keyof ProviderSettings): Partial<ProviderSettings> {
  const url = readOptionalUrl(value);

  return url ? { [key]: url } : {};
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

function readSymbols(value: unknown): string[] {
  const rawEntries = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\s,\n]+/)
      : [];

  const symbols = rawEntries.flatMap((entry) => {
    if (typeof entry !== "string") {
      return [];
    }

    const normalized = entry.trim().toUpperCase();

    if (!normalized) {
      return [];
    }

    const cleaned = normalized.replace(/[^A-Z0-9._:-]/g, "");

    return cleaned ? [cleaned.slice(0, 20)] : [];
  });

  return [...new Set(symbols)].slice(0, 80);
}

function sanitizeId(value: string): string {
  let result = "";
  for (const char of value.toLowerCase()) {
    if ((char >= "a" && char <= "z") || (char >= "0" && char <= "9") || char === "_" || char === "-") {
      result += char;
      if (result.length === 64) break;
    } else if (result.length > 0) {
      result += "-";
    }
  }
  // Manually collapse runs of '-' to a single '-', then trim leading/trailing '-'
  let collapsed = "";
  let lastDash = false;
  for (const char of result) {
    if (char === "-") {
      if (!lastDash) { collapsed += char; lastDash = true; }
    } else {
      collapsed += char; lastDash = false;
    }
  }
  // Trim leading and trailing dashes without regex
  let start = 0, end = collapsed.length - 1;
  while (start < collapsed.length && collapsed[start] === "-") start++;
  while (end >= start && collapsed[end] === "-") end--;
  return (collapsed.slice(start, end + 1) || crypto.randomUUID());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateStrictSchedulesForSave(settings: unknown): void {
  if (!isRecord(settings)) {
    return;
  }

  const schedules = settings.schedules;

  if (!Array.isArray(schedules)) {
    return;
  }

  for (let index = 0; index < schedules.length; index += 1) {
    const schedule = schedules[index];

    if (!isRecord(schedule)) {
      continue;
    }

    const triggerModeValue = schedule.triggerMode;
    const triggerMode = triggerModeValue === "cron" || triggerModeValue === "slots"
      ? triggerModeValue
      : typeof schedule.cronExpression === "string"
        ? "cron"
        : "slots";

    if (triggerMode !== "cron") {
      continue;
    }

    if (typeof schedule.cronExpression !== "string" || schedule.cronExpression.trim().length === 0) {
      throw new Error(`Schedule #${index + 1}: cronExpression is required when triggerMode is cron`);
    }

    const cron = schedule.cronExpression.trim();
    const validation = validateCronExpression(cron);

    if (!validation.ok) {
      throw new Error(`Schedule #${index + 1}: invalid cron expression (${validation.error ?? "invalid format"})`);
    }

    if (!isCronExpressionFiveMinuteCompatible(cron)) {
      throw new Error(`Schedule #${index + 1}: cron minute field must be compatible with 5-minute worker polling`);
    }
  }
}
