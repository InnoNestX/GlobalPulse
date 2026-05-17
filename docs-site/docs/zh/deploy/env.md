# 环境变量

## Secrets 配置

GlobalPulse 使用 Cloudflare Workers Secrets 存储敏感数据。

### 必需

```bash
# 管理后台密码
wrangler secret put ADMIN_PASSWORD

# API token（用于程序化访问）
wrangler secret put API_TOKEN

# LLM API key（用于研究引擎）
wrangler secret put GEMINI_API_KEY
```

### 可选 - 数据源

```bash
wrangler secret put ALPHA_VANTAGE_API_KEY
wrangler secret put FINNHUB_API_KEY
wrangler secret put COINGECKO_API_KEY
```

### 可选 - 渠道

```bash
# 飞书
wrangler secret put FEISHU_WEBHOOK_URL
wrangler secret put FEISHU_SIGNING_SECRET

# Telegram
wrangler secret put TELEGRAM_BOT_TOKEN

# Email
wrangler secret put BREVO_API_KEY
wrangler secret put RESEND_API_KEY
```

## 本地开发 (.dev.vars)

本地开发时，创建 `.dev.vars` 文件（已在 .gitignore 中）：

```bash
ADMIN_PASSWORD=dev-password
API_TOKEN=dev-token
GEMINI_API_KEY=your-key
```

## 环境特定配置

使用 `wrangler.toml` 的 environments 配置不同阶段：

```toml
[env.staging]
name = "globalpulse-staging"

[env.production]
name = "globalpulse"
kv_namespaces = [
  { binding = "APP_KV", id = "prod-kv-id" }
]
```