import type { IncomingMessageBody, MessageLevel, ProviderName } from "./messages";
import { HttpError, providerNames } from "./messages";

type MetadataValue = string | number | boolean | null;

const githubConclusionLevels: Record<string, MessageLevel> = {
  success: "success",
  failure: "error",
  cancelled: "warning",
  skipped: "warning",
  timed_out: "error",
  action_required: "warning",
  neutral: "info",
};

export function normalizeGitHubActionsEvent(input: unknown): IncomingMessageBody {
  const record = requireRecord(input);
  const repository = readString(record.repository) ?? readString(record.repo) ?? "unknown/repository";
  const workflow = readString(record.workflow) ?? readString(record.workflow_name) ?? "GitHub Actions";
  const runNumber = readString(record.run_number) ?? readString(record.runNumber);
  const ref = readString(record.ref);
  const sha = readString(record.sha);
  const actor = readString(record.actor);
  const status = readString(record.status);
  const conclusion = readString(record.conclusion);
  const url = readUrl(record.run_url) ?? readUrl(record.runUrl) ?? readUrl(record.html_url) ?? readUrl(record.url);
  const level = conclusion ? conclusionToLevel(conclusion) : statusToLevel(status);
  const title = readString(record.title) ?? `GitHub Actions: ${workflow}`;
  const body = readString(record.body) ?? [
    `${repository}${runNumber ? ` #${runNumber}` : ""}`,
    conclusion ? `Conclusion: ${conclusion}` : status ? `Status: ${status}` : undefined,
    ref ? `Ref: ${ref}` : undefined,
    sha ? `SHA: ${sha.slice(0, 12)}` : undefined,
    actor ? `Actor: ${actor}` : undefined,
  ].filter(Boolean).join("\n");

  return buildIncomingMessage(record, {
    title,
    body,
    level,
    url,
    tags: ["github-actions", ...readTags(record.tags)],
    metadata: {
      repository,
      workflow,
      ...(runNumber ? { run_number: runNumber } : {}),
      ...(ref ? { ref } : {}),
      ...(sha ? { sha } : {}),
      ...(actor ? { actor } : {}),
      ...(status ? { status } : {}),
      ...(conclusion ? { conclusion } : {}),
      ...readMetadata(record.metadata),
    },
  });
}

export function normalizeCloudflareEvent(input: unknown, request: Request): IncomingMessageBody {
  const record = input === undefined || input === null ? {} : requireRecord(input);
  const cf = readCloudflareProperties(request);
  const colo = cf.colo ?? "unknown colo";
  const country = cf.country ?? "unknown country";
  const city = cf.city;
  const title = readString(record.title) ?? "Cloudflare edge event";
  const body = readString(record.body) ?? [
    `Request observed at ${colo} from ${city ? `${city}, ` : ""}${country}.`,
    cf.httpProtocol ? `Protocol: ${cf.httpProtocol}` : undefined,
    cf.asOrganization ? `Network: ${cf.asOrganization}` : undefined,
  ].filter(Boolean).join("\n");
  const level = readLevel(record.level) ?? "info";
  const url = readUrl(record.url);

  return buildIncomingMessage(record, {
    title,
    body,
    level,
    url,
    tags: ["cloudflare", "edge", ...readTags(record.tags)],
    metadata: {
      ...cf,
      ...readMetadata(record.metadata),
    },
  });
}

function buildIncomingMessage(
  record: Record<string, unknown>,
  values: {
    title: string;
    body: string;
    level: MessageLevel;
    url: string | undefined;
    tags: string[];
    metadata: Record<string, MetadataValue>;
  },
): IncomingMessageBody {
  const message: IncomingMessageBody = {
    title: values.title.slice(0, 160),
    body: values.body.slice(0, 4000),
    level: values.level,
    tags: [...new Set(values.tags)].slice(0, 20),
    metadata: values.metadata,
  };

  const target = readTarget(record.target);

  if (target !== undefined) {
    message.target = target;
  }

  if (values.url) {
    message.url = values.url;
  }

  return message;
}

function conclusionToLevel(conclusion: string): MessageLevel {
  return githubConclusionLevels[conclusion.toLowerCase()] ?? "info";
}

function statusToLevel(status: string | undefined): MessageLevel {
  if (!status) {
    return "info";
  }

  return status.toLowerCase() === "completed" ? "success" : "info";
}

function readTarget(value: unknown): ProviderName | ProviderName[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map(readProviderName);
  }

  return readProviderName(value);
}

function readProviderName(value: unknown): ProviderName {
  if (typeof value === "string" && providerNames.includes(value as ProviderName)) {
    return value as ProviderName;
  }

  throw new HttpError(400, "Unsupported provider target", {
    supportedTargets: providerNames,
  });
}

function readLevel(value: unknown): MessageLevel | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (["info", "success", "warning", "error"].includes(String(value))) {
    return value as MessageLevel;
  }

  throw new HttpError(400, "Field \"level\" is invalid");
}

function readString(value: unknown): string | undefined {
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function readUrl(value: unknown): string | undefined {
  const rawValue = readString(value);

  if (!rawValue) {
    return undefined;
  }

  try {
    const url = new URL(rawValue);

    if (!["http:", "https:"].includes(url.protocol)) {
      return undefined;
    }

    return url.toString();
  } catch {
    return undefined;
  }
}

function readTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((tag) => {
    const normalizedTag = readString(tag);

    return normalizedTag ? [normalizedTag] : [];
  });
}

function readMetadata(value: unknown): Record<string, MetadataValue> {
  if (!isRecord(value)) {
    return {};
  }

  const metadata: Record<string, MetadataValue> = {};

  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean" || entry === null) {
      metadata[key] = entry;
    }
  }

  return metadata;
}

function readCloudflareProperties(request: Request): Record<string, MetadataValue> {
  const cf = "cf" in request && isRecord(request.cf) ? request.cf : {};
  const keys = [
    "colo",
    "country",
    "city",
    "region",
    "timezone",
    "latitude",
    "longitude",
    "httpProtocol",
    "tlsVersion",
    "clientTcpRtt",
    "asn",
    "asOrganization",
  ];
  const metadata: Record<string, MetadataValue> = {};

  for (const key of keys) {
    const value = cf[key];

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      metadata[key] = value;
    }
  }

  return metadata;
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new HttpError(400, "Request body must be a JSON object");
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
