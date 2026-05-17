# 模板变量

## 可用变量

| 变量 | 描述 | 示例 |
|------|------|------|
| `{{generatedAt}}` | UTC 时间戳 | `2026-01-15 10:30:00 UTC` |
| `{{timezone}}` | 任务时区 | `Asia/Hong_Kong` |
| `{{appName}}` | 配置的应用名 | `GlobalPulse` |
| `{{scheduleName}}` | 任务标识符 | `美股早报` |
| `{{topicQuery}}` | 主题查询字符串 | `科技财报` |
| `{{sourceUrl}}` | RSS 源 URL | `https://rss.example.com` |
| `{{reportType}}` | 报告类型 | `us_stock` |
| `{{reportMode}}` | 报告模式 | `market` |
| `{{itemsMarkdown}}` | 新闻项 markdown | `**AAPL** +5%...` |
| `{{itemsText}}` | 新闻项纯文本 | `AAPL +5%...` |
| `{{itemsJson}}` | 新闻项 JSON | `[{"title":"AAPL..."}]` |
| `{{marketReport}}` | AI 研究输出 | 完整 markdown 报告 |

## 摘要模式变量

`reportMode: "digest"` 时使用：

### {{itemsMarkdown}}

格式化的 markdown 新闻列表：

```markdown
- **AAPL** 第四季度财报超预期
  - 营收: $119.6B (+8% 同比)
  - EPS: $2.18 vs $2.10 预期
- **TSLA** 宣布新工厂
  - 地点: 墨西哥
  - 投资: $100亿
```

### {{itemsText}}

纯文本替代：

```
• AAPL 第四季度财报超预期
  营收: $119.6B (+8% 同比)
  EPS: $2.18 vs $2.10 预期
• TSLA 宣布新工厂
```

### {{itemsJson}}

JSON 数组：

```json
[
  {
    "title": "AAPL 第四季度财报超预期",
    "summary": "营收: $119.6B...",
    "url": "https://example.com/article",
    "source": "NewsAPI",
    "publishedAt": "2026-01-15T10:00:00Z"
  }
]
```

## 市场模式变量

`reportMode: "market"` 时使用：

### {{marketReport}}

AI 生成的研究报告，包含：

- 市场概要
- 主要涨跌
- 技术信号
- 情绪分析
- 催化剂
- 持仓更新
- 宏观背景

示例结构：

```markdown
# 美股简报 - 2026-01-15

## 市场概要
标普500 +1.2% | 纳斯达克 +1.5% | 道指 +0.8%

## 主要涨跌
| 股票代码 | 价格 | 涨跌幅 |
|--------|------|--------|
| NVDA | $650 | +5.2% |
| AMD | $150 | +3.8% |

## 信号
- NVDA: RSI 超买 (75)
- AMD: 金叉检测到

## 情绪: 看涨
科技板块显示强劲动能...

## 催化剂
- 美联储会议纪要发布
- CPI 数据符合预期
```

## 动态变量

### 时间格式

`{{generatedAt}}` 格式: `YYYY-MM-DD HH:mm:ss TZ`

可通过管理后台的时区选择自定义。

### 条件内容

使用渠道特定格式处理差异：

**Telegram** (HTML)：
```html
<b>{{appName}}</b> 📊

{{itemsMarkdown}}
```

**飞书** (Markdown)：
```markdown
**{{appName}}** 📊

{{itemsMarkdown}}
```

**Email** (HTML)：
```html
<h1>{{appName}}</h1>
<div class="content">{{itemsMarkdown}}</div>
<footer>{{generatedAt}} • {{timezone}}</footer>
```