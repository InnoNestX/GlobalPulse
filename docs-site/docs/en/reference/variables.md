# Template Variables

## Available Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{generatedAt}}` | UTC timestamp | `2024-01-15 10:30:00 UTC` |
| `{{timezone}}` | Schedule timezone | `Asia/Hong_Kong` |
| `{{appName}}` | Configured app name | `GlobalPulse` |
| `{{scheduleName}}` | Schedule identifier | `US Morning Brief` |
| `{{topicQuery}}` | Topic query string | `Tech earnings` |
| `{{sourceUrl}}` | RSS source URL | `https://rss.example.com` |
| `{{reportType}}` | Report type | `us_stock` |
| `{{reportMode}}` | Report mode | `market` |
| `{{itemsMarkdown}}` | News items markdown | `**AAPL** +5%...` |
| `{{itemsText}}` | News items plain text | `AAPL +5%...` |
| `{{itemsJson}}` | News items JSON | `[{"title":"AAPL..."}]` |
| `{{marketReport}}` | AI research output | Full markdown report |

## Digest Mode Variables

Used when `reportMode: "digest"`:

### {{itemsMarkdown}}

News items formatted as markdown list:

```markdown
- **AAPL** Reports Q4 Earnings Beat
  - Revenue: $119.6B (+8% YoY)
  - EPS: $2.18 vs $2.10 expected
- **TSLA** Announces New Factory
  - Location: Mexico
  - Investment: $10B
```

### {{itemsText}}

Plain text alternative:

```
• AAPL Reports Q4 Earnings Beat
  Revenue: $119.6B (+8% YoY)
  EPS: $2.18 vs $2.10 expected
• TSLA Announces New Factory
```

### {{itemsJson}}

JSON array of news items:

```json
[
  {
    "title": "AAPL Reports Q4 Earnings Beat",
    "summary": "Revenue: $119.6B...",
    "url": "https://example.com/article",
    "source": "NewsAPI",
    "publishedAt": "2024-01-15T10:00:00Z"
  }
]
```

## Market Mode Variables

Used when `reportMode: "market"`:

### {{marketReport}}

AI-generated research report with:

- Market summary
- Top movers
- Technical signals
- Sentiment analysis
- Catalysts
- Position updates
- Macro context

Example structure:

```markdown
# US Market Briefing - 2024-01-15

## Market Summary
S&P 500 +1.2% | Nasdaq +1.5% | Dow +0.8%

## Top Movers
| Symbol | Price | Change |
|--------|-------|--------|
| NVDA | $650 | +5.2% |
| AMD | $150 | +3.8% |

## Signals
- NVDA: RSI Overbought (75)
- AMD: Golden Cross detected

## Sentiment: Bullish
Tech sector showing strong momentum...

## Catalysts
- Fed meeting minutes released
- CPI data in line with expectations
```

## Dynamic Variables

### Time Formatting

`{{generatedAt}}` format: `YYYY-MM-DD HH:mm:ss TZ`

Customizable via Admin UI timezone selection.

### Conditional Content

Use provider-specific formatting to handle differences:

**Telegram** (HTML):
```html
<b>{{appName}}</b> 📊

{{itemsMarkdown}}
```

**Feishu** (Markdown):
```markdown
**{{appName}}** 📊

{{itemsMarkdown}}
```

**Email** (HTML):
```html
<h1>{{appName}}</h1>
<div class="content">{{itemsMarkdown}}</div>
<footer>{{generatedAt}} • {{timezone}}</footer>
```