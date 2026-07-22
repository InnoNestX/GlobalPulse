/** Shared LLM defaults for research + translation. */

/** Primary Gemini model for research/translation. */
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";

/**
 * Workers AI defaults.
 * `@cf/meta/llama-3.1-8b-instruct` was deprecated May 30, 2026.
 * Prefer GLM for Chinese market briefings, then Llama fast variants.
 */
export const DEFAULT_WORKERS_AI_MODEL = "@cf/zai-org/glm-4.7-flash";

export const WORKERS_AI_FALLBACK_MODELS = [
  DEFAULT_WORKERS_AI_MODEL,
  "@cf/meta/llama-3.1-8b-instruct-fast",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
] as const;

export function resolveGeminiModel(envModel?: string): string {
  const trimmed = envModel?.trim();
  return trimmed || DEFAULT_GEMINI_MODEL;
}

export function resolveWorkersAiModels(envModel?: string): string[] {
  const preferred = envModel?.trim();
  const models = preferred
    ? [preferred, ...WORKERS_AI_FALLBACK_MODELS.filter((model) => model !== preferred)]
    : [...WORKERS_AI_FALLBACK_MODELS];
  return Array.from(new Set(models));
}

export const MODEL_PRESETS = [
  {
    id: "balanced",
    nameZh: "均衡（推荐）",
    nameEn: "Balanced (recommended)",
    geminiModel: DEFAULT_GEMINI_MODEL,
    workersAiModel: DEFAULT_WORKERS_AI_MODEL,
  },
  {
    id: "fast_cheap",
    nameZh: "更快更省",
    nameEn: "Faster / cheaper",
    geminiModel: "gemini-3.1-flash-lite",
    workersAiModel: "@cf/meta/llama-3.1-8b-instruct-fast",
  },
  {
    id: "higher_quality",
    nameZh: "更高质量",
    nameEn: "Higher quality",
    geminiModel: DEFAULT_GEMINI_MODEL,
    workersAiModel: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  },
] as const;
