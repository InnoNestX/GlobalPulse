import type { Env } from "../../env";
import type { StockPacket } from "../types/packet";
import type { ResearchReportJson } from "../types/report";
import { callGeminiResearchJson } from "./gemini";
import { buildFallbackReportJson } from "./fallback";
import { normalizeResearchReportJson } from "./schema";

export interface LlmResult {
  report: ResearchReportJson;
  rawOutput: string;
  parsedOutput: unknown;
  provider: string;
  model: string;
  fallbackUsed: boolean;
  errorMessage?: string;
}

export async function buildStructuredResearchReport(env: Env, packet: StockPacket): Promise<LlmResult> {
  try {
    const result = await callGeminiResearchJson(env, packet);
    const normalized = normalizeResearchReportJson(result.parsedOutput, packet);
    return {
      report: normalized,
      rawOutput: result.rawOutput,
      parsedOutput: result.parsedOutput,
      provider: result.provider,
      model: result.model,
      fallbackUsed: false,
    };
  } catch (error) {
    const fallback = buildFallbackReportJson(packet);
    return {
      report: fallback,
      rawOutput: "",
      parsedOutput: fallback,
      provider: "deterministic",
      model: "fallback",
      fallbackUsed: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

