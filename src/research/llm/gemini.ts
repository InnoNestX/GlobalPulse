import type { Env } from "../../env";
import type { StockPacket } from "../types/packet";

export async function callGeminiResearchJson(env: Env, packet: StockPacket): Promise<{
  rawOutput: string;
  parsedOutput: unknown;
  provider: string;
  model: string;
}> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  const baseUrl = (env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/$/, "");
  const model = env.GEMINI_MODEL || "gemini-2.5-flash";
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "你是股票研究报告编排器，只基于输入 JSON 工作，不自行补事实。",
            "只输出 JSON，不输出 Markdown。",
            "C级来源只能进入新闻复核，不能单独形成交易动作。",
            "所有观点必须包含证据数量、最高信源等级、时间框架、风险提示、入场规则、止损规则、失效条件。",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "把 stock_packet 转成 ResearchReportJson。不要输出 final_markdown。",
            stock_packet: packet,
          }),
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Gemini returned HTTP ${response.status}`);
  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const rawOutput = payload.choices?.[0]?.message?.content ?? "";
  if (!rawOutput.trim()) throw new Error("Gemini returned empty content");
  return {
    rawOutput,
    parsedOutput: JSON.parse(extractJson(rawOutput)),
    provider: "gemini",
    model,
  };
}

function extractJson(input: string): string {
  const start = input.indexOf("{");
  const end = input.lastIndexOf("}");
  if (start < 0 || end <= start) return input;
  return input.slice(start, end + 1);
}

