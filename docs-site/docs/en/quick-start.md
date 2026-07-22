# Quick Start

Get a local Admin UI in a few minutes, then create Cloudflare resources before production deploy.

## Prerequisites

- Node.js 18+
- npm
- A Cloudflare account (free tier works)
- Git

## 1. Install

```bash
git clone https://github.com/InnoNestX/GlobalPulse.git
cd GlobalPulse
npm install
cp .dev.vars.example .dev.vars
cp wrangler.example.jsonc wrangler.jsonc
```

## 2. Local secrets

Edit `.dev.vars`:

```bash
ADMIN_PASSWORD=your-secure-password
API_TOKEN=your-api-token
```

Use long random values. Do not commit `.dev.vars`.

## 3. Run locally

```bash
npm run dev
```

Open `http://localhost:8787/admin` and sign in with `ADMIN_PASSWORD`.

Local Wrangler can use preview bindings for KV/D1. You can explore the Admin UI before creating production resources.

## 4. First briefing checklist

In `/admin`:

1. Add at least one push provider (Feishu / Telegram / WeChat / Email)
2. Create one schedule with a timezone and push time
3. Open **Push preview** and confirm the payload
4. Save, then wait for the next cron window or trigger a manual run if available

If preview is empty, you usually still need a schedule and an enabled target.

## 5. Create Cloudflare resources (before production)

```bash
npx wrangler login

# KV for settings
npx wrangler kv namespace create APP_KV

# D1 for research history (recommended)
npx wrangler d1 create globalpulse-research
```

Paste the returned IDs into `wrangler.jsonc`:

- `kv_namespaces[0].id`
- `d1_databases[0].database_id`

## 6. Production secrets and deploy

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put API_TOKEN
# Optional LLM / market data keys:
# npx wrangler secret put GEMINI_API_KEY

npm run deploy
```

Open `https://<your-worker>.workers.dev/admin`.

## Next steps

- [Cloudflare deploy details](/en/deploy/cloudflare)
- [Environment variables](/en/deploy/env)
- [Schedules](/en/config/schedules)
- [Providers](/en/config/providers)
- [Troubleshooting](/en/faq)
