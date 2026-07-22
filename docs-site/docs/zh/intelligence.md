# 情报模块（Intelligence）

GlobalPulse 在定时简报之外，自研了三套情报能力。

## Pulse Continuity（跨期连续）

每次成功推送后保存指纹快照：

- 市场偏向 / 驱动 / 宏观风险
- 标的分数与观点
- 标题 hash

下一次运行会对比上期，并追加 **相对上期** 区块：

- 偏向变化
- 观点翻转
- 分数跃迁
- 新增 / 消退标题

存储优先走 KV/Durable Object；绑定 D1 时写入 `pulse_snapshots`。

## Autopilot Radar（自动驾驶雷达）

在固定时间点之外，Cron 还会评估 Autopilot 规则：

| 类型 | 默认含义 |
|------|----------|
| `symbol_move` | 关注/持仓标的波动超过 ±3% |
| `fear_greed_extreme` | Fear & Greed ≤20 或 ≥80 |
| `news_burst` | 短窗口内突发新闻数量偏多 |
| `bias_flip` | Continuity 偏向偏离预期 |

触发后发送短告警（不是完整研报），并用 cooldown 防止刷屏。

在 Admin → **Intelligence** 配置，或调用：

- `GET/PUT /api/admin/autopilot`
- `POST /api/admin/autopilot/scan`

## Discord + Slack

新增渠道：

- `discord` — `DISCORD_WEBHOOK_URL`
- `slack` — `SLACK_WEBHOOK_URL`

也可在 Admin 渠道卡片 / KV providerSettings 中配置。

## 研报历史

绑定 `RESEARCH_DB` 后，Admin Intelligence 可查看最近 `research_runs`。

API：`GET /api/admin/research-runs?limit=20`

## 迁移

```bash
npx wrangler d1 execute globalpulse-research --remote --file=migrations/0002_intelligence.sql
```
