# GlobalPulse vs Alternatives

Looking for a **self-hosted market briefing bot**, **Feishu / Lark scheduled digest**, **Telegram finance newsletter**, or a **Cloudflare Workers cron news pusher**? This page explains when GlobalPulse fits.

## Who GlobalPulse is for

- Teams that want **scheduled A-share / US stock / crypto / hotspot digests**
- Operators who prefer **Cloudflare Workers** (no always-on VPS)
- Channels already in use: **Feishu, WeChat, Telegram, Email**
- People who want an **Admin UI**, not only YAML/n8n graphs

## Compared with common approaches

| Need | GlobalPulse | n8n / Make | Custom Discord/Telegram bot | Generic RSS → Webhook |
|------|-------------|------------|-----------------------------|------------------------|
| Market calendars (A-share / US / crypto) | Built-in | DIY | DIY | Usually none |
| Multi-module research reports | Built-in | DIY | DIY | No |
| Admin UI for schedules & templates | Yes | Partial | Rare | No |
| Runs on Cloudflare Workers cron | Yes | Usually elsewhere | Usually elsewhere | Depends |
| Push to Feishu + WeChat + Telegram + Email | Yes | Via plugins | Partial | Partial |
| Self-hosted, MIT license | Yes | Depends | Yes | Yes |

## Search phrases this project targets

- self-hosted finance news bot Cloudflare Workers
- Feishu webhook scheduled market briefing
- Telegram stock digest cron
- A-share morning brief automation
- WeChat work bot market newsletter
- open source market intelligence push

## Start here

1. [Quick Start](./quick-start.md)
2. [Features](./features.md)
3. [Cloudflare deploy](./deploy/cloudflare.md)
4. GitHub: [InnoNestX/GlobalPulse](https://github.com/InnoNestX/GlobalPulse)
