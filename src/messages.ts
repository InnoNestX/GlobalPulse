export const providerNames = ["feishu", "wechat_official_account", "wechat_clawbot", "telegram"] as const;

export type ProviderName = (typeof providerNames)[number];

const providerAliases: Record<string, ProviderName> = {
  wechat_ai_agent: "wechat_clawbot",
  wechat_ai: "wechat_clawbot",
  wechat_oa: "wechat_official_account",
};

export const messageLevels = ["info", "success", "warning", "error"] as const;

export type MessageLevel = (typeof messageLevels)[number];

export interface PushMessage {
  title: string;
  body: string;
  level: MessageLevel;
  url?: string;
  tags: string[];
  metadata: Record<string, string | number | boolean | null>;
}

export interface IncomingMessageBody {
  target?: ProviderName | ProviderName[];
  title: string;
  body: string;
  level?: MessageLevel;
  url?: string;
  tags?: string[];
  metadata?: Record<string, string | number | boolean | null>;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export function parseProviderName(value: unknown): ProviderName {
  const providerName = coerceProviderName(value);

  if (providerName) {
    return providerName;
  }

  throw new HttpError(400, "Unsupported provider target", {
    supportedTargets: providerNames,
  });
}

export function coerceProviderName(value: unknown): ProviderName | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim();

  if (providerNames.includes(normalizedValue as ProviderName)) {
    return normalizedValue as ProviderName;
  }

  return providerAliases[normalizedValue];
}

export function normalizeTargets(value: unknown, fallbackTargets: ProviderName[]): ProviderName[] {
  if (value === undefined || value === null) {
    if (fallbackTargets.length === 0) {
      throw new HttpError(400, "Message target is required when DEFAULT_TARGETS is empty");
    }

    return fallbackTargets;
  }

  const rawTargets = Array.isArray(value) ? value : [value];
  const targets = rawTargets.map(parseProviderName);

  if (targets.length === 0) {
    throw new HttpError(400, "At least one message target is required");
  }

  return [...new Set(targets)];
}

export function parseDefaultTargets(rawValue: string | undefined): ProviderName[] {
  if (!rawValue?.trim()) {
    return [];
  }

  return rawValue
    .split(",")
    .map((target) => target.trim())
    .filter(Boolean)
    .map(parseProviderName);
}

export function normalizeMessage(input: unknown): IncomingMessageBody {
  if (!isRecord(input)) {
    throw new HttpError(400, "Request body must be a JSON object");
  }

  const title = readRequiredString(input, "title", 160);
  const body = readRequiredString(input, "body", 4000);
  const level = readLevel(input.level);
  const url = readOptionalUrl(input.url);
  const tags = readTags(input.tags);
  const metadata = readMetadata(input.metadata);

  const message: IncomingMessageBody = {
    title,
    body,
    level,
    tags,
    metadata,
  };

  if (input.target !== undefined) {
    message.target = input.target as ProviderName | ProviderName[];
  }

  if (url) {
    message.url = url;
  }

  return message;
}

export function toPushMessage(input: IncomingMessageBody): PushMessage {
  return {
    title: input.title,
    body: input.body,
    level: input.level ?? "info",
    ...(input.url ? { url: input.url } : {}),
    tags: input.tags ?? [],
    metadata: input.metadata ?? {},
  };
}

function readRequiredString(record: Record<string, unknown>, key: string, maxLength: number): string {
  const value = record[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(400, `Field "${key}" must be a non-empty string`);
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length > maxLength) {
    throw new HttpError(400, `Field "${key}" must be at most ${maxLength} characters`);
  }

  return trimmedValue;
}

function readLevel(value: unknown): MessageLevel {
  if (value === undefined || value === null) {
    return "info";
  }

  if (typeof value === "string" && messageLevels.includes(value as MessageLevel)) {
    return value as MessageLevel;
  }

  throw new HttpError(400, "Field \"level\" is invalid", {
    supportedLevels: messageLevels,
  });
}

function readOptionalUrl(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, "Field \"url\" must be a URL string");
  }

  try {
    const url = new URL(value);

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Unsupported protocol");
    }

    return url.toString();
  } catch {
    throw new HttpError(400, "Field \"url\" must be a valid http or https URL");
  }
}

function readTags(value: unknown): string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new HttpError(400, "Field \"tags\" must be an array of strings");
  }

  const tags = value.map((tag) => {
    if (typeof tag !== "string" || tag.trim().length === 0) {
      throw new HttpError(400, "Field \"tags\" must only contain non-empty strings");
    }

    return tag.trim();
  });

  return [...new Set(tags)].slice(0, 20);
}

function readMetadata(value: unknown): Record<string, string | number | boolean | null> {
  if (value === undefined || value === null) {
    return {};
  }

  if (!isRecord(value)) {
    throw new HttpError(400, "Field \"metadata\" must be an object");
  }

  const metadata: Record<string, string | number | boolean | null> = {};

  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean" || entry === null) {
      metadata[key] = entry;
      continue;
    }

    throw new HttpError(400, "Field \"metadata\" values must be string, number, boolean, or null");
  }

  return metadata;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
