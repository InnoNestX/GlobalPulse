import type { Env } from "../env";
import { getStoredJson, putStoredJson } from "../state-store";
import type { ContinuityDelta, PulseSnapshot } from "./types";

function lastKey(scheduleId: string): string {
  return `continuity:last:${scheduleId}`;
}

function deltaKey(scheduleId: string): string {
  return `continuity:delta:${scheduleId}`;
}

export async function getPulseSnapshot(env: Env, scheduleId: string): Promise<PulseSnapshot | null> {
  const value = await getStoredJson<PulseSnapshot>(env, lastKey(scheduleId));
  if (!value || typeof value.scheduleId !== "string" || typeof value.asOf !== "string") {
    return null;
  }
  return value;
}

export async function savePulseSnapshot(env: Env, snapshot: PulseSnapshot, delta?: ContinuityDelta): Promise<void> {
  await putStoredJson(env, lastKey(snapshot.scheduleId), snapshot);
  if (delta) {
    await putStoredJson(env, deltaKey(snapshot.scheduleId), {
      ...delta,
      savedAt: snapshot.asOf,
      scheduleId: snapshot.scheduleId,
    });
  }
  await persistSnapshotToD1(env, snapshot, delta).catch(() => undefined);
}

export async function getLatestContinuityDelta(env: Env, scheduleId: string): Promise<(ContinuityDelta & { savedAt?: string; scheduleId?: string }) | null> {
  const value = await getStoredJson<ContinuityDelta & { savedAt?: string; scheduleId?: string }>(env, deltaKey(scheduleId));
  return value && Array.isArray(value.summaryLines) ? value : null;
}

async function persistSnapshotToD1(env: Env, snapshot: PulseSnapshot, delta?: ContinuityDelta): Promise<void> {
  if (!env.RESEARCH_DB) return;
  const id = `${snapshot.scheduleId}:${snapshot.asOf}`;
  await env.RESEARCH_DB.prepare(
    `INSERT OR REPLACE INTO pulse_snapshots (id, schedule_id, as_of, mode, bias, snapshot_json, delta_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id,
    snapshot.scheduleId,
    snapshot.asOf,
    snapshot.mode,
    snapshot.bias ?? "",
    JSON.stringify(snapshot),
    delta ? JSON.stringify(delta) : "",
    new Date().toISOString(),
  ).run();
}
