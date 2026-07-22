# 常见问题

自托管 GlobalPulse 时的高频问题。

## 部署提示 KV / D1 id 无效

`wrangler.example.jsonc` 里是占位 ID。请先创建真实资源并填入：

```bash
npx wrangler kv namespace create APP_KV
npx wrangler d1 create globalpulse-research
```

更新 `wrangler.jsonc` 后重新 `npm run deploy`。

## 无法登录 `/admin`

- 本地确认 `.dev.vars` 的 `ADMIN_PASSWORD`；生产确认已执行 `wrangler secret put ADMIN_PASSWORD`
- 强制刷新，并清理该 Worker 域名下的 Cookie
- 确认访问的是 `/admin`

## Cron 从不推送

Cloudflare Cron 以 UTC 执行 `*/5 * * * *`，GlobalPulse 再按任务时区判断是否命中。

检查清单：

1. 任务已启用
2. 星期 / 交易日历允许今天
3. 至少选择了一个推送目标
4. 渠道凭证已配置（Secrets 或管理后台）
5. 该任务的推送预览能正常生成

## 预览为空或显示 fallback

- 在预览下拉框中选择具体时间表
- 部分数据源会间歇失败，预览可能进入回退内容
- 市场模式下确认关注标的与模块已开启

## 飞书 / Telegram / 微信推送失败

- 飞书：Webhook 与签名密钥需与机器人配置一致
- Telegram：Bot Token 与 Chat ID 有效，且机器人能发消息到该会话
- 微信公众号：OpenID 通常需要用户近期互动过
- 建议先用「推送预览」和手动发送验证，再依赖 Cron

## 本地正常，生产不行

本地用 `.dev.vars`，生产用 Cloudflare Secrets 与绑定。

对照检查：

- `ADMIN_PASSWORD` / `API_TOKEN`
- 渠道 Secrets
- 已部署 Worker 上的 KV / D1 绑定 ID

## 获取帮助

- [快速开始](/zh/quick-start)
- [环境变量](/zh/deploy/env)
- [GitHub Issues](https://github.com/InnoNestX/GlobalPulse/issues)
