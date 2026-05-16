<p align="center">
  <img src="https://pulse.xuxuclassmate.com/assets/globalpulse-logo.jpg?v=20260516-logo-fix" alt="GlobalPulse project logo" width="180" />
</p>

<h1 align="center">GlobalPulse</h1>

<p align="center">
  Market Intelligence · Scheduled finance and global hotspot briefings
</p>

GlobalPulse is a Cloudflare Workers app for scheduled finance and global hotspot briefings. It includes a password-protected Admin Web UI, KV-backed configuration, cron execution, message previews, and push providers for Feishu, WeChat, and Telegram.

## What It Does

- Serves an Admin UI at `/admin`.
- Stores user settings in Cloudflare Workers KV.
- Lets users edit briefing language, timezone, output format, content template, topic query, RSS source, push targets, provider parameters, and push times.
- Runs every 5 minutes through Cloudflare Cron Triggers and checks the user's configured schedule in their chosen timezone.
- Generates default briefings from a composite source set inspired by a separate market-briefing reference implementation.
- Pushes generated briefings to:
  - `feishu`
  - `wechat_official_account`
  - `wechat_clawbot`
  - `telegram`
- Shows a provider-specific demo of the message each channel will receive before sending.
- Supports schedule-level market calendars for everyday, A-share, US stock, and crypto workflows, including third-party holiday checks for A-share and US stock schedules.
- Links directly to InnoNestX issue templates for bug reports and feature requests.
- Keeps API endpoints for direct push and event ingestion:
  - `POST /v1/messages`
  - `POST /v1/events/github-actions`
  - `POST /v1/events/cloudflare`

## Quick Start

```bash
npm install
cp .dev.vars.example .dev.vars
cp wrangler.example.jsonc wrangler.jsonc
npm run dev
```

Open:

```text
http://localhost:8787/admin
```

Set `ADMIN_PASSWORD` in `.dev.vars` before using the local Admin UI.

## Required User Configuration

Every self-hosted user must configure these values for their own Cloudflare account:

- Admin password: `ADMIN_PASSWORD`
- API token for external calls: `API_TOKEN`
- Cloudflare KV namespace bound as `APP_KV`
- Domain or subdomain in a local `wrangler.jsonc` file or in the Cloudflare dashboard
- At least one push provider secret, either in Cloudflare secrets or in the Admin UI's KV-backed provider settings

Do not commit local deployment files or secrets. This repository intentionally ships only `wrangler.example.jsonc`; each deployer keeps their real `wrangler.jsonc`, domain, KV namespace id, API tokens, and webhook URLs outside git.

See [Cloudflare setup guide](docs/cloudflare-setup.md) for the full deployment flow.

## Admin UI

The Admin UI lets users configure:

- Display language: Chinese or English
- Timezone: for example `Asia/Hong_Kong`, `UTC`, `America/New_York`
- Output format: `markdown` by default, with `text` and `json` also available
- Content template with variables such as `{{itemsMarkdown}}` and `{{generatedAt}}`
- Push time points and weekdays
- Market calendar: every day, A-share, US stock, or crypto
- Trading-day check: local weekday/manual dates, or third-party automatic holiday lookup
- Extra market closed dates for exchange holidays and one-off skips
- Topic query and optional RSS source URL
- Push targets
- Push provider parameters for Feishu, 微信公众号, wechat clawbot, and Telegram
- Message preview for the currently configured schedule and targets

See [Admin guide](docs/admin-guide.md) for template variables and schedule behavior.

See [Data generation notes](docs/data-generation.md) for the current source strategy and future indicator roadmap.

## Cloudflare Notes

Cloudflare Cron Triggers execute on UTC. GlobalPulse uses a fixed Worker cron of `*/5 * * * *`, then checks each saved schedule against the user's selected timezone from KV.
