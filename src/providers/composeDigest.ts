/**
 * Compose a growing Telegram HTML digest: keep newest section + timeline,
 * fold the base from the top when over budget. Ported from tg-stock-reco
 * `intraday::compose_anchor`.
 */

/** Telegram hard-cap is 4096; clip below that so edits stay sendable. */
export const ANCHOR_MAX = 3_900;

const FOLD_NOTE = "<i>(Base brief truncated to keep the latest update.)</i>";

const DEFAULT_TIMELINE_HEADER = "<b>Today's updates</b>";
const DEFAULT_TIMELINE_MAX = 8;

export interface ComposeDigestOptions {
  /** Max characters (Unicode code points), default {@link ANCHOR_MAX}. */
  maxChars?: number;
  /** Timeline header HTML line. */
  timelineHeader?: string;
  /** Max timeline entries kept (oldest dropped first when over). */
  timelineMax?: number;
  /** Escape timeline body lines for HTML (default true). */
  escapeTimeline?: boolean;
}

function charCount(text: string): number {
  return [...text].length;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function clipText(text: string, max: number): string {
  const chars = [...text];
  if (chars.length <= max) return text;
  return chars.slice(0, Math.max(0, max - 1)).join("") + "…";
}

/**
 * Build the full digest: morning base, then current section, then timeline.
 *
 * Strategy: compose the tail first (never dropped). Keep base **line by line
 * from the top** until the budget runs out. The base's last line (disclaimer)
 * always survives. Cutting on line boundaries never splits HTML tags.
 */
export function composeDigest(
  base: string,
  section: string[],
  timeline: string[],
  options: ComposeDigestOptions = {},
): string {
  const maxChars = options.maxChars ?? ANCHOR_MAX;
  const timelineHeader = options.timelineHeader ?? DEFAULT_TIMELINE_HEADER;
  const timelineMax = options.timelineMax ?? DEFAULT_TIMELINE_MAX;
  const escapeTimeline = options.escapeTimeline !== false;

  const tail: string[] = [...section];
  if (timeline.length > 0) {
    tail.push("");
    tail.push(timelineHeader);
    const kept = timeline.slice(-timelineMax);
    for (const line of kept) {
      const body = escapeTimeline ? escapeHtml(line) : line;
      tail.push(`<i>${body}</i>`);
    }
  }

  const tailText = tail.join("\n");
  const tailLen = charCount(tailText);

  if (tailLen + 1 >= maxChars) {
    return clipText(tailText, maxChars);
  }

  const baseLines = base.split("\n");
  const footer = baseLines.length > 0 ? baseLines.pop() : undefined;
  let room = maxChars - tailLen - 1;
  const footerCost = footer !== undefined ? charCount(footer) + 1 : 0;
  const noteCost = charCount(FOLD_NOTE) + 1;
  room = Math.max(0, room - footerCost);

  const kept: string[] = [];
  let folded = false;
  for (const line of baseLines) {
    const cost = charCount(line) + 1;
    if (cost + noteCost > room) {
      folded = true;
      break;
    }
    room -= cost;
    kept.push(line);
  }

  const out: string[] = [...kept];
  if (folded) {
    out.push(FOLD_NOTE);
  }
  if (footer !== undefined) {
    out.push(footer);
  }
  out.push(tailText);
  return out.join("\n");
}

export { FOLD_NOTE as DIGEST_FOLD_NOTE };
