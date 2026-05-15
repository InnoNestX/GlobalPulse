import type { Env } from "../../env";
import type { StockPacket } from "../types/packet";

export async function callWorkersAiResearchJson(env: Env, packet: StockPacket): Promise<{
  rawOutput: string;
  parsedOutput: unknown;
  provider: string;
  model: string;
}> {
  const ai = env.AI;
  if (!ai || typeof ai !== "object" || !("run" in ai) || typeof ai.run !== "function") {
    throw new Error("Workers AI binding is not configured");
  }

  const model = env.WORKERS_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct";
  const prompt = [
    "你是股票研究报告编排器，只基于输入 JSON 工作，不自行补事实。",
    "只输出 JSON，不输出 Markdown。",
    "输出字段必须包含 executive_summary、market_view、stock_cards、news_review、risk_actions。",
    "C级来源只能进入新闻复核，不能单独形成交易动作。",
    "没有证据数量、止损规则、失效条件时，不能给高置信度交易结论。",
    "",
    JSON.stringify({
      task: "把 stock_packet 转成 ResearchReportJson。不要输出 final_markdown。",
      stock_packet: packet,
    }),
  ].join("\n");

  const result = await ai.run(model, { prompt }) as unknown;
  const rawOutput = extractAiText(result);
  if (!rawOutput) {
    throw new Error("Workers AI returned empty content");
  }

  return {
    rawOutput,
    parsedOutput: JSON.parse(extractJson(rawOutput)),
    provider: "workers-ai",
    model,
  };
}

function extractAiText(result: unknown): string | undefined {
  if (typeof result === "string") return result;
  if (!result || typeof result !== "object") return undefined;
  if (typeof (result as { response?: unknown }).response === "string") return (result as { response: string }).response;
  if (typeof (result as { output_text?: unknown }).output_text === "string") return (result as { output_text: string }).output_text;
  const response = (result as { response?: unknown }).response;
  if (Array.isArray(response)) {
    const combined = response.map((entry) => typeof entry === "string" ? entry : "").filter(Boolean).join("\n").trim();
    return combined || undefined;
  }
  return undefined;
}

function extractJson(input: string): string {
  const start = input.indexOf("{");
  const end = input.lastIndexOf("}");
  if (start < 0 || end <= start) return input;
  return input.slice(start, end + 1);
}

