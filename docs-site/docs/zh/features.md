# 功能特性

## 核心架构

GlobalPulse 基于 **Cloudflare Workers** 构建，采用模块化架构：

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Worker                        │
├─────────────────────────────────────────────────────────────┤
│  管理后台  │  调度器  │  研究引擎  │  推送服务              │
│    (HTML)  │  (Cron)  │  (LLM+数据)│  (Providers)          │
├─────────────────────────────────────────────────────────────┤
│              KV 命名空间  │  D1 数据库                     │
└─────────────────────────────────────────────────────────────┘
```

## 管理后台

密码保护配置界面，访问 `/admin`：

- **全局设置**：应用名、语言、时区、输出格式
- **任务构建器**：可视化定时调度，支持批量创建
- **渠道配置**：飞书、微信、Telegram、Email 设置
- **实时预览**：查看每个渠道将收到的消息格式
- **推送日志**：追踪发送记录和时间戳

## 定时简报

| 功能 | 描述 |
|------|------|
| **执行间隔** | 通过 Cloudflare Cron 每5分钟执行 |
| **时区支持** | 完整 IANA 时区数据库 |
| **交易日** | 美股、A股、加密货币日历 |
| **市场时段** | 盘前、盘中、盘后 |
| **多任务** | 最多20个独立任务 |

## 市场情报

### 支持的市场

| 市场 | 数据源 |
|------|--------|
| **美股** | Yahoo Finance, Stooq, Twelve Data, Finnhub, Alpha Vantage |
| **A股** | 东方财富, 新浪, 腾讯, Twelve Data |
| **加密货币** | Binance, CoinGecko, Alternative.me |

### 报告模块

每个任务可独立开关：

- `us_market` - 美股ETF行情和涨跌幅
- `a_share` - A股指数行情
- `crypto` - 加密货币现货价格
- `fear_greed` - 恐慌贪婪指数
- `technicals` - RSI/MA 技术信号
- `sentiment` - 新闻情绪评分
- `news` - 新闻摘要
- `catalysts` - 政策/事件催化剂
- `x_sentiment` - Twitter 情绪
- `positions` - 持仓数据
- `macro` - 宏观背景（美联储、CPI、财报）

## AI 研究引擎

两种报告模式：

### 摘要模式 (Digest)
简单的主题聚合，来自 RSS 和新闻源。

### 市场模式 (Market)
完整研究引擎：

1. 多源数据获取 + 降级链路
2. 宏观数据收集（美联储、CPI、财报）
3. 新闻证据构建
4. LLM 分析（Gemini → Workers AI → 确定性降级）
5. 带置信度的股票卡片
6. D1 持久化历史

## 推送渠道

| 渠道 | 特性 |
|------|------|
| **飞书** | Webhook + HMAC 签名 |
| **微信公众号** | App ID/Secret + OpenID |
| **微信 clawbot** | Webhook 推送 |
| **Telegram** | HTML 格式化，内联键盘 |
| **Email** | Brevo/Resend，HTML 模板 |

## 安全

- 管理后台密码保护（cookie 或 header 认证）
- API Token 认证接口
- KV 配置存储（代码中不存 secrets）
- 飞书 Webhook HMAC 签名验证

## API 接口

```
GET  /              → 重定向到 /admin
GET  /admin         → 管理后台
GET  /health        → 健康检查
POST /v1/messages   → 发送消息
POST /v1/events/github-actions
POST /v1/events/cloudflare
GET  /api/admin/settings
PUT  /api/admin/settings
POST /api/admin/preview
POST /api/admin/run
```