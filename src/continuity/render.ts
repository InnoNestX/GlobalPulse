import type { ContinuityDelta } from "./types";

export function renderContinuitySection(delta: ContinuityDelta, language: "zh" | "en"): string {
  const zh = language !== "en";
  const title = zh ? "## 相对上期（Pulse Continuity）" : "## Since last pulse (Continuity)";
  const asOf = delta.hasPrevious
    ? (zh ? `对比基线：${delta.previousAsOf}` : `Baseline: ${delta.previousAsOf}`)
    : (zh ? "对比基线：首次运行" : "Baseline: first run");

  const bullets = delta.summaryLines.map((line) => `- ${line}`).join("\n");
  return ["", title, "", asOf, "", bullets, ""].join("\n");
}

export function appendContinuitySection(body: string, delta: ContinuityDelta, language: "zh" | "en"): string {
  const section = renderContinuitySection(delta, language);
  if (!section.trim()) return body;
  if (body.includes("Pulse Continuity") || body.includes("相对上期")) return body;
  return `${body.trimEnd()}\n${section}`;
}
