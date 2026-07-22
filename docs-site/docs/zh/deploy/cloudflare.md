# Cloudflare 部署

从本仓库直接部署，不要对已有克隆再执行 `wrangler init`。

## 1. 准备仓库

```bash
git clone https://github.com/InnoNestX/GlobalPulse.git
cd GlobalPulse
npm install
cp wrangler.example.jsonc wrangler.jsonc
cp .dev.vars.example .dev.vars
```

## 2. 登录

```bash
npx wrangler login
```

## 3. 创建绑定资源

```bash
npx wrangler kv namespace create APP_KV
npx wrangler d1 create globalpulse-research
```

更新 `wrangler.jsonc`：

```jsonc
{
  "name": "globalpulse",
  "kv_namespaces": [
    { "binding": "APP_KV", "id": "<kv-id>" }
  ],
  "d1_databases": [
    {
      "binding": "RESEARCH_DB",
      "database_name": "globalpulse-research",
      "database_id": "<d1-id>"
    }
  ],
  "triggers": {
    "crons": ["*/5 * * * *"]
  }
}
```

除非你明确要改，否则保留示例中的 `ai`、`vars`、`compatibility_date`。

## 4. 设置 Secrets

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put API_TOKEN
```

可选：

```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put FEISHU_WEBHOOK_URL
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
```

渠道凭证也可以之后在管理后台写入（KV 配置）。

## 5. 部署

```bash
npm run deploy
```

## 6. 验证

1. 访问 `GET https://<worker>.workers.dev/health`
2. 打开 `https://<worker>.workers.dev/admin` 并登录
3. 配置一个渠道 + 一个定时任务
4. 先用推送预览，再依赖 Cron

## 常见失败

| 现象 | 可能原因 |
|------|----------|
| 部署因 KV/D1 失败 | `wrangler.jsonc` 仍是占位 ID |
| 管理后台登录失败 | Secret / `.dev.vars` 密码不一致 |
| Cron 从不推送 | 时区未命中，或未启用推送目标 |
| 预览为空 | 未选择时间表，或数据源回退/为空 |

更多见 [常见问题](/zh/faq)。

## 自定义域名（可选）

在 Cloudflare 控制台绑定路由，或在本地 `wrangler.jsonc` 配置 routes。密钥与绑定 ID 不要提交到 git。
