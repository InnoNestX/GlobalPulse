<p align="center">
  <img src="docs/assets/globalpulse-project-logo.png" alt="GlobalPulse" width="120" height="120" />
</p>

<h1 align="center">GlobalPulse</h1>

<p align="center">
  <strong>Scheduled market briefings on Cloudflare Workers</strong><br />
  Finance and global hotspot digests pushed to Feishu, WeChat, Telegram, and Email.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-0f7a63" alt="MIT License" /></a>
  <a href="https://innonestx.github.io/GlobalPulse/"><img src="https://img.shields.io/badge/docs-GitHub%20Pages-14967a" alt="Documentation" /></a>
  <a href="https://workers.cloudflare.com/"><img src="https://img.shields.io/badge/runtime-Cloudflare%20Workers-f38020" alt="Cloudflare Workers" /></a>
</p>

GlobalPulse is a self-hosted Cloudflare Workers app for **scheduled finance and global hotspot briefings**. Configure schedules in a password-protected Admin UI, generate reports from market data and news sources, and push them to the channels your team already uses.

**Documentation:** [English](https://innonestx.github.io/GlobalPulse/en/) · [中文](https://innonestx.github.io/GlobalPulse/zh/)

## Features

- Admin UI at `/admin` with KV-backed settings
- Cron every 5 minutes; each schedule runs in its own timezone
- Market calendars for everyday, A-share, US stock, and crypto
- Research modules for US stocks, A-shares, crypto, news, and macro context
- Push providers: Feishu, WeChat Official Account, WeChat Clawbot, Telegram, Email
- Message preview per provider before send
- HTTP API for direct push and event ingestion

## Quick Start

```bash
git clone https://github.com/InnoNestX/GlobalPulse.git
cd GlobalPulse
npm install
cp .dev.vars.example .dev.vars
cp wrangler.example.jsonc wrangler.jsonc
npm run dev
```

Open `http://localhost:8787/admin` and set `ADMIN_PASSWORD` in `.dev.vars`.

## Required Configuration

Every self-hosted deploy needs:

- `ADMIN_PASSWORD` — Admin UI login
- `API_TOKEN` — external API calls
- Cloudflare KV bound as `APP_KV`
- Domain or `*.workers.dev` route in your local `wrangler.jsonc`
- At least one push provider secret (Cloudflare secrets or Admin UI)

Do not commit local deployment files or secrets. This repo ships `wrangler.example.jsonc` only.

Full deploy steps: [Cloudflare setup](docs/cloudflare-setup.md) · [Admin guide](docs/admin-guide.md) · [Docs site](https://innonestx.github.io/GlobalPulse/en/) · [Troubleshooting](https://innonestx.github.io/GlobalPulse/en/faq.html)

## API

- `POST /v1/messages`
- `POST /v1/events/github-actions`
- `POST /v1/events/cloudflare`

## Cloudflare Notes

Cloudflare Cron Triggers run on UTC. GlobalPulse uses `*/5 * * * *`, then matches each saved schedule against the user's timezone from KV.

## License

MIT · © 2026 InnoNestX
