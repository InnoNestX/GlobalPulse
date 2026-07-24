import { appendLog, getSettings, type AppSettings } from "../config";
import { sendIncomingMessage } from "../delivery";
import type { Env } from "../env";
import { getStoredText, putStoredText } from "../state-store";
import { evaluateAutopilotRule } from "./evaluate";
import { createDefaultAutopilotSettings, type AutopilotRunResult, type AutopilotSettings } from "./types";

export async function runAutopilotRadar(env: Env, now = new Date()): Promise<AutopilotRunResult> {
  const settings = await getSettings(env);
  const autopilot = settings.autopilot ?? createDefaultAutopilotSettings();
  if (!autopilot.enabled) {
    return { checked: 0, triggered: 0, skipped: 0, triggers: [] };
  }

  const enabledRules = autopilot.rules.filter((rule) => rule.enabled);
  let triggered = 0;
  let skipped = 0;
  const triggers = [];

  for (const rule of enabledRules) {
    if (await isCoolingDown(env, rule.id, now)) {
      skipped += 1;
      continue;
    }

    const hit = await evaluateAutopilotRule(env, settings, rule, now);
    if (!hit) {
      skipped += 1;
      continue;
    }

    const targets = rule.targets.length ? rule.targets : settings.defaultTargets;
    if (!targets.length) {
      skipped += 1;
      continue;
    }

    const summary = await sendIncomingMessage({
      target: targets,
      title: hit.title,
      body: hit.body,
      level: rule.severity,
      tags: ["globalpulse", "autopilot", rule.id, rule.kind],
      metadata: {
        kind: "autopilot",
        rule_id: rule.id,
        reason: hit.reason,
      },
    }, env, settings);

    await appendLog(env, {
      id: crypto.randomUUID(),
      scheduleName: `autopilot:${rule.id}`,
      ok: summary.ok,
      delivered: summary.delivered,
      failed: summary.failed,
      message: summary.ok
        ? ((settings.language || "zh") === "en" ? `Autopilot triggered: ${hit.reason}` : `自动雷达已触发：${hit.reason}`)
        : ((settings.language || "zh") === "en"
          ? `Autopilot delivery failed: ${summary.results.filter((result) => !result.ok).map((result) => result.message).join("; ")}`
          : `自动雷达推送失败：${summary.results.filter((result) => !result.ok).map((result) => result.message).join("; ")}`),
      createdAt: now.toISOString(),
      results: summary.results.map((result) => ({
        provider: result.provider,
        ok: result.ok,
        status: result.status,
        message: result.message,
      })),
    });

    if (summary.ok) {
      await setCooldown(env, rule.id, rule.cooldownMinutes, now);
      await recordAutopilotEvent(env, rule.id, hit.reason, now).catch(() => undefined);
      triggered += 1;
      triggers.push(hit);
    } else {
      skipped += 1;
    }
  }

  return {
    checked: enabledRules.length,
    triggered,
    skipped,
    triggers,
  };
}

async function isCoolingDown(env: Env, ruleId: string, now: Date): Promise<boolean> {
  const raw = await getStoredText(env, `autopilot:cooldown:${ruleId}`);
  if (!raw) return false;
  const until = Date.parse(raw);
  return Number.isFinite(until) && until > now.getTime();
}

async function setCooldown(env: Env, ruleId: string, cooldownMinutes: number, now: Date): Promise<void> {
  const until = new Date(now.getTime() + Math.max(5, cooldownMinutes) * 60 * 1000).toISOString();
  await putStoredText(env, `autopilot:cooldown:${ruleId}`, until, Math.max(5, cooldownMinutes) * 60);
}

async function recordAutopilotEvent(env: Env, ruleId: string, reason: string, now: Date): Promise<void> {
  if (!env.RESEARCH_DB) return;
  await env.RESEARCH_DB.prepare(
    `INSERT OR REPLACE INTO autopilot_events (id, rule_id, reason, created_at)
     VALUES (?, ?, ?, ?)`,
  ).bind(crypto.randomUUID(), ruleId, reason.slice(0, 500), now.toISOString()).run();
}

export function resolveAutopilotSettings(settings: AppSettings): AutopilotSettings {
  return settings.autopilot ?? createDefaultAutopilotSettings();
}

export { createDefaultAutopilotSettings };
export type { AutopilotSettings, AutopilotRule, AutopilotRunResult } from "./types";
