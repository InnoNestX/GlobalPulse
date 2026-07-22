# GlobalPulse 与同类方案对比

如果你在找 **自托管行情简报机器人**、**飞书/企微定时推送**、**Telegram 财经早报**，或 **Cloudflare Workers 定时新闻推送**，这篇说明 GlobalPulse 适合什么场景。

## 适合谁

- 需要 **A股 / 美股 / 加密 / 热点** 定时简报
- 希望跑在 **Cloudflare Workers**（不必常开 VPS）
- 已在用 **飞书、微信、Telegram、邮件**
- 想要 **可视化 Admin**，而不只靠 YAML / n8n

## 和其他做法对比

| 需求 | GlobalPulse | n8n / Make | 自写 Discord/Telegram Bot | 通用 RSS → Webhook |
|------|-------------|------------|---------------------------|--------------------|
| 交易日历（A股/美股/加密） | 内置 | 自己拼 | 自己拼 | 通常没有 |
| **Pulse Continuity（相对上期变化）** | 内置 | 自己拼 | 少见 | 无 |
| **Autopilot 插播告警** | 内置 | 自己拼 | 自己拼 | 无 |
| 多模块研报 | 内置 | 自己拼 | 自己拼 | 无 |
| 任务与模板 Admin | 有 | 部分有 | 少见 | 无 |
| Cloudflare Workers Cron | 是 | 通常在别处 | 通常在别处 | 看实现 |
| 飞书+微信+Telegram+邮件+Discord+Slack | 支持 | 靠插件 | 部分 | 部分 |
| 自托管 MIT | 是 | 看产品 | 是 | 是 |

## 常见搜索词

- Cloudflare Workers 财经新闻推送
- 飞书机器人 定时行情简报
- Telegram 股票早报 开源
- A股开盘前简报 自动化
- 企微/微信 市场热点推送
- 自托管 市场情报推送

## 下一步

1. [快速开始](./quick-start.md)
2. [功能特性](./features.md)
3. [Cloudflare 部署](./deploy/cloudflare.md)
4. GitHub：[InnoNestX/GlobalPulse](https://github.com/InnoNestX/GlobalPulse)
