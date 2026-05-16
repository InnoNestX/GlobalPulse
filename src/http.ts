import type { Env } from "./env";
import { getLogs, getSettings, mergeProviderSettings, normalizeSettings, saveSettings, type AppSettings } from "./config";
import { renderAdminUiWithLogEnhancements } from "./admin-logs-enhance";
import { getMarketDataProviderSettings, saveMarketDataProviderSettings } from "./market-data-settings";
import { DEFAULT_GLOBALPULSE_LOGO_SRC } from "./providers/email-logo";
import { createDeliveryEnv, sendIncomingMessage } from "./delivery";
import { normalizeCloudflareEvent, normalizeGitHubActionsEvent } from "./events";
import { getProviderStatus } from "./providers";
import { HttpError, type IncomingMessageBody, normalizeMessage } from "./messages";
import { createSchedulePreview } from "./preview";
import { runSchedule, runScheduleById } from "./scheduler";
import { getLocalTimeParts } from "./time";

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
};

const GLOBALPULSE_PROJECT_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="GlobalPulse logo">
  <rect width="128" height="128" rx="28" fill="#f8fbff"/>
  <defs>
    <linearGradient id="a" x1="18" y1="24" x2="106" y2="104" gradientUnits="userSpaceOnUse">
      <stop stop-color="#073b9b"/>
      <stop offset=".72" stop-color="#073b9b"/>
      <stop offset="1" stop-color="#0bbfd3"/>
    </linearGradient>
    <linearGradient id="b" x1="15" y1="64" x2="114" y2="64" gradientUnits="userSpaceOnUse">
      <stop stop-color="#13c4d8"/>
      <stop offset="1" stop-color="#00a8c8"/>
    </linearGradient>
  </defs>
  <path d="M30 54a38 38 0 0 1 69-22" fill="none" stroke="url(#a)" stroke-width="9" stroke-linecap="round"/>
  <path d="M32 78a38 38 0 0 0 67 18" fill="none" stroke="url(#a)" stroke-width="9" stroke-linecap="round"/>
  <path d="M37 45c12-13 31-17 47-9 12 6 20 17 21 30-6 2-8 7-4 12-4 9-11 16-20 20-4-5 1-13-4-17-5-3-13 2-17-4-4-5 2-11 8-12 7-1 14 3 19-2 4-6-3-13-11-12-10 1-15 9-24 7-7-2-8-10-14-13z" fill="#073b9b"/>
  <circle cx="22" cy="67" r="7" fill="url(#b)"/>
  <path d="M22 67h35l6-13 8 33 13-51 12 53 10-22h17" fill="none" stroke="url(#b)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M94 64h22M92 75h29M106 86h16" fill="none" stroke="url(#b)" stroke-width="5" stroke-linecap="round"/>
  <circle cx="121" cy="64" r="3.5" fill="#13c4d8"/>
  <circle cx="124" cy="75" r="3.5" fill="#13c4d8"/>
</svg>`;

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return withCors(new Response(null, { status: 204 }), env);
  }

  try {
    if (request.method === "GET" && url.pathname === "/") {
      return Response.redirect(`${url.origin}/admin`, 302);
    }

    if (request.method === "GET" && url.pathname === "/assets/globalpulse-project-logo.svg") {
      return serveGlobalPulseSvgLogo();
    }

    if (request.method === "GET" && isGlobalPulseLogoPath(url.pathname)) {
      return serveGlobalPulseLogo(url.pathname.includes("v6") ? 31536000 : 3600);
    }

    if (request.method === "GET" && url.pathname === "/admin") {
      return renderAdminUiWithLogEnhancements();
    }

    if (request.method === "GET" && url.pathname === "/market-data-settings") {
      return Response.redirect(`${url.origin}/admin`, 302);
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true }, env);
    }

    if (url.pathname.startsWith("/api/admin/")) {
      return await handleAdminApi(request, env);
    }

    assertAuthenticated(request, env);

    if (request.method === "GET" && url.pathname === "/v1/providers") {
      return json({ providers: getProviderStatus(await createDeliveryEnv(env)) }, env);
    }

    if (request.method === "POST" && url.pathname === "/v1/messages") {
      const rawBody = await readJson(request);
      const incomingMessage = normalizeMessage(rawBody);

      return await deliverMessage(incomingMessage, env);
    }

    if (request.method === "POST" && url.pathname === "/v1/events/github-actions") {
      const rawBody = await readJson(request);
      const incomingMessage = normalizeGitHubActionsEvent(rawBody);

      return await deliverMessage(incomingMessage, env);
    }

    if (request.method === "POST" && url.pathname === "/v1/events/cloudflare") {
      const rawBody = await readOptionalJson(request);
      const incomingMessage = normalizeCloudflareEvent(rawBody, request);

      return await deliverMessage(incomingMessage, env);
    }

    return json({ error: "Not found" }, env, 404);
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ error: error.message, details: error.details }, env, error.status);
    }

    console.error(error);

    return json({ error: "Internal server error" }, env, 500);
  }
}

async function handleAdminApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "POST" && url.pathname === "/api/admin/login") {
    const body = await readJson(request);
    const password = isRecord(body) && typeof body.password === "string" ? body.password : getBearerToken(request);
    assertAdminPassword(password, env);

    return json({ ok: true }, env);
  }

  assertAdminAuthenticated(request, env);

  if (request.method === "GET" && url.pathname === "/api/admin/market-data-settings") {
    return json({ settings: await getMarketDataProviderSettings(env) }, env);
  }

  if (request.method === "PUT" && url.pathname === "/api/admin/market-data-settings") {
    const body = await readJson(request);
    return json({ settings: await saveMarketDataProviderSettings(env, body) }, env);
  }

  if (request.method === "GET" && url.pathname === "/api/admin/settings") {
    const settings = await getAdminSettings(env);

    return json({
      settings,
      providers: getProviderStatus(mergeProviderSettings(env, settings)),
    }, env);
  }

  if (request.method === "PUT" && url.pathname === "/api/admin/settings") {
    const body = await readJson(request);
    await saveMarketDataSettingsFromAdminPayload(env, body);
    let settings: AppSettings;
    try {
      settings = await saveSettings(env, body);
    } catch (error) {
      throw new HttpError(400, error instanceof Error ? error.message : "Invalid settings payload");
    }

    settings = await mergeMarketDataSettingsIntoAdminSettings(env, settings);

    return json({
      settings,
      providers: getProviderStatus(mergeProviderSettings(env, settings)),
    }, env);
  }

  if (request.method === "POST" && url.pathname === "/api/admin/preview") {
    const body = await readJson(request);
    const scheduleInput = isRecord(body) ? body.schedule : undefined;

    if (!scheduleInput) {
      throw new HttpError(400, "Field \"schedule\" is required");
    }

    const normalized = normalizeSettings({ schedules: [scheduleInput] });
    const schedule = normalized.schedules[0];

    if (!schedule) {
      throw new HttpError(400, "Field \"schedule\" must be an object");
    }

    return json({ preview: await createSchedulePreview(env, schedule) }, env);
  }

  if (request.method === "GET" && url.pathname === "/api/admin/logs") {
    const settings = await getSettings(env);
    return json({ logs: formatLogsForAdmin(await getLogs(env), settings).slice(0, 10) }, env);
  }

  if (request.method === "POST" && url.pathname === "/api/admin/run") {
    const body = await readJson(request);
    const scheduleInput = isRecord(body) ? body.schedule : undefined;
    const scheduleId = isRecord(body) && typeof body.scheduleId === "string" ? body.scheduleId : undefined;

    if (scheduleInput) {
      const normalized = normalizeSettings({ schedules: [scheduleInput] });
      const schedule = normalized.schedules[0];

      if (!schedule) {
        throw new HttpError(400, "Field \"schedule\" must be an object");
      }

      const summary = await runSchedule(env, schedule);
      return json({ ok: summary.ok, summary }, env, 202);
    }

    if (!scheduleId) {
      throw new HttpError(400, "Field \"scheduleId\" is required when \"schedule\" is not provided");
    }

    const summary = await runScheduleById(env, scheduleId);
    return json({ ok: summary.ok, summary }, env, 202);
  }

  return json({ error: "Not found" }, env, 404);
}

async function getAdminSettings(env: Env): Promise<AppSettings> {
  return mergeMarketDataSettingsIntoAdminSettings(env, await getSettings(env));
}

async function mergeMarketDataSettingsIntoAdminSettings(env: Env, settings: AppSettings): Promise<AppSettings> {
  const marketDataSettings = await getMarketDataProviderSettings(env);
  return {
    ...settings,
    providerSettings: {
      ...(settings.providerSettings || {}),
      ...marketDataSettings,
    },
  };
}

async function saveMarketDataSettingsFromAdminPayload(env: Env, body: unknown): Promise<void> {
  if (!isRecord(body) || !isRecord(body.providerSettings)) {
    return;
  }

  const existing = await getMarketDataProviderSettings(env);
  await saveMarketDataProviderSettings(env, {
    ...existing,
    alphaVantageApiKey: readOptionalAdminSetting(body.providerSettings.alphaVantageApiKey, existing.alphaVantageApiKey),
    finnhubApiKey: readOptionalAdminSetting(body.providerSettings.finnhubApiKey, existing.finnhubApiKey),
    twelveDataApiKey: readOptionalAdminSetting(body.providerSettings.twelveDataApiKey, existing.twelveDataApiKey),
    coingeckoApiKey: readOptionalAdminSetting(body.providerSettings.coingeckoApiKey, existing.coingeckoApiKey),
  });
}

function readOptionalAdminSetting(value: unknown, fallback: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("••••")) {
    return fallback;
  }
  return trimmed;
}

async function deliverMessage(incomingMessage: IncomingMessageBody, env: Env): Promise<Response> {
  const summary = await sendIncomingMessage(incomingMessage, env);
  const status = summary.failed > 0 ? 502 : 202;

  return json(summary, env, status);
}

function isGlobalPulseLogoPath(pathname: string): boolean {
  return pathname === "/assets/globalpulse-logo.jpg"
    || pathname === "/assets/globalpulse-project-logo.jpg"
    || pathname === "/assets/globalpulse-symbol-v5.jpg"
    || pathname === "/assets/globalpulse-symbol-v6.svg";
}

function serveGlobalPulseSvgLogo(): Response {
  return new Response(GLOBALPULSE_PROJECT_LOGO_SVG, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

function serveGlobalPulseLogo(maxAgeSeconds: number): Response {
  const { contentType, body } = decodeLogoAsset(DEFAULT_GLOBALPULSE_LOGO_SRC);
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${maxAgeSeconds}`,
    },
  });
}

function decodeLogoAsset(src: string): { contentType: string; body: string | Uint8Array } {
  const match = /^data:([^;,]+)(?:;charset=[^;,]+)?(;base64)?,(.*)$/s.exec(src);
  if (!match) return { contentType: "image/svg+xml; charset=utf-8", body: "" };
  const contentType = match[1] ?? "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const payload = match[3] ?? "";
  if (!isBase64) return { contentType, body: decodeURIComponent(payload) };
  const bytes = Uint8Array.from(atob(payload), (char) => char.charCodeAt(0));
  return { contentType, body: bytes };
}

function formatLogsForAdmin(logs: Awaited<ReturnType<typeof getLogs>>, settings: AppSettings): Awaited<ReturnType<typeof getLogs>> {
  const timezone = settings.timezone || "UTC";
  const language = settings.language || "zh";

  return logs.map((log) => {
    const parsed = new Date(log.createdAt);
    if (Number.isNaN(parsed.getTime())) {
      return log;
    }

    return {
      ...log,
      createdAt: `${getLocalTimeParts(parsed, timezone, language).label} (${timezone})`,
    };
  });
}

function assertAuthenticated(request: Request, env: Env): void {
  if (!env.API_TOKEN) {
    throw new HttpError(500, "API_TOKEN is not configured");
  }

  const apiKey = request.headers.get("X-API-Key");
  const suppliedToken = getBearerToken(request) || apiKey;

  if (!suppliedToken || suppliedToken !== env.API_TOKEN) {
    throw new HttpError(401, "Unauthorized");
  }
}

function assertAdminAuthenticated(request: Request, env: Env): void {
  const suppliedPassword = getBearerToken(request) || request.headers.get("X-Admin-Password") || undefined;
  assertAdminPassword(suppliedPassword, env);
}

function assertAdminPassword(suppliedPassword: string | undefined, env: Env): void {
  if (!env.ADMIN_PASSWORD) {
    throw new HttpError(500, "ADMIN_PASSWORD is not configured");
  }

  if (!suppliedPassword || suppliedPassword !== env.ADMIN_PASSWORD) {
    throw new HttpError(401, "Unauthorized");
  }
}

function getBearerToken(request: Request): string | undefined {
  const authorization = request.headers.get("Authorization");

  return authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : undefined;
}

async function readJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("Content-Type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new HttpError(415, "Content-Type must be application/json");
  }

  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
}

async function readOptionalJson(request: Request): Promise<unknown> {
  if (!request.body) {
    return {};
  }

  return readJson(request);
}

function json(body: unknown, env: Env, status = 200): Response {
  return withCors(new Response(JSON.stringify(body, null, 2), {
    status,
    headers: jsonHeaders,
  }), env);
}

function withCors(response: Response, env: Env): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", env.CORS_ORIGIN || "*");
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization,Content-Type,X-API-Key");
  headers.set("Vary", "Origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
