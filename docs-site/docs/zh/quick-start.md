# 快速开始

先在本地打开管理后台，生产部署前再创建 Cloudflare 资源。

## 环境要求

- Node.js 18+
- npm
- Cloudflare 账号（免费版即可）
- Git

## 1. 安装

```bash
git clone https://github.com/InnoNestX/GlobalPulse.git
cd GlobalPulse
npm install
cp .dev.vars.example .dev.vars
cp wrangler.example.jsonc wrangler.jsonc
```

## 2. 本地密钥

编辑 `.dev.vars`：

```bash
ADMIN_PASSWORD=your-secure-password
API_TOKEN=your-api-token
```

请使用足够长的随机值，且不要提交 `.dev.vars`。

## 3. 本地运行

```bash
npm run dev
```

打开 `http://localhost:8787/admin`，用 `ADMIN_PASSWORD` 登录。

本地 Wrangler 可使用预览绑定体验 Admin UI，不一定要先创建生产 KV/D1。

## 4. 第一份简报清单

在 `/admin` 中：

1. 至少配置一个推送渠道（飞书 / Telegram / 微信 / Email）
2. 新建一个定时任务（时区 + 推送时间）
3. 打开「推送预览」确认内容
4. 保存，等待下一个 Cron 窗口，或使用手动运行（若可用）

若预览为空，通常是还没选时间表，或未启用推送目标。

## 5. 创建 Cloudflare 资源（生产前）

```bash
npx wrangler login

# 配置存储 KV
npx wrangler kv namespace create APP_KV

# 研究历史 D1（建议创建）
npx wrangler d1 create globalpulse-research
```

把返回的 ID 填进 `wrangler.jsonc`：

- `kv_namespaces[0].id`
- `d1_databases[0].database_id`

## 6. 生产 Secrets 与部署

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put API_TOKEN
# 可选 LLM / 行情密钥：
# npx wrangler secret put GEMINI_API_KEY

npm run deploy
```

访问 `https://<your-worker>.workers.dev/admin`。

## 下一步

- [Cloudflare 部署详情](/zh/deploy/cloudflare)
- [环境变量](/zh/deploy/env)
- [定时任务](/zh/config/schedules)
- [推送渠道](/zh/config/providers)
- [常见问题](/zh/faq)
