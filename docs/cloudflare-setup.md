# Cloudflare Setup

This guide is for users who want to deploy GlobalPulse to their own Cloudflare account.

## 1. Install Dependencies

```bash
npm install
cp wrangler.example.jsonc wrangler.jsonc
```

## 2. Choose a Domain

Edit your local `wrangler.jsonc`. This file is ignored by git so account-specific domains and ids do not enter the open-source repository.

```jsonc
{
  "routes": [
    {
      "pattern": "your-subdomain.example.com",
      "custom_domain": true
    }
  ],
  "vars": {
    "CORS_ORIGIN": "https://your-subdomain.example.com"
  }
}
```

## 3. Create a KV Namespace

Create a namespace and copy the returned `id` into `wrangler.jsonc`.

```bash
npx wrangler kv namespace create APP_KV
```

Example:

```jsonc
{
  "kv_namespaces": [
    { "binding": "APP_KV", "id": "your-kv-namespace-id" }
  ]
}
```

Run type generation after editing bindings:

```bash
npx wrangler types
```

## 4. Set Required Secrets

Use long random values for both passwords.

```bash
printf 'your-admin-password' | npx wrangler secret put ADMIN_PASSWORD
printf 'your-api-token' | npx wrangler secret put API_TOKEN
```

`ADMIN_PASSWORD` protects the Web UI at `/admin`.

`API_TOKEN` protects integration endpoints such as `/v1/messages`.

## 5. Configure Push Providers

### Feishu

```bash
printf 'your-feishu-webhook-url' | npx wrangler secret put FEISHU_WEBHOOK_URL
printf 'optional-signing-secret' | npx wrangler secret put FEISHU_SIGNING_SECRET
```

### WeChat Official Account

```bash
printf 'wx-app-id' | npx wrangler secret put WECHAT_OFFICIAL_APP_ID
printf 'wx-app-secret' | npx wrangler secret put WECHAT_OFFICIAL_APP_SECRET
printf 'recipient-openid' | npx wrangler secret put WECHAT_OFFICIAL_OPENID
```

This provider uses the Official Account customer-service message API. The recipient openid generally must have interacted with the account recently.

### WeChat AI Agent

Use either a full webhook URL:

```bash
printf 'your-wechat-ai-agent-webhook-url' | npx wrangler secret put WECHAT_AI_AGENT_WEBHOOK_URL
```

Or only the webhook key:

```bash
printf 'xxx' | npx wrangler secret put WECHAT_AI_AGENT_WEBHOOK_KEY
```

### Telegram

Create a Telegram bot with BotFather, then store the bot token and target chat id as secrets.

```bash
printf 'your-telegram-bot-token' | npx wrangler secret put TELEGRAM_BOT_TOKEN
printf 'your-telegram-chat-id' | npx wrangler secret put TELEGRAM_CHAT_ID
```

## 6. Deploy

```bash
npm run check
npm run deploy
```

Open:

```text
https://your-domain.example.com/admin
```

## 7. Cron Behavior

Cloudflare Cron Triggers run in UTC. GlobalPulse wakes every 5 minutes with:

```jsonc
{
  "triggers": {
    "crons": ["*/5 * * * *"]
  }
}
```

The Worker then loads schedules from KV and checks each schedule's configured timezone and local time.
