# Data Generation Notes

GlobalPulse's first data layer is inspired by a separate market-briefing reference implementation.

## Current Approach

When a schedule does not specify a custom RSS source URL, GlobalPulse builds a composite briefing from:

- Google News RSS search for the schedule topic query.
- Sina Finance roll news.
- Hacker News top stories.
- GitHub repositories created in the last 7 days, sorted by stars.
- alternative.me Crypto Fear & Greed Index.

If a user provides `sourceUrl` in the Admin UI, GlobalPulse uses that custom RSS feed only.

Trading-day filtering happens before source collection. A-share and US stock schedules can use separate third-party holiday checks, so a weekday holiday for one market does not automatically affect the other.

## Reference Concepts From claw-auto

Useful concepts already reflected or planned:

- Separate source adapters per platform.
- Save normalized JSON output before rendering.
- Combine finance news with international technology and market sentiment signals.
- Treat X/Twitter as optional because useful API access is paid and unstable.
- Use simple sentiment/indicator methods first, then optimize later.

## Future Data Metrics

The next data-generation iteration can add:

- Stock and crypto quote adapters.
- Market breadth and sector heat signals.
- Fear & Greed weighting for crypto and US equities.
- Keyword-based sentiment scoring for finance headlines.
- Source health status in Admin UI.
- Per-source toggles and weights.
- De-duplication across sources by normalized title similarity.

The goal is to keep source collection separate from rendering, so the Admin UI can later let users choose indicators without changing push provider code.
