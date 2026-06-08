import { BUILD_INFO } from "./build-info.generated";
import type { Env } from "./env";

export interface HealthPayload {
  ok: true;
  service: "globalpulse";
  generatedAt: string;
  commitId: string | null;
  commitShort: string | null;
  branch: string | null;
  buildId: string | null;
  buildTime: string | null;
  deployedAt: string | null;
  versionId: string | null;
  versionTag: string | null;
}

export function createHealthPayload(env: Env, now = new Date()): HealthPayload {
  const versionMetadata = env.CF_VERSION_METADATA;
  const commitId = firstNonEmpty(
    env.GLOBALPULSE_COMMIT_SHA,
    env.WORKERS_CI_COMMIT_SHA,
    env.CF_PAGES_COMMIT_SHA,
    versionMetadata?.tag,
    BUILD_INFO.commitSha,
  );
  const branch = firstNonEmpty(
    env.GLOBALPULSE_BRANCH,
    env.WORKERS_CI_BRANCH,
    env.CF_PAGES_BRANCH,
    BUILD_INFO.branch,
  );
  const buildId = firstNonEmpty(
    env.GLOBALPULSE_BUILD_ID,
    env.WORKERS_CI_BUILD_UUID,
    BUILD_INFO.buildId,
  );
  const buildTime = firstNonEmpty(BUILD_INFO.buildTime);
  const deployedAt = firstNonEmpty(
    env.GLOBALPULSE_DEPLOYED_AT,
    versionMetadata?.timestamp,
    buildTime,
  );

  return {
    ok: true,
    service: "globalpulse",
    generatedAt: now.toISOString(),
    commitId,
    commitShort: commitId ? commitId.slice(0, 12) : null,
    branch,
    buildId,
    buildTime,
    deployedAt,
    versionId: firstNonEmpty(versionMetadata?.id),
    versionTag: firstNonEmpty(versionMetadata?.tag),
  };
}

function firstNonEmpty(...values: Array<string | undefined | null>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}
