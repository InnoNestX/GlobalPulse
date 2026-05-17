# Providers

GlobalPulse pushes to multiple providers simultaneously.

## Provider Status

Check which providers are configured at `GET /v1/providers`:

```json
{
  "feishu": { "configured": true },
  "wechat_official_account": { "configured": false },
  "wechat_clawbot": { "configured": true },
  "telegram": { "configured": true },
  "email": { "configured": true }
}
```

## Feishu

### Configuration

1. Create a bot in Feishu Open Platform
2. Get the Webhook URL: `https://open.feishu.cn/open-apis/bot/v2/hook/xxx`
3. (Optional) Enable signature verification

```yaml
Webhook URL: https://open.feishu.cn/open-apis/bot/v2/hook/your-hook-id
Signing Secret: your-hmac-secret (optional)
```

### Message Format

- Markdown with Feishu-specific extensions
- Supports @mentions via `at` tags
- Interactive cards with buttons

## WeChat Official Account

### Configuration

Requires WeChat Official Account credentials:

```yaml
App ID: wx_xxxxxxxxxxxxxxx
App Secret: xxxxxxxxxxxxxxx
OpenID: xxxxxxxxxxxx (recipient)
```

### Limitations

- WeChat has strict content policies
- HTML limited to basic formatting
- Media requires special handling

## WeChat Clawbot

### Configuration

Alternative WeChat delivery via clawbot server:

```yaml
Webhook URL: https://your-clawbot-server.com/webhook
OR
Webhook Key: your-webhook-key
```

### Advantages

- More flexible content
- Bypasses some WeChat restrictions
- Better for automated delivery

## Telegram

### Configuration

1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Get your bot token: `123456:ABC-DEF1234`
3. Start a chat with your bot
4. Get your chat ID (use @userinfobot)

```yaml
Bot Token: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
Chat ID: 123456789
```

### Features

- HTML formatting (bold, italic, code, links)
- Inline keyboards for interactivity
- Group and channel support

### HTML Support

```html
<b>bold</b>
<i>italic</i>
<code>code</code>
<a href="url">link</a>
<pre>preformatted</pre>
```

## Email

### Providers

| Provider | API |
|----------|-----|
| Brevo | SMTP or API (recommended) |
| Resend | API |

### Configuration

```yaml
Provider: Brevo
API Key: xkeysib-xxxxxxxxxxxx
Sender: GlobalPulse <pulse@yourdomain.com>
```

### Email Recipients

Manage via address book in Admin UI:

```typescript
interface EmailRecipient {
  id: string;
  address: string;
  note: string;       // e.g., "CEO", "Trading Desk"
  enabled: boolean;
}
```

### Templates

HTML email templates with:
- Header with logo
- Styled content
- Footer with unsubscribe link (placeholder)

## Multi-Provider Delivery

When multiple providers are configured:

1. Generate report once
2. Transform for each provider's format
3. Send in parallel
4. Log individual results

```typescript
const results = await Promise.allSettled(
  targets.map(provider => sendToProvider(provider, message))
);
```