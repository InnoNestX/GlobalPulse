# 管理后台

访问 `/admin` 进入完整配置界面。

## 登录

访问 `/admin`，输入你的 `ADMIN_PASSWORD`。

## 全局设置

| 设置 | 描述 |
|------|------|
| **应用名称** | 简报显示名称 |
| **语言** | 中文 (zh) 或英文 (en) |
| **时区** | IANA 时区（如 Asia/Hong_Kong） |
| **输出格式** | markdown、text 或 json |
| **主题焦点** | 摘要模式的默认主题 |

## 任务管理

最多创建20个独立任务，每个任务包含：

- **名称和启用** - 任务标识
- **触发模式** - 时间槽或 cron 表达式
- **时间和日期** - 在选定时区内的发送时间
- **语言和格式** - 输出语言和格式
- **报告类型** - a_share、us_stock、crypto、daily_hot、custom
- **报告模式** - market (AI) 或 digest (RSS)
- **市场时段** - pre_open、intraday、post_close
- **关注标的** - 最多80个标的可追踪
- **模块开关** - 启用/禁用报告模块

### 批量任务构建器

按报告类型快速创建多个任务：

```
[A股日报] → 创建盘前、盘中、盘后A股任务
[美股日报] → 创建盘前、盘中、盘后美股任务
[加密日报] → 创建基于Binance的加密简报
```

## 渠道配置

### 飞书

```yaml
Webhook URL: https://open.feishu.cn/open-apis/bot/v2/hook/xxx
签名密钥: (可选，用于HMAC验证)
```

### 微信公众号

```yaml
App ID: wx_xxxxxxxxxxxxxxx
App Secret: xxxxxxxxxxxxxxx
OpenID: xxxxxxxxxxxx (接收者)
```

### 微信 Clawbot

```yaml
Webhook URL: https://your-clawbot-server/webhook
或
Webhook Key: xxxxxxxxx
```

### Telegram

```yaml
Bot Token: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
Chat ID: 123456789
```

### Email

```yaml
Provider: Brevo (或 Resend)
API Key: xkeysib-xxxxxxxxxxxx
发件人: pulse@yourdomain.com
```

通过地址簿管理收件人，可添加备注和标签。

## 实时预览

点击任意任务的"预览"可以看到每个渠道将收到的消息格式。

## 测试发送

使用"测试发送"立即触发任务执行，无需等待 cron 调度。

## 推送日志

查看最近的推送记录：
- 时间戳
- 任务名称
- 渠道
- 状态（成功/失败）
- 内容预览