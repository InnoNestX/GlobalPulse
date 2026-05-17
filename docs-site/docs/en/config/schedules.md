# Schedules

Schedules define when and how GlobalPulse sends briefings.

## Schedule Structure

```typescript
interface PulseSchedule {
  id: string;
  name: string;
  enabled: boolean;
  triggerMode: "slots" | "cron";
  cronExpression?: string;
  time: string;          // HH:MM format
  days: number[];       // 0=Sun, 1=Mon, ... 6=Sat
  timezone: string;      // IANA timezone
  language: "zh" | "en";
  outputFormat: "markdown" | "text" | "json";
  reportType: ReportType;
  reportMode: "market" | "digest";
  marketSession: MarketSession;
  focusSymbols: string[];
  positionSymbols: string[];
  moduleSwitches: ReportModuleSwitches;
  targets: ProviderName[];
  marketCalendar: MarketCalendar;
  tradingDaySource: "weekday" | "external";
  marketHolidayDates: string[];
  topicQuery: string;
  sourceUrl?: string;
  template: string;
}
```

## Report Types

| Type | Markets | Description |
|------|---------|-------------|
| `a_share` | China | A-share market intelligence |
| `us_stock` | US | US stock market intelligence |
| `crypto` | Crypto | Cryptocurrency briefing |
| `daily_hot` | Global | General daily hot topics |
| `custom` | Custom | User-defined topic |

## Report Modes

### Market Mode
Full AI research engine:
- Fetches data from multiple sources
- Builds evidence from news
- Runs LLM analysis
- Generates confidence-scored reports

### Digest Mode
Simple aggregation:
- RSS/News source fetching
- Template-based rendering
- No AI analysis

## Market Sessions

| Session | Timing | Typical Content |
|---------|--------|-----------------|
| `pre_open` | Before market open | Overnight developments, futures |
| `intraday` | During trading | Real-time updates, movers |
| `post_close` | After close | Summary, analysis, next day preview |

## Market Calendars

| Calendar | Trading Days |
|----------|-------------|
| `everyday` | All days |
| `a_share` | China stock exchange calendar |
| `us_stock` | US stock exchange calendar |
| `crypto` | Crypto is always "trading" |

### Trading Day Sources

- **weekday**: Manual - select days of week
- **external**: Automatic - uses third-party holiday APIs

## Trigger Modes

### Time Slots
```
Time: 09:30
Days: [1, 2, 3, 4, 5]  // Mon-Fri
Timezone: Asia/Hong_Kong
```

### Cron Expression
```
cronExpression: "30 9 * * 1-5"
timezone: "Asia/Hong_Kong"
```

Note: Cron must be compatible with 5-minute intervals (`*/5`, `5/`, etc.)

## Module Switches

Control what appears in market reports:

```typescript
interface ReportModuleSwitches {
  news: boolean;           // News summary
  us_market: boolean;      // US quotes
  a_share: boolean;       // A-share quotes
  crypto: boolean;        // Crypto quotes
  fear_greed: boolean;     // Fear & Greed Index
  technicals: boolean;     // RSI, MA signals
  sentiment: boolean;      // Sentiment analysis
  catalysts: boolean;      // Key events
  x_sentiment: boolean;   // Twitter sentiment
  positions: boolean;      // Position data
  macro: boolean;          // Macro background
}
```

## Focus Symbols

Up to 80 symbols per schedule:

```javascript
// US Stocks
["AAPL", "MSFT", "GOOGL", "NVDA", "TSLA"]

// A-Share
["000001", "000002", "600000"]

// Crypto
["BTC", "ETH", "SOL"]
```

Symbols are automatically normalized across markets. A-share symbols work with the A-share report type, US symbols with US stock reports, etc.