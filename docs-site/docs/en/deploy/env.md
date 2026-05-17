# Environment Variables

## Secrets Configuration

GlobalPulse uses Cloudflare Workers Secrets for sensitive data.

### Required

```bash
# Admin UI password
wrangler secret put ADMIN_PASSWORD

# API token for programmatic access
wrangler secret put API_TOKEN

# LLM API key for research engine
wrangler secret put GEMINI_API_KEY
```

### Optional - Data Sources

```bash
wrangler secret put ALPHA_VANTAGE_API_KEY
wrangler secret put FINNHUB_API_KEY
wrangler secret put COINGECKO_API_KEY
```

### Optional - Providers

```bash
# Feishu
wrangler secret put FEISHU_WEBHOOK_URL
wrangler secret put FEISHU_SIGNING_SECRET

# Telegram
wrangler secret put TELEGRAM_BOT_TOKEN

# Email
wrangler secret put BREVO_API_KEY
wrangler secret put RESEND_API_KEY
```

## Local Development (.dev.vars)

For local development, create a `.dev.vars` file (already in .gitignore):

```bash
ADMIN_PASSWORD=dev-password
API_TOKEN=dev-token
GEMINI_API_KEY=your-key
```

## Environment-Specific Config

Use `wrangler.toml` environments for different stages:

```toml
[env.staging]
name = "globalpulse-staging"

[env.production]
name = "globalpulse"
kv_namespaces = [
  { binding = "APP_KV", id = "prod-kv-id" }
]
```