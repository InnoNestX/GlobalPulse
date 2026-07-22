# Intelligence Modules

GlobalPulse ships three self-developed intelligence capabilities beyond plain scheduled digests.

## Pulse Continuity

Every successful market (and optional digest) push stores a fingerprint snapshot:

- market bias / drivers / macro risks
- stock score + professional view
- headline hashes

The next run diffs against the previous snapshot and appends a **Since last pulse** section:

- bias changes
- view flips
- score jumps
- new vs fading headlines

Storage works on KV/Durable Objects; D1 `pulse_snapshots` is used when bound.

## Autopilot Radar

Between fixed schedule slots, the Worker cron also evaluates Autopilot rules:

| Kind | Default idea |
|------|----------------|
| `symbol_move` | Focus/position symbols move beyond ±3% |
| `fear_greed_extreme` | Fear & Greed ≤20 or ≥80 |
| `news_burst` | Many fresh headlines in a short window |
| `bias_flip` | Continuity bias diverges from an expected value |

Triggered alerts are short pushes (not full research reports), with cooldown keys to avoid spam.

Configure in Admin → **Intelligence**, or via:

- `GET/PUT /api/admin/autopilot`
- `POST /api/admin/autopilot/scan`

## Discord + Slack

New providers:

- `discord` — `DISCORD_WEBHOOK_URL`
- `slack` — `SLACK_WEBHOOK_URL`

Also configurable in Admin provider cards / KV provider settings.

## Research History

When `RESEARCH_DB` is bound, Admin Intelligence shows recent `research_runs`.

API: `GET /api/admin/research-runs?limit=20`

## Migration

Apply:

```bash
npx wrangler d1 execute globalpulse-research --remote --file=migrations/0002_intelligence.sql
```
