# Deployment

## Cloudflare Setup

### 1. Create a Cloudflare Workers Project

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create new worker
wrangler init globalpulse
cd globalpulse
```

### 2. Configure wrangler.toml

```toml
name = "globalpulse"
main = "src/index.ts"
compatibility_date = "2026-01-01"

kv_namespaces = [
  { binding = "APP_KV", id = "your-kv-namespace-id" }
]

[env.production]
kv_namespaces = [
  { binding = "APP_KV", id = "your-production-kv-id" }
]
```

### 3. Create KV Namespace

```bash
# Create KV namespace
wrangler kv:namespace create APP_KV

# Note the ID and add to wrangler.toml
```

### 4. Set Secrets

```bash
wrangler secret put ADMIN_PASSWORD
wrangler secret put API_TOKEN
wrangler secret put GEMINI_API_KEY
# Add other provider secrets as needed
```

### 5. Deploy

```bash
# Deploy to production
wrangler deploy

# Or use the npm script
npm run deploy
```

## Environment Variables

Required secrets:

| Variable | Description |
|----------|-------------|
| `ADMIN_PASSWORD` | Admin UI login password |
| `API_TOKEN` | API authentication token |
| `GEMINI_API_KEY` | Gemini API key for LLM |

Optional provider secrets:

| Variable | Provider |
|----------|----------|
| `FEISHU_WEBHOOK_URL` | Feishu webhook |
| `FEISHU_SIGNING_SECRET` | Feishu HMAC secret |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `BREVO_API_KEY` | Brevo email API key |
| `RESEND_API_KEY` | Resend email API key |
| `ALPHA_VANTAGE_API_KEY` | Alpha Vantage data |
| `FINNHUB_API_KEY` | Finnhub data |

## Domain Binding (Optional)

Point a Cloudflare zone to your worker:

```bash
wrangler route create "https://pulse.yourdomain.com/*"
```

## Verifying Deployment

After deployment:

1. Visit `https://your-worker.workers.dev/health` - should return OK
2. Visit `https://your-worker.workers.dev/admin` - should show login
3. Login and configure your first schedule