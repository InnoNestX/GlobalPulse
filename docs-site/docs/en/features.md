# Features

## Core Architecture

GlobalPulse is built on **Cloudflare Workers** with a modular architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Worker                        │
├─────────────────────────────────────────────────────────────┤
│  Admin UI  │  Scheduler  │  Research Engine  │  Delivery    │
│    (HTML)  │   (Cron)    │    (LLM + Data)   │  (Providers) │
├─────────────────────────────────────────────────────────────┤
│              KV Namespace  │  D1 Database                   │
└─────────────────────────────────────────────────────────────┘
```

## Admin Web UI

Password-protected configuration interface at `/admin`:

- **Global Settings**: App name, language, timezone, output format
- **Schedule Builder**: Visual cron-like scheduler with batch creation
- **Provider Config**: Feishu, WeChat, Telegram, Email setup
- **Live Preview**: See exactly what message each provider will receive
- **Delivery Logs**: Track sent messages with timestamps

## Scheduled Briefings

| Feature | Description |
|---------|-------------|
| **Intervals** | Every 5 minutes via Cloudflare Cron |
| **Timezones** | Full IANA timezone support |
| **Trading Days** | US stock, A-share, crypto calendars |
| **Market Sessions** | Pre-open, intraday, post-close |
| **Multiple Schedules** | Up to 20 independent schedules |

## Market Intelligence

### Supported Markets

| Market | Data Sources |
|--------|-------------|
| **US Stocks** | Yahoo Finance, Stooq, Twelve Data, Finnhub, Alpha Vantage |
| **A-Share** | Eastmoney, Sina, Tencent, Twelve Data |
| **Crypto** | Binance, CoinGecko, Alternative.me |

### Report Modules

Toggle individual modules per schedule:

- `us_market` - US ETF quotes & movers
- `a_share` - A-share index quotes
- `crypto` - Crypto spot prices
- `fear_greed` - Fear & Greed Index
- `technicals` - RSI/MA signals
- `sentiment` - News sentiment scoring
- `news` - News summary
- `catalysts` - Policy/events catalysts
- `x_sentiment` - Twitter sentiment
- `positions` - Position holders
- `macro` - Fed, CPI, earnings

## AI-Powered Research

Two report modes:

### Digest Mode
Simple topic aggregation from RSS and news sources.

### Market Mode
Full research engine with:

1. Multi-source data fetching with fallback chain
2. Macro data collection (Fed, CPI, earnings)
3. Evidence building from news
4. LLM analysis (Gemini → Workers AI → deterministic)
5. Confidence-scored stock cards
6. D1 persistence for history

## Push Providers

| Provider | Features |
|----------|----------|
| **Feishu** | Webhook + HMAC signature |
| **WeChat OA** | App ID/Secret + OpenID |
| **WeChat Clawbot** | Webhook delivery |
| **Telegram** | HTML formatting, inline keyboards |
| **Email** | Brevo/Resend, HTML templates |

## Security

- Admin password-protected UI (cookie or header auth)
- API token authentication for endpoints
- KV-backed configuration (no secrets in code)
- HMAC signatures for Feishu webhooks

## API Endpoints

```
GET  /              → Redirect to /admin
GET  /admin         → Admin UI
GET  /health        → Health check
POST /v1/messages   → Send message
POST /v1/events/github-actions
POST /v1/events/cloudflare
GET  /api/admin/settings
PUT  /api/admin/settings
POST /api/admin/preview
POST /api/admin/run
```