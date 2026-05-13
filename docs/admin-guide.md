# Admin Guide

Open `/admin` and log in with `ADMIN_PASSWORD`.

## Global Settings

- App name: Display name for the Admin UI and generated settings.
- Content language: Chinese or English.
- Timezone: Used as the default timezone for new schedules.
- Default format: `markdown`, `text`, or `json`. Markdown is the default.
- Topic focus: Default topic query for new schedules.
- Default targets: One or more push providers.
- Provider parameters: optional KV-stored webhook/token fields for Feishu, 微信公众号, wechat clawbot, and Telegram. Cloudflare secrets still work and take precedence when set.
- Global template: Default message body template.

## Schedule Settings

Each schedule controls one push time point.

- Enabled: Whether the schedule should run.
- Time: Local time in the schedule's selected timezone.
- Days: Weekdays when the schedule should run.
- Timezone: Local timezone for the schedule.
- Language: Language used for labels and source query defaults.
- Format: Message format for that schedule.
- Market calendar: `everyday`, `a_share`, `us_stock`, or `crypto`.
- Trading-day check: `weekday` uses local weekday plus manual closed dates. `external` uses a third-party holiday lookup for A-share or US stock schedules, then falls back to local rules if the lookup fails.
- Extra closed dates: optional exchange holidays or one-off skips in `YYYY-MM-DD` format. A-share and US stock calendars skip weekends automatically; crypto runs every day unless an extra closed date is entered.
- Topic query: Search query used when no RSS source URL is set.
- RSS source URL: Optional custom RSS feed.
- Targets: Push providers for this schedule.
- Schedule template: Message body template.
- Push preview: renders a sample message for the selected schedule and shows what each selected provider will receive.
- Test send: saves the current settings, collects fresh topic data, and pushes the selected schedule immediately.

## Provider Names

Use these target names in API requests and schedules:

```text
feishu
wechat_official_account
wechat_clawbot
telegram
```

`wechat_ai_agent` is still accepted as a legacy alias for `wechat_clawbot`, but new configs should use `wechat_clawbot`.

## Feedback Links

The Admin UI links to the InnoNestX GitHub issue chooser. The repository includes templates for bug reports and feature requests.

## Template Variables

Templates can use these variables:

```text
{{generatedAt}}
{{timezone}}
{{topicQuery}}
{{sourceUrl}}
{{itemsMarkdown}}
{{itemsText}}
{{itemsJson}}
```

Default Markdown template:

```markdown
# GlobalPulse 热点简报

- 时间：{{generatedAt}}
- 时区：{{timezone}}
- 主题：{{topicQuery}}

{{itemsMarkdown}}

> 数据来源：{{sourceUrl}}
```

## Language and Timezone

The Admin UI can switch between Chinese and English. The saved content language controls generated briefing labels. The saved timezone controls when schedules fire.

Cloudflare still wakes the Worker on UTC cron; GlobalPulse translates that wake time into the schedule timezone before deciding whether to push.
