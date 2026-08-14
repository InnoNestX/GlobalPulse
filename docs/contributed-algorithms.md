# Contributed algorithms

Pure TypeScript ports of market-briefing helpers from the `tg-stock-reco` worker algorithms. No secrets, no provider credentials, and no invented prices — callers supply quotes/bars.

| Module | Role |
|---|---|
| `src/research/sources/session.ts` | Quote session windows, US Eastern DST, exchange-local clocks |
| `src/scheduling/pushDayKey.ts` | `fireDayKey` / `pushMark` for exchange-local push de-dupe |
| `src/providers/composeDigest.ts` | Line-based Telegram HTML digest folding (`ANCHOR_MAX`) |
| `src/research/scoring/factors.ts` | Multi-factor score / stance from daily bars |
| `src/research/universe/liquidity.ts` | Liquidity hard filters + stage-1 percentile score |

Unit tests live under `tests/` (`session`, `pushDayKey`, `composeDigest`, `factors`, `liquidity`). Run `npm run check` before merging.
