# Troubleshooting

Common issues when self-hosting GlobalPulse.

## Deploy fails with invalid KV or D1 id

`wrangler.example.jsonc` ships placeholder IDs. Create real resources and paste the IDs:

```bash
npx wrangler kv namespace create APP_KV
npx wrangler d1 create globalpulse-research
```

Then update `wrangler.jsonc` and run `npm run deploy` again.

## Cannot log in to `/admin`

- Confirm `ADMIN_PASSWORD` in `.dev.vars` for local, or `wrangler secret put ADMIN_PASSWORD` for production
- Hard-refresh the browser and clear site cookies for the worker host
- Make sure you are on `/admin`, not the Worker root only

## Cron never sends messages

Cloudflare cron is UTC `*/5 * * * *`. GlobalPulse then checks each schedule against its timezone.

Checklist:

1. Schedule is enabled
2. Weekday / market calendar allows today
3. At least one push target is selected
4. Provider credentials are set (secrets or Admin UI)
5. Push preview works for that schedule

## Preview is empty or says fallback

- Select a schedule in the preview dropdown
- Some sources fail intermittently; preview may show fallback content
- For market mode, confirm watchlist tickers and modules are enabled

## Feishu / Telegram / WeChat delivery fails

- Feishu: webhook URL + signing secret must match the bot config
- Telegram: bot token and chat id must be valid; bot must be able to message the chat
- WeChat Official Account: the openid usually needs a recent user interaction
- Prefer testing with **Push preview** and a manual send before waiting on cron

## Local works, production does not

Local uses `.dev.vars`. Production uses Cloudflare secrets and dashboard bindings.

Compare:

- `ADMIN_PASSWORD` / `API_TOKEN`
- Provider secrets
- KV / D1 ids in the deployed Worker bindings

## Where to get help

- [Quick Start](/en/quick-start)
- [Environment variables](/en/deploy/env)
- [GitHub Issues](https://github.com/InnoNestX/GlobalPulse/issues)
