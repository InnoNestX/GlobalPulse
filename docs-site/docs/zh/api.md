# API 接口

## 公共接口

### 健康检查

```
GET /health
```

响应：
```json
{ "status": "ok", "timestamp": "2026-01-15T10:30:00Z" }
```

## 管理后台 API

所有管理接口需要通过 `ADMIN_PASSWORD` header 或 cookie 认证。

### 登录

```
POST /api/admin/login
```

请求：
```json
{ "password": "your-admin-password" }
```

响应：
```json
{ "success": true }
```

### 获取设置

```
GET /api/admin/settings
```

响应：
```json
{
  "appName": "GlobalPulse",
  "language": "zh",
  "timezone": "Asia/Hong_Kong",
  "schedules": [...],
  "providerSettings": {...}
}
```

### 保存设置

```
PUT /api/admin/settings
```

请求：完整的设置对象

响应：
```json
{ "success": true }
```

### 获取推送日志

```
GET /api/admin/logs?limit=50
```

响应：
```json
{
  "logs": [
    {
      "id": "log_xxx",
      "timestamp": "2026-01-15T10:30:00Z",
      "scheduleName": "美股早报",
      "provider": "telegram",
      "status": "success",
      "preview": "..."
    }
  ]
}
```

### 预览消息

```
POST /api/admin/preview
```

请求：
```json
{
  "scheduleId": "schedule_xxx",
  "provider": "telegram"
}
```

响应：
```json
{
  "preview": "formatted message content for the provider"
}
```

### 触发测试发送

```
POST /api/admin/run
```

请求：
```json
{ "scheduleId": "schedule_xxx" }
```

响应：
```json
{ "success": true, "message": "Test run triggered" }
```

## 消息 API

需要通过 `Authorization: Bearer <token>` header 传入 `API_TOKEN`。

### 发送消息

```
POST /v1/messages
```

请求：
```json
{
  "content": "Your message content",
  "targets": ["telegram", "feishu"],
  "format": "markdown"
}
```

响应：
```json
{
  "success": true,
  "delivered": ["telegram"],
  "failed": []
}
```

## 事件 API

### GitHub Actions

```
POST /v1/events/github-actions
```

GitHub Actions 集成 Webhook。

### Cloudflare

```
POST /v1/events/cloudflare
```

Cloudflare 系统事件 Webhook。

## 渠道状态

```
GET /v1/providers
```

响应：
```json
{
  "feishu": { "configured": true },
  "telegram": { "configured": true },
  "email": { "configured": false }
}
```