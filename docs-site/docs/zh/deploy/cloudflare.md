# 部署

## Cloudflare 部署

### 1. 创建 Cloudflare Workers 项目

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 创建新 worker
wrangler init globalpulse
cd globalpulse
```

### 2. 配置 wrangler.toml

```toml
name = "globalpulse"
main = "src/index.ts"
compatibility_date = "2026-01-01"

kv_namespaces = [
  { binding = "APP_KV", id = "your-kv-namespace-id" }
]

[env.production]
kv_namespaces = [
  { binding = "APP_KV", id = "your-production-kv-id" }
]
```

### 3. 创建 KV 命名空间

```bash
# 创建 KV 命名空间
wrangler kv:namespace create APP_KV

# 记录返回的 ID，添加到 wrangler.toml
```

### 4. 设置 Secrets

```bash
wrangler secret put ADMIN_PASSWORD
wrangler secret put API_TOKEN
wrangler secret put GEMINI_API_KEY
# 按需添加其他 provider secrets
```

### 5. 部署

```bash
# 部署到生产环境
wrangler deploy

# 或使用 npm 脚本
npm run deploy
```

部署后访问 `https://your-worker-name.workers.dev/admin`。

## 环境变量

必需 secrets：

| 变量 | 描述 |
|------|------|
| `ADMIN_PASSWORD` | 管理后台登录密码 |
| `API_TOKEN` | API 认证 token |
| `GEMINI_API_KEY` | LLM 的 Gemini API key |

可选数据源 secrets：

| 变量 | 数据源 |
|------|--------|
| `ALPHA_VANTAGE_API_KEY` | Alpha Vantage |
| `FINNHUB_API_KEY` | Finnhub |
| `COINGECKO_API_KEY` | CoinGecko |

可选渠道 secrets：

| 变量 | 渠道 |
|------|------|
| `FEISHU_WEBHOOK_URL` | 飞书 webhook |
| `FEISHU_SIGNING_SECRET` | 飞书 HMAC secret |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `BREVO_API_KEY` | Brevo email |
| `RESEND_API_KEY` | Resend email |

## 域名绑定（可选）

将 Cloudflare 域名指向 worker：

```bash
wrangler route create "https://pulse.yourdomain.com/*"
```

## 验证部署

部署后检查：

1. 访问 `https://your-worker.workers.dev/health` - 应返回 OK
2. 访问 `https://your-worker.workers.dev/admin` - 应显示登录页
3. 登录并配置第一个任务