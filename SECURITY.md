# Security Policy

## 🚨 Supported Versions

GlobalPulse is deployed as a Cloudflare Workers serverless application. Security updates are deployed continuously — all non-vulnerable versions receive protection.

| Version / Deployment | Supported | Notes |
| --------------------- | --------- | ----- |
| Cloudflare Workers (latest) | ✅ | Deployed from `main` branch |
| Archived releases | ❌ | Please use the latest deployment |

> **Note:** Because GlobalPulse runs on Cloudflare Workers, there are no self-hosted versions to patch. Security fixes are pushed directly to the live edge workers on every new deployment.

---

## � responsible Disclosure

We take security seriously. If you discover a security vulnerability, please follow the process below:

### How to Report

**Please DO NOT report vulnerabilities through public GitHub Issues.**

Instead, use one of the following methods:

| Method | Contact |
| ------ | ------- |
| **GitHub Security Advisories** | [Report a vulnerability privately](https://github.com/InnoNestX/GlobalPulse/security/advisories/new) |
| **Email** | Send to the maintainers directly via GitHub's private vulnerability reporting |

When reporting, please include as much of the following as possible:

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

## 🔐 Security Model

GlobalPulse processes sensitive data through third-party integrations. Key security properties:

- **No persistent storage** — Runs as a stateless Cloudflare Worker; all data is transient
- **Credentials** — API tokens and webhook secrets are stored in Cloudflare KV (encrypted at rest) and/or Cloudflare Secrets
- **External requests** — Outbound only; GlobalPulse does not accept unsolicited inbound connections
- **Secrets in URLs** — Webhook URLs containing secrets are never logged
- **Authentication** — Admin panel requires a strong password set via `ADMIN_PASSWORD` environment variable
- **CORS** — Configurable via `CORS_ORIGIN` environment variable; defaults to `*` if unset

### Environment Variables

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `ADMIN_PASSWORD` | ✅ | Password for the admin panel |
| `API_TOKEN` | ✅ | Token for API authentication |
| `CORS_ORIGIN` | Optional | Allowed CORS origin (defaults to `*`) |
| `FEISHU_WEBHOOK_URL` | For Feishu | Feishu webhook URL |
| `FEISHU_SIGNING_SECRET` | For Feishu | Feishu signing secret |
| `WEIXIN_*` | For WeChat | Various WeChat official account credentials |
| `TELEGRAM_BOT_TOKEN` | For Telegram | Telegram bot token |
| `KV_NAMESPACE_ID` | ✅ | Cloudflare KV namespace for configuration storage |

---

## 📋 Scope

The following are **in scope** for security reports:

- Cloudflare Worker execution environment
- Admin panel authentication and session management
- API endpoint access control
- Third-party provider integrations (Feishu, WeChat, Telegram)
- Configuration storage in Cloudflare KV
- Template rendering that may expose sensitive data

The following are **out of scope**:

- Social engineering attacks against maintainers
- Denial of service attacks that rely on external infrastructure (e.g., flooding third-party APIs)
- Issues in third-party services not under our control (Cloudflare, GitHub)
- Attacks requiring pre-existing access to the Cloudflare account
