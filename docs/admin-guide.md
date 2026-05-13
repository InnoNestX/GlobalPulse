# Admin Guide

Open `/admin` and log in with `ADMIN_PASSWORD`.

## Global Settings

- App name: Display name for the Admin UI and generated settings.
- Content language: Chinese or English.
- Timezone: Used as the default timezone for new schedules.
- Default format: `markdown`, `text`, or `json`. Markdown is the default.
- Topic focus: Default topic query for new schedules.
- Default targets: One or more push providers.
- Global template: Default message body template.

## Schedule Settings

Each schedule controls one push time point.

- Enabled: Whether the schedule should run.
- Time: Local time in the schedule's selected timezone.
- Days: Weekdays when the schedule should run.
- Timezone: Local timezone for the schedule.
- Language: Language used for labels and source query defaults.
- Format: Message format for that schedule.
- Topic query: Search query used when no RSS source URL is set.
- RSS source URL: Optional custom RSS feed.
- Targets: Push providers for this schedule.
- Schedule template: Message body template.

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
