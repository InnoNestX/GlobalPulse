import type { ProviderResult } from "./types";

export function providerNotConfigured(provider: ProviderResult["provider"]): ProviderResult {
  return {
    provider,
    ok: false,
    status: 500,
    message: `Provider "${provider}" is not configured`,
  };
}

export async function responseToResult(provider: ProviderResult["provider"], response: Response): Promise<ProviderResult> {
  const responseText = await response.text().catch(() => "");

  return {
    provider,
    ok: response.ok,
    status: response.status,
    message: response.ok ? "Delivered" : responseText.slice(0, 300) || "Provider request failed",
  };
}

export async function jsonApiResponseToResult(
  provider: ProviderResult["provider"],
  response: Response,
  isSuccess: (body: Record<string, unknown>) => boolean,
): Promise<ProviderResult> {
  const rawText = await response.text().catch(() => "");
  const body = parseJsonObject(rawText);
  const ok = response.ok && Boolean(body && isSuccess(body));

  return {
    provider,
    ok,
    status: response.status,
    message: ok ? "Delivered" : summarizeJsonError(body) || rawText.slice(0, 300) || "Provider request failed",
  };
}

function parseJsonObject(rawText: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(rawText);

    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function summarizeJsonError(body: Record<string, unknown> | undefined): string | undefined {
  if (!body) {
    return undefined;
  }

  const code = body.errcode ?? body.code;
  const message = body.errmsg ?? body.msg ?? body.message;

  if (code !== undefined || message !== undefined) {
    return `Provider error ${String(code ?? "unknown")}: ${String(message ?? "unknown")}`;
  }

  return undefined;
}
