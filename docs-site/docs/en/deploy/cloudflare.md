# Cloudflare Deploy

Deploy GlobalPulse from this repository. Do not run `wrangler init` for an existing clone.

## 1. Prepare the repo

```bash
git clone https://github.com/InnoNestX/GlobalPulse.git
cd GlobalPulse
npm install
cp wrangler.example.jsonc wrangler.jsonc
cp .dev.vars.example .dev.vars
```

## 2. Login

```bash
npx wrangler login
```

## 3. Create bindings

```bash
npx wrangler kv namespace create APP_KV
npx wrangler d1 create globalpulse-research
```

Update `wrangler.jsonc`:

```jsonc
{
  "name": "globalpulse",
  "kv_namespaces": [
    { "binding": "APP_KV", "id": "<kv-id>" }
  ],
  "d1_databases": [
    {
      "binding": "RESEARCH_DB",
      "database_name": "globalpulse-research",
      "database_id": "<d1-id>"
    }
  ],
  "triggers": {
    "crons": ["*/5 * * * *"]
  }
}
```

Keep the example fields for `ai`, `vars`, and `compatibility_date` unless you know you need to change them.

## 4. Set secrets

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put API_TOKEN
```

Optional:

```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put FEISHU_WEBHOOK_URL
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
```

Provider credentials can also be stored later in the Admin UI (KV-backed settings).

## 5. Deploy

```bash
npm run deploy
```

## 6. Verify

1. `GET https://<worker>.workers.dev/health`
2. Open `https://<worker>.workers.dev/admin` and log in
3. Configure one provider + one schedule
4. Use push preview before relying on cron

## Common failures

| Symptom | Likely cause |
|---------|--------------|
| Deploy fails on KV/D1 | Placeholder IDs still in `wrangler.jsonc` |
| Admin login rejected | Secret / `.dev.vars` password mismatch |
| Cron never sends | No schedule match in the selected timezone, or no enabled targets |
| Preview empty | No schedule selected, or sources returned fallback/empty |

See [Troubleshooting](/en/faq) for more.

## Custom domain (optional)

Attach a route in the Cloudflare dashboard, or configure routes in your local `wrangler.jsonc`. Keep secrets and binding IDs out of git.
