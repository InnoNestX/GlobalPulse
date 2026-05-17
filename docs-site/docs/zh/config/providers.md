# 推送渠道

GlobalPulse 同时向多个渠道推送消息。

## 渠道状态

检查渠道配置状态 `GET /v1/providers`：

```json
{
  "feishu": { "configured": true },
  "wechat_official_account": { "configured": false },
  "wechat_clawbot": { "configured": true },
  "telegram": { "configured": true },
  "email": { "configured": true }
}
```

## 飞书

### 配置

1. 在飞书开放平台创建机器人
2. 获取 Webhook URL: `https://open.feishu.cn/open-apis/bot/v2/hook/xxx`
3. （可选）启用签名验证

```yaml
Webhook URL: https://open.feishu.cn/open-apis/bot/v2/hook/your-hook-id
签名密钥: your-hmac-secret (可选)
```

### 消息格式

- 飞书专用的 Markdown 扩展
- 支持通过 `at` 标签 @提及
- 支持按钮等交互卡片

## 微信公众号

### 配置

需要微信公众号凭证：

```yaml
App ID: wx_xxxxxxxxxxxxxxx
App Secret: xxxxxxxxxxxxxxx
OpenID: xxxxxxxxxxxx (接收者)
```

### 限制

- 微信有严格的内容策略
- HTML 仅限基本格式
- 媒体需要特殊处理

## 微信 Clawbot

### 配置

通过 clawbot 服务器的替代微信推送：

```yaml
Webhook URL: https://your-clawbot-server.com/webhook
或
Webhook Key: your-webhook-key
```

### 优势

- 更灵活的内容
- 绕过部分微信限制
- 更适合自动化推送

## Telegram

### 配置

1. 通过 [@BotFather](https://t.me/BotFather) 创建机器人
2. 获取 bot token: `123456:ABC-DEF1234`
3. 与你的 bot 开始对话
4. 获取 chat ID（使用 @userinfobot）

```yaml
Bot Token: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
Chat ID: 123456789
```

### 特性

- HTML 格式化（粗体、斜体、代码、链接）
- 内联键盘交互
- 支持群组和频道

### HTML 支持

```html
<b>粗体</b>
<i>斜体</i>
<code>代码</code>
<a href="url">链接</a>
<pre>预格式</pre>
```

## Email

### 提供商

| 提供商 | API |
|--------|-----|
| Brevo | SMTP 或 API（推荐） |
| Resend | API |

### 配置

```yaml
Provider: Brevo
API Key: xkeysib-xxxxxxxxxxxx
发件人: GlobalPulse <pulse@yourdomain.com>
```

### 邮件收件人

通过管理后台地址簿管理：

```typescript
interface EmailRecipient {
  id: string;
  address: string;
  note: string;       // 例如 "CEO"、"交易部门"
  enabled: boolean;
}
```

### 模板

HTML 邮件模板，包含：
- Logo 头部
- 样式化内容
- 带取消订阅链接的底部

## 多渠道推送

配置多个渠道时：

1. 生成一次报告
2. 转换为各渠道格式
3. 并行发送
4. 记录各自结果

```typescript
const results = await Promise.allSettled(
  targets.map(provider => sendToProvider(provider, message))
);
```