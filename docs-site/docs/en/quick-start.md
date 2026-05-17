# Quick Start

Get GlobalPulse running in 5 minutes.

## Prerequisites

- Node.js 18+
- npm or pnpm
- Cloudflare account (free tier works)
- Git

## Installation

```bash
# Clone the repository
git clone https://github.com/nestjs/globalpulse.git
cd globalpulse

# Install dependencies
npm install

# Copy environment config
cp .dev.vars.example .dev.vars
cp wrangler.example.jsonc wrangler.jsonc
```

## Configuration

Edit `.dev.vars` with your settings:

```bash
ADMIN_PASSWORD=your-secure-password
API_TOKEN=your-api-token
```

Edit `wrangler.jsonc` with your Cloudflare namespace ID:

```json
{
  "name": "your-worker-name",
  "kv_namespaces": [
    { "id": "your-kv-namespace-id", "binding": "APP_KV" }
  ]
}
```

## Run Locally

```bash
npm run dev
```

Open `http://localhost:8787/admin` and login with your `ADMIN_PASSWORD`.

## Deploy to Cloudflare

```bash
# Login to Cloudflare
npx wrangler login

# Deploy
npm run deploy
```

Your GlobalPulse instance will be live at `https://your-worker-name.workers.dev/admin`.

## Next Steps

- [Configure Schedules](/en/config/schedules)
- [Set up Push Providers](/en/config/providers)
- [Customize Templates](/en/config/templates)