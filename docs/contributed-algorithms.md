# Contributed algorithms

Pure TypeScript ports of market-briefing helpers from the `tg-stock-reco` worker.
No secrets, no provider credentials, and no invented prices — callers supply quotes/bars.

| Module | Role |
|---|---|
| `src/research/sources/session.ts` | Quote session windows, US Eastern DST, exchange-local clocks |
| `src/scheduling/pushDayKey.ts` | `fireDayKey` / `pushMark` for exchange-local push de-dupe |
| `src/providers/composeDigest.ts` | Line-based Telegram HTML digest folding (`ANCHOR_MAX`) |
| `src/research/scoring/factors.ts` | Multi-factor score / stance (session-aware, board scales) |
| `src/research/universe/liquidity.ts` | Liquidity hard filters + stage-1 percentile score |

Parity notes vs the Rust worker:

- Factor weights are `7+3` day/extended (not a collapsed `10`).
- A-share ChiNext/STAR use `SAT_CN_GROWTH` via `scalesForSymbol`.
- Live-session bars are excluded when `quote.asOf` is set.
- Yahoo chart attaches `MarketQuote.bars` (`range=3mo`) and merges them onto quote rows.
- Digest folding matches Rust `str::lines()` (trailing newline does not drop the disclaimer).
- Intraday de-dupe slots are `intraday_1|2|3` only.

Unit tests live under `tests/`. Run `npm run check` before merging.
