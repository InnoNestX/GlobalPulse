# GlobalPulse

GlobalPulse is a Cloudflare Workers app for scheduled finance and global hotspot briefings. It includes a password-protected Admin Web UI, KV-backed configuration, cron execution, and push providers for Feishu and WeChat.

## What It Does

- Serves an Admin UI at `/admin`.
- Stores user settings in Cloudflare Workers KV.
- Lets users edit briefing language, timezone, output format, content template, topic query, RSS source, push targets, and push times.
- Runs every 5 minutes through Cloudflare Cron Triggers and checks the user's configured schedule in their chosen timezone.
- Generates default briefings from a composite source set inspired by a separate market-briefing reference implementation.
- Pushes generated briefings to:
  - `feishu`
  - `wechat_official_account`
  - `wechat_ai_agent`
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
- At least one push provider secret

Do not commit local deployment files or secrets. This repository intentionally ships only `wrangler.example.jsonc`; each deployer keeps their real `wrangler.jsonc`, domain, KV namespace id, API tokens, and webhook URLs outside git.

See [Cloudflare setup guide](docs/cloudflare-setup.md) for the full deployment flow.

## Admin UI

The Admin UI lets users configure:

- Display language: Chinese or English
- Timezone: for example `Asia/Hong_Kong`, `UTC`, `America/New_York`
- Output format: `markdown` by default, with `text` and `json` also available
- Content template with variables such as `{{itemsMarkdown}}` and `{{generatedAt}}`
- Push time points and weekdays
- Topic query and optional RSS source URL
- Push targets

See [Admin guide](docs/admin-guide.md) for template variables and schedule behavior.

See [Data generation notes](docs/data-generation.md) for the current source strategy and future indicator roadmap.

## Cloudflare Notes

Cloudflare Cron Triggers execute on UTC. GlobalPulse uses a fixed Worker cron of `*/5 * * * *`, then checks each saved schedule against the user's selected timezone from KV.

The project uses a local `wrangler.jsonc`, Workers KV, and generated runtime types from `wrangler types`. The generated `worker-configuration.d.ts` file is ignored because it can include account-specific bindings.

## Scripts

```bash
npm run dev
npm run check
npm run deploy
```

## References

- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Feishu custom bot guide](https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot?lang=zh-CN)
- [WeChat Official Account access token](https://developers.weixin.qq.com/doc/offiaccount/Basic_Information/Get_access_token.html)
- [WeChat Official Account customer-service messages](https://developers.weixin.qq.com/doc/offiaccount/Message_Management/Service_Center_messages.html)

## License

MIT
