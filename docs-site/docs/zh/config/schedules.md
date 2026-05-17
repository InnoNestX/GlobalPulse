# 定时任务

任务定义何时以及如何发送 GlobalPulse 简报。

## 任务结构

```typescript
interface PulseSchedule {
  id: string;
  name: string;
  enabled: boolean;
  triggerMode: "slots" | "cron";
  cronExpression?: string;
  time: string;          // HH:MM 格式
  days: number[];       // 0=周日, 1=周一, ... 6=周六
  timezone: string;      // IANA 时区
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

## 报告类型

| 类型 | 市场 | 描述 |
|------|------|------|
| `a_share` | A股 | A股市场情报 |
| `us_stock` | 美股 | 美股市场情报 |
| `crypto` | 加密 | 加密货币简报 |
| `daily_hot` | 全球 | 每日热点话题 |
| `custom` | 自定义 | 用户自定义主题 |

## 报告模式

### 市场模式 (Market)
完整 AI 研究引擎：
- 多源数据获取
- 新闻证据构建
- LLM 分析
- 生成置信度报告

### 摘要模式 (Digest)
简单聚合：
- RSS/新闻源获取
- 模板渲染
- 无 AI 分析

## 市场时段

| 时段 | 时间 | 典型内容 |
|------|------|----------|
| `pre_open` | 开盘前 | 隔夜动态、期货行情 |
| `intraday` | 盘中 | 实时更新、涨跌幅 |
| `post_close` | 盘后 | 收盘总结、次日预览 |

## 市场日历

| 日历 | 交易日 |
|------|--------|
| `everyday` | 每天 |
| `a_share` | A股交易日历 |
| `us_stock` | 美股交易日历 |
| `crypto` | 加密货币（每日交易） |

### 交易日数据源

- **weekday**: 手动 - 选择星期几
- **external**: 自动 - 使用第三方节假日API

## 触发模式

### 时间槽
```
时间: 09:30
日期: [1, 2, 3, 4, 5]  // 周一至周五
时区: Asia/Hong_Kong
```

### Cron 表达式
```
cronExpression: "30 9 * * 1-5"
timezone: "Asia/Hong_Kong"
```

注意：Cron 必须兼容5分钟间隔 (`*/5`, `5/`, 等)

## 模块开关

控制报告中显示的内容：

```typescript
interface ReportModuleSwitches {
  news: boolean;           // 新闻摘要
  us_market: boolean;      // 美股行情
  a_share: boolean;       // A股行情
  crypto: boolean;        // 加密行情
  fear_greed: boolean;     // 恐慌贪婪指数
  technicals: boolean;     // RSI、MA信号
  sentiment: boolean;      // 情绪分析
  catalysts: boolean;      // 关键事件
  x_sentiment: boolean;   // Twitter情绪
  positions: boolean;      // 持仓数据
  macro: boolean;          // 宏观背景
}
```

## 关注标的

每个任务最多80个标的：

```javascript
// 美股
["AAPL", "MSFT", "GOOGL", "NVDA", "TSLA"]

// A股
["000001", "000002", "600000"]

// 加密
["BTC", "ETH", "SOL"]
```

标的会自动跨市场标准化。A股标的配合A股报告类型使用，美股标的配合美股报告使用。