import { describe, expect, it } from "vitest";
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_WORKERS_AI_MODEL,
  MODEL_PRESETS,
  resolveGeminiModel,
  resolveWorkersAiModels,
} from "../src/ai-models";

describe("ai-models", () => {
  it("defaults to current Gemini and Workers AI models", () => {
    expect(resolveGeminiModel()).toBe(DEFAULT_GEMINI_MODEL);
    expect(resolveGeminiModel("  ")).toBe(DEFAULT_GEMINI_MODEL);
    expect(resolveWorkersAiModels()[0]).toBe(DEFAULT_WORKERS_AI_MODEL);
    expect(resolveWorkersAiModels()).toContain("@cf/meta/llama-3.1-8b-instruct-fast");
  });

  it("keeps an explicit Workers AI preference first without duplicates", () => {
    const models = resolveWorkersAiModels("@cf/meta/llama-3.1-8b-instruct-fast");
    expect(models[0]).toBe("@cf/meta/llama-3.1-8b-instruct-fast");
    expect(models.filter((model) => model === "@cf/meta/llama-3.1-8b-instruct-fast")).toHaveLength(1);
  });

  it("exposes admin model presets", () => {
    expect(MODEL_PRESETS.map((preset) => preset.id)).toEqual([
      "balanced",
      "fast_cheap",
      "higher_quality",
    ]);
  });
});
