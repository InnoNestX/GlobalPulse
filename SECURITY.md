# Security Policy

## Supported Versions

GlobalPulse is deployed as a Cloudflare Workers serverless application. Security updates are deployed continuously — all non-vulnerable versions receive protection.

| Version / Deployment | Supported | Notes |
| --------------------- | --------- | ----- |
| Cloudflare Workers (latest) | Yes | Deployed from `main` branch |
| Archived releases | No | Please use the latest deployment |

> **Note:** Because GlobalPulse runs on Cloudflare Workers, there are no self-hosted versions to patch. Security fixes are pushed directly to the live edge workers on every new deployment.

---

## Responsible Disclosure

If you discover a security vulnerability, please follow the process below.

### How to Report

**Do not report vulnerabilities through public GitHub Issues.**

Use one of the following methods:

| Method | Contact |
| ------ | ------- |
| **GitHub Security Advisories** | [Report a vulnerability privately](https://github.com/InnoNestX/GlobalPulse/security/advisories/new) |
| **Email** | Contact maintainers via GitHub private vulnerability reporting |

When reporting, include as much of the following as possible:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Suggested fix (if any)

### What to Expect

| Stage | Timeframe |
| ----- | --------- |
| **Initial response** | Within 48 hours (acknowledgement of receipt) |
| **Severity assessment** | Within 7 days |
| **Fix timeline** | Depends on severity — critical issues are addressed as soon as possible |
| **Public disclosure** | Coordinated with reporter after fix is deployed |

### Severity Classification

| Level | Definition | Response Time |
| ----- | ---------- | ------------- |
| **Critical** | Remote code execution, data breach, authentication bypass | 72 hours |
| **High** | Privilege escalation, injection attacks, denial of service | 7 days |
| **Medium** | Information disclosure, CSRF, XSS in user content | Next release |
| **Low** | Minor issues, cosmetic problems | Best effort |

---

## Security Model

GlobalPulse processes sensitive data through third-party integrations. Key security properties:

- **No persistent application storage by default** — configuration lives in Cloudflare KV; research history may use D1 when enabled
- **Credentials** — API tokens and webhook secrets are stored in Cloudflare KV and/or Cloudflare Secrets
- **Outbound only** — GlobalPulse initiates provider requests; webhook secrets must not be logged
- **Authentication** — Admin panel requires `ADMIN_PASSWORD`
- **CORS** — Configurable via `CORS_ORIGIN`; defaults to `*` if unset

### Environment Variables

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `ADMIN_PASSWORD` | Yes | Password for the admin panel |
| `API_TOKEN` | Yes | Token for API authentication |
| `CORS_ORIGIN` | Optional | Allowed CORS origin (defaults to `*`) |
| `FEISHU_WEBHOOK_URL` | For Feishu | Feishu webhook URL |
| `FEISHU_SIGNING_SECRET` | For Feishu | Feishu signing secret |
| `WEIXIN_*` | For WeChat | WeChat official account credentials |
| `TELEGRAM_BOT_TOKEN` | For Telegram | Telegram bot token |
| `KV_NAMESPACE_ID` | Yes | Cloudflare KV namespace for configuration storage |

---

## Scope

**In scope:**

- Cloudflare Worker execution environment
- Admin panel authentication and session management
- API endpoint access control
- Third-party provider integrations (Feishu, WeChat, Telegram)
- Configuration storage in Cloudflare KV
- Template rendering that may expose sensitive data

**Out of scope:**

- Social engineering attacks against maintainers
- Denial of service attacks that rely on external infrastructure
- Issues in third-party services not under our control (Cloudflare, GitHub)
- Attacks requiring pre-existing access to the Cloudflare account
