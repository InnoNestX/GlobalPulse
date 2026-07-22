import type { ContinuityDelta, PulseSnapshot } from "./types";

export function diffPulseSnapshots(previous: PulseSnapshot | null, current: PulseSnapshot): ContinuityDelta {
  if (!previous) {
    return {
      previousAsOf: null,
      hasPrevious: false,
      biasChanged: false,
      currentBias: current.bias,
      newDrivers: current.drivers.slice(0, 5),
      droppedDrivers: [],
      newRisks: current.macroRisks.slice(0, 5),
      droppedRisks: [],
      viewFlips: [],
      scoreJumps: [],
      newHeadlines: current.headlineHashes.map(decodeHeadline).slice(0, 5),
      fadedHeadlines: [],
      summaryLines: current.language === "en"
        ? ["First pulse for this schedule — baseline snapshot saved."]
        : ["本任务首次简报，已建立基线快照。"],
    };
  }

  const prevDriverSet = new Set(previous.drivers);
  const currDriverSet = new Set(current.drivers);
  const prevRiskSet = new Set(previous.macroRisks);
  const currRiskSet = new Set(current.macroRisks);
  const prevNews = new Set(previous.newsFingerprints);
  const currNews = new Set(current.newsFingerprints);
  const prevStocks = new Map(previous.stocks.map((stock) => [stock.ticker, stock]));

  const viewFlips = current.stocks.flatMap((stock) => {
    const prior = prevStocks.get(stock.ticker);
    if (!prior || prior.view === stock.view) return [];
    return [{ ticker: stock.ticker, from: prior.view, to: stock.view }];
  });

  const scoreJumps = current.stocks.flatMap((stock) => {
    const prior = prevStocks.get(stock.ticker);
    if (!prior) return [];
    const delta = Number((stock.score - prior.score).toFixed(2));
    if (Math.abs(delta) < 8) return [];
    return [{ ticker: stock.ticker, from: prior.score, to: stock.score, delta }];
  });

  const newHeadlines = current.headlineHashes
    .filter((entry) => !prevNews.has(entry.split("::")[0] ?? ""))
    .map(decodeHeadline)
    .slice(0, 6);
  const fadedHeadlines = previous.headlineHashes
    .filter((entry) => !currNews.has(entry.split("::")[0] ?? ""))
    .map(decodeHeadline)
    .slice(0, 6);

  const biasChanged = Boolean(previous.bias && current.bias && previous.bias !== current.bias);
  const delta: ContinuityDelta = {
    previousAsOf: previous.asOf,
    hasPrevious: true,
    biasChanged,
    previousBias: previous.bias,
    currentBias: current.bias,
    newDrivers: current.drivers.filter((item) => !prevDriverSet.has(item)).slice(0, 5),
    droppedDrivers: previous.drivers.filter((item) => !currDriverSet.has(item)).slice(0, 5),
    newRisks: current.macroRisks.filter((item) => !prevRiskSet.has(item)).slice(0, 5),
    droppedRisks: previous.macroRisks.filter((item) => !currRiskSet.has(item)).slice(0, 5),
    viewFlips: viewFlips.slice(0, 8),
    scoreJumps: scoreJumps.slice(0, 8),
    newHeadlines,
    fadedHeadlines,
    summaryLines: [],
  };
  delta.summaryLines = buildSummaryLines(delta, current.language);
  return delta;
}

function decodeHeadline(entry: string): string {
  const parts = entry.split("::");
  return parts.slice(1).join("::") || entry;
}

function buildSummaryLines(delta: ContinuityDelta, language: "zh" | "en"): string[] {
  const lines: string[] = [];
  const zh = language !== "en";

  if (delta.biasChanged) {
    lines.push(zh
      ? `市场偏向：${delta.previousBias} → ${delta.currentBias}`
      : `Market bias: ${delta.previousBias} → ${delta.currentBias}`);
  }
  if (delta.viewFlips.length) {
    lines.push(zh
      ? `观点翻转：${delta.viewFlips.map((item) => `${item.ticker} ${item.from}→${item.to}`).join("；")}`
      : `View flips: ${delta.viewFlips.map((item) => `${item.ticker} ${item.from}→${item.to}`).join("; ")}`);
  }
  if (delta.scoreJumps.length) {
    lines.push(zh
      ? `分数跃迁：${delta.scoreJumps.map((item) => `${item.ticker} ${item.delta > 0 ? "+" : ""}${item.delta}`).join("；")}`
      : `Score jumps: ${delta.scoreJumps.map((item) => `${item.ticker} ${item.delta > 0 ? "+" : ""}${item.delta}`).join("; ")}`);
  }
  if (delta.newHeadlines.length) {
    lines.push(zh
      ? `新增催化：${delta.newHeadlines.slice(0, 3).join(" / ")}`
      : `New catalysts: ${delta.newHeadlines.slice(0, 3).join(" / ")}`);
  }
  if (delta.fadedHeadlines.length) {
    lines.push(zh
      ? `消退叙事：${delta.fadedHeadlines.slice(0, 2).join(" / ")}`
      : `Fading narratives: ${delta.fadedHeadlines.slice(0, 2).join(" / ")}`);
  }
  if (delta.newDrivers.length) {
    lines.push(zh
      ? `新驱动：${delta.newDrivers.slice(0, 3).join("；")}`
      : `New drivers: ${delta.newDrivers.slice(0, 3).join("; ")}`);
  }
  if (!lines.length) {
    lines.push(zh ? "相对上期：结构大体稳定，未见显著跃迁。" : "Vs last pulse: structure mostly stable.");
  }
  return lines.slice(0, 8);
}
