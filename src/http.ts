import type { Env } from "./env";
import { getLogs, getSettings, mergeProviderSettings, normalizeSettings, saveSettings, type AppSettings } from "./config";
import { renderAdminUiWithSystemSections } from "./admin-system-sections";
import { getMarketDataProviderSettings, saveMarketDataProviderSettings } from "./market-data-settings";
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

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return withCors(new Response(null, { status: 204 }), env);
  }

  try {
    if (request.method === "GET" && url.pathname === "/") {
      return Response.redirect(`${url.origin}/admin`, 302);
    }

    if (request.method === "GET" && url.pathname === "/admin") {
      return renderAdminUiWithSystemSections();
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
    const settings = await getSettings(env);

    return json({
      settings,
      providers: getProviderStatus(mergeProviderSettings(env, settings)),
    }, env);
  }

  if (request.method === "PUT" && url.pathname === "/api/admin/settings") {
    const body = await readJson(request);
    let settings: AppSettings;
    try {
      settings = await saveSettings(env, body);
    } catch (error) {
      throw new HttpError(400, error instanceof Error ? error.message : "Invalid settings payload");
    }

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
    return json({ logs: formatLogsForAdmin(await getLogs(env), settings) }, env);
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

async function deliverMessage(incomingMessage: IncomingMessageBody, env: Env): Promise<Response> {
  const summary = await sendIncomingMessage(incomingMessage, env);
  const status = summary.failed > 0 ? 502 : 202;

  return json(summary, env, status);
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
