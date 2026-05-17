# Admin UI

The Admin UI at `/admin` provides a complete configuration interface.

## Access

Visit `/admin` and enter your `ADMIN_PASSWORD`.

## Global Settings

| Setting | Description |
|---------|-------------|
| **App Name** | Display name for briefings |
| **Language** | Chinese (zh) or English (en) |
| **Timezone** | IANA timezone (e.g., Asia/Hong_Kong) |
| **Output Format** | markdown, text, or json |
| **Topic Focus** | Default topic for digest mode |

## Schedule Management

Create up to 20 independent schedules, each with:

- **Name & Enabled** - Schedule identification
- **Trigger Mode** - Time slots or cron expression
- **Time & Days** - When to send (in selected timezone)
- **Language & Format** - Output language and format
- **Report Type** - a_share, us_stock, crypto, daily_hot, custom
- **Report Mode** - market (AI) or digest (RSS)
- **Market Session** - pre_open, intraday, post_close
- **Focus Symbols** - Up to 80 symbols to track
- **Module Toggles** - Enable/disable report modules

### Batch Schedule Builder

Quick-create multiple schedules by report type:

```
[A-Share Daily] → Creates pre-open, intraday, post-close for A-share
[US Stock Daily] → Creates pre-open, intraday, post-close for US
[Crypto Daily] → Creates Binance-based crypto briefing
```

## Provider Configuration

### Feishu

```yaml
Webhook URL: https://open.feishu.cn/open-apis/bot/v2/hook/xxx
Signing Secret: (optional, for HMAC verification)
```

### WeChat Official Account

```yaml
App ID: wx_xxxxxxxxxxxxxxx
App Secret: xxxxxxxxxxxxxxx
OpenID: xxxxxxxxxxxx
```

### WeChat Clawbot

```yaml
Webhook URL: https://your-clawbot-server/webhook
OR
Webhook Key: xxxxxxxxx
```

### Telegram

```yaml
Bot Token: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
Chat ID: 123456789
```

### Email

```yaml
Provider: Brevo (or Resend)
API Key: xkeysib-xxxxxxxxxxxx
Sender: pulse@yourdomain.com
```

Add recipients via the address book with custom notes/labels.

## Live Preview

Click "Preview" on any schedule to see exactly what message will be sent to each provider - formatted for that platform.

## Test Send

Use "Test Send" to immediately trigger a schedule without waiting for the cron trigger.

## Delivery Logs

View recent deliveries with:
- Timestamp
- Schedule name
- Provider
- Status (success/failed)
- Preview of content