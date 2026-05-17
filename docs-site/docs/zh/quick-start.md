# 快速开始

5分钟启动 GlobalPulse。

## 环境要求

- Node.js 18+
- npm 或 pnpm
- Cloudflare 账号（免费版即可）
- Git

## 安装

```bash
# 克隆仓库
git clone https://github.com/nestjs/globalpulse.git
cd globalpulse

# 安装依赖
npm install

# 复制环境配置
cp .dev.vars.example .dev.vars
cp wrangler.example.jsonc wrangler.jsonc
```

## 配置

编辑 `.dev.vars`：

```bash
ADMIN_PASSWORD=your-secure-password
API_TOKEN=your-api-token
```

编辑 `wrangler.jsonc` 中的 Cloudflare namespace ID：

```json
{
  "name": "your-worker-name",
  "kv_namespaces": [
    { "id": "your-kv-namespace-id", "binding": "APP_KV" }
  ]
}
```

## 本地运行

```bash
npm run dev
```

打开 `http://localhost:8787/admin`，使用 `ADMIN_PASSWORD` 登录。

## 部署到 Cloudflare

```bash
# 登录 Cloudflare
npx wrangler login

# 部署
npm run deploy
```

你的 GlobalPulse 将在 `https://your-worker-name.workers.dev/admin` 上线。

## 下一步

- [配置定时任务](/zh/config/schedules)
- [设置推送渠道](/zh/config/providers)
- [自定义模板](/zh/config/templates)