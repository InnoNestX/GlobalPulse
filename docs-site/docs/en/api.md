# API Endpoints

## Public Endpoints

### Health Check

```
GET /health
```

Response:
```json
{ "status": "ok", "timestamp": "2026-01-15T10:30:00Z" }
```

## Admin API

All admin endpoints require authentication via `ADMIN_PASSWORD` header or cookie.

### Login

```
POST /api/admin/login
```

Request:
```json
{ "password": "your-admin-password" }
```

Response:
```json
{ "success": true }
```

### Get Settings

```
GET /api/admin/settings
```

Response:
```json
{
  "appName": "GlobalPulse",
  "language": "zh",
  "timezone": "Asia/Hong_Kong",
  "schedules": [...],
  "providerSettings": {...}
}
```

### Save Settings

```
PUT /api/admin/settings
```

Request: Full settings object

Response:
```json
{ "success": true }
```

### Get Delivery Logs

```
GET /api/admin/logs?limit=50
```

Response:
```json
{
  "logs": [
    {
      "id": "log_xxx",
      "timestamp": "2026-01-15T10:30:00Z",
      "scheduleName": "US Morning",
      "provider": "telegram",
      "status": "success",
      "preview": "..."
    }
  ]
}
```

### Preview Message

```
POST /api/admin/preview
```

Request:
```json
{
  "scheduleId": "schedule_xxx",
  "provider": "telegram"
}
```

Response:
```json
{
  "preview": "formatted message content for the provider"
}
```

### Trigger Test Send

```
POST /api/admin/run
```

Request:
```json
{ "scheduleId": "schedule_xxx" }
```

Response:
```json
{ "success": true, "message": "Test run triggered" }
```

## Message API

Requires `API_TOKEN` via `Authorization: Bearer <token>` header.

### Send Message

```
POST /v1/messages
```

Request:
```json
{
  "content": "Your message content",
  "targets": ["telegram", "feishu"],
  "format": "markdown"
}
```

Response:
```json
{
  "success": true,
  "delivered": ["telegram"],
  "failed": []
}
```

## Events API

### GitHub Actions

```
POST /v1/events/github-actions
```

Webhook for GitHub Actions integration.

### Cloudflare

```
POST /v1/events/cloudflare
```

Webhook for Cloudflare system events.

## Provider Status

```
GET /v1/providers
```

Response:
```json
{
  "feishu": { "configured": true },
  "telegram": { "configured": true },
  "email": { "configured": false }
}
```