<p align="center">
  <img src="docs/assets/globalpulse-project-logo.png" alt="GlobalPulse — self-hosted market briefing bot on Cloudflare Workers" width="120" height="120" />
</p>

<h1 align="center">GlobalPulse</h1>

<p align="center">
  <strong>Self-hosted scheduled market briefings on Cloudflare Workers</strong><br />
  A-share / US stock / crypto / hotspot digests → Feishu, WeChat, Telegram, Email
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-0f7a63" alt="MIT License" /></a>
  <a href="https://innonestx.github.io/GlobalPulse/"><img src="https://img.shields.io/badge/docs-GitHub%20Pages-14967a" alt="Documentation" /></a>
  <a href="https://workers.cloudflare.com/"><img src="https://img.shields.io/badge/runtime-Cloudflare%20Workers-f38020" alt="Cloudflare Workers" /></a>
  <a href="https://innonestx.github.io/GlobalPulse/en/compare.html"><img src="https://img.shields.io/badge/compare-alternatives-0ea5e9" alt="Compare alternatives" /></a>
</p>

GlobalPulse is an **open-source, self-hosted finance news and market briefing bot**. It runs on **Cloudflare Workers cron**, builds digests from market data + news, and pushes to **Feishu (Lark), WeChat, Telegram, and Email** through a password-protected Admin UI.

**Docs:** [English](https://innonestx.github.io/GlobalPulse/en/) · [中文](https://innonestx.github.io/GlobalPulse/zh/) · [vs alternatives](https://innonestx.github.io/GlobalPulse/en/compare.html)

## Why teams use it

- Replace ad-hoc n8n / RSS→webhook scripts with market calendars and report modules
- Run without a VPS: Workers + KV + optional D1 + Workers AI
- Configure schedules, templates, and providers in `/admin`
- AI research path: Gemini → Workers AI fallback → deterministic report

## Features

- Admin UI with first-run checklist, diagnostics, template presets, model presets
- **Pulse Continuity** — remembers the last briefing and appends “what changed”
- **Autopilot Radar** — event-driven alerts between schedule slots
- Discord + Slack webhooks alongside Feishu / WeChat / Telegram / Email
- Cron every 5 minutes; each schedule uses its own timezone and trading calendar
- Markets: everyday, A-share, US stock, crypto
- Research modules: US / A-share / crypto / news / macro / technicals / sentiment
- Preview, test push, delivery logs with per-channel status and retry
- Settings export / import JSON

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

- `ADMIN_PASSWORD` — Admin UI login
- `API_TOKEN` — external API calls
- Cloudflare KV bound as `APP_KV`
- Domain or `*.workers.dev` route in your local `wrangler.jsonc`
- At least one push provider (secrets or Admin UI)
- Optional: `GEMINI_API_KEY` (default model `gemini-3.5-flash`) and Workers AI binding (default `@cf/zai-org/glm-4.7-flash`)

Do not commit local deployment files or secrets. This repo ships `wrangler.example.jsonc` only.

Full deploy: [Cloudflare setup](https://innonestx.github.io/GlobalPulse/en/deploy/cloudflare.html) · [Troubleshooting](https://innonestx.github.io/GlobalPulse/en/faq.html)

## API

- `POST /v1/messages`
- `POST /v1/events/github-actions`
- `POST /v1/events/cloudflare`

## License

MIT · © 2026 InnoNestX
