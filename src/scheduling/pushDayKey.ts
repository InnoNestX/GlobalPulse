/**
 * Exchange-local push-day keys for de-duplicating scheduled briefs.
 * Ported from tg-stock-reco `scheduler::fire_day_key` and `store::push_mark`.
 */

import {
  exchangeLocalDay,
  exchangeOffsetMinutes,
  type MarketId,
} from "../research/sources/session";

/** Slot kinds used in de-dupe keys. `pre_open` keeps the historical two-part shape. */
export type SlotKind =
  | "pre_open"
  | "intraday"
  | "intraday_1"
  | "intraday_2"
  | "intraday_3"
  | "post_close"
  | "weekly"
  | "market_scan";

/**
 * Cross-path de-dupe key: market, slot, and exchange-local trading day.
 *
 * - Pre-open: `CN:2026-08-11`
 * - Other slots: `CN:post_close:2026-08-11`
 */
export function fireDayKey(market: MarketId, slot: SlotKind, ms: number): string {
  const day = fireLocalDay(market, ms);
  if (slot === "pre_open") {
    return `${market}:${day}`;
  }
  return `${market}:${slot}:${day}`;
}

/** Exchange-local `YYYY-MM-DD` for the fire instant. */
export function fireLocalDay(market: MarketId, ms: number): string {
  return exchangeLocalDay(ms, exchangeOffsetMinutes(market, ms));
}

/**
 * KV / D1 field without the date: pop the last `:` segment.
 * `CN:2026-08-11` → `CN`; `US:post_close:2026-08-11` → `US:post_close`.
 */
export function pushMark(dayKey: string): string | null {
  if (!dayKey) return null;
  const parts = dayKey.split(":");
  if (parts.length === 1) {
    return dayKey;
  }
  parts.pop();
  if (parts.some((part) => part === "")) return null;
  return parts.join(":");
}
