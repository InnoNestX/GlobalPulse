<script setup lang="ts">
import { withBase } from 'vitepress'
import HomeTerminal from './HomeTerminal.vue'

const props = withDefaults(
  defineProps<{
    lang?: 'en' | 'zh'
  }>(),
  { lang: 'en' },
)

const isZh = props.lang === 'zh'
const logoSrc = withBase('/globalpulse-project-logo.png')

const copy = isZh
  ? {
      home: '/GlobalPulse/zh/',
      subbrand: '边缘简报中继',
      docs: '文档',
      docsHref: '/GlobalPulse/zh/quick-start.html',
      apiHref: '/GlobalPulse/zh/api.html',
      altLang: 'English',
      altHref: '/GlobalPulse/en/',
      status: '状态',
      kicker: 'Cloudflare Workers · MIT',
      lede: '按 Cron 准时发出的市场简报。',
      body: '克隆、配置、部署。Worker 拉取行情与新闻，再推送到飞书、微信、Telegram 与 Email。',
      ctaStart: '快速开始',
      ctaAdmin: '管理后台',
      modules: '模块',
      next: '下一步',
      features: [
        ['定时简报', 'Workers Cron，支持任务级时区与交易日历。', '/GlobalPulse/zh/config/schedules.html', '打开'],
        ['市场研究', '美股、A股、加密与热点信息流汇入同一管线。', '/GlobalPulse/zh/features.html', '打开'],
        ['推送渠道', '飞书、微信、Telegram、Email 统一配置。', '/GlobalPulse/zh/config/providers.html', '打开'],
        ['消息模板', 'Markdown / 文本 / JSON / 聊天变量复用。', '/GlobalPulse/zh/reference/variables.html', '打开'],
        ['管理后台', '任务、渠道、实时预览、推送日志。', '/GlobalPulse/zh/config/admin.html', '打开'],
        ['HTTP API', '预览、发送、健康检查与管理接口。', '/GlobalPulse/zh/api.html', '打开'],
      ],
      docsCards: [
        ['快速开始', '安装依赖、配置 Cloudflare、本地运行。', '/GlobalPulse/zh/quick-start.html', '阅读'],
        ['Cloudflare 部署', 'KV、D1、Cron、Workers AI、密钥。', '/GlobalPulse/zh/deploy/cloudflare.html', '阅读'],
        ['环境变量', '管理密码、API Token、渠道凭证。', '/GlobalPulse/zh/deploy/env.html', '阅读'],
      ],
    }
  : {
      home: '/GlobalPulse/en/',
      subbrand: 'Edge briefing relay',
      docs: 'Docs',
      docsHref: '/GlobalPulse/en/quick-start.html',
      apiHref: '/GlobalPulse/en/api.html',
      altLang: '中文',
      altHref: '/GlobalPulse/zh/',
      status: 'Status',
      kicker: 'Cloudflare Workers · MIT',
      lede: 'Market briefings that ship on cron.',
      body: 'Clone, configure, deploy. Watch the Worker pull market data and push reports to Feishu, WeChat, Telegram, and Email.',
      ctaStart: 'Quick start',
      ctaAdmin: 'Admin UI',
      modules: 'Modules',
      next: 'Next commands',
      features: [
        ['Scheduled briefings', 'Cron on Workers with per-task timezones and trading calendars.', '/GlobalPulse/en/config/schedules.html', 'Open'],
        ['Market research', 'US stocks, A-shares, crypto, and hotspot feeds in one pipeline.', '/GlobalPulse/en/features.html', 'Open'],
        ['Push providers', 'Feishu, WeChat, Telegram, and Email from one Admin UI.', '/GlobalPulse/en/config/providers.html', 'Open'],
        ['Templates', 'Reusable Markdown, text, JSON, and chat variables.', '/GlobalPulse/en/reference/variables.html', 'Open'],
        ['Admin UI', 'Schedules, channels, live preview, delivery logs.', '/GlobalPulse/en/config/admin.html', 'Open'],
        ['HTTP API', 'Preview, send, health, and admin endpoints.', '/GlobalPulse/en/api.html', 'Open'],
      ],
      docsCards: [
        ['Quick start', 'Install, configure Cloudflare, run the Worker locally.', '/GlobalPulse/en/quick-start.html', 'Read'],
        ['Cloudflare deploy', 'KV, D1, cron triggers, Workers AI, secrets.', '/GlobalPulse/en/deploy/cloudflare.html', 'Read'],
        ['Environment', 'Admin password, API token, provider credentials.', '/GlobalPulse/en/deploy/env.html', 'Read'],
      ],
    }
</script>

<template>
  <div class="gp-shell">
    <header class="gp-grid gp-nav">
      <a class="gp-cell gp-logo" :href="copy.home">
        <span class="gp-mark"><img :src="logoSrc" alt="GlobalPulse" /></span>
        <span>
          <span class="gp-brand">GlobalPulse</span>
          <span class="gp-subbrand">{{ copy.subbrand }}</span>
        </span>
      </a>
      <a class="gp-cell" :href="copy.docsHref">{{ copy.docs }}</a>
      <a class="gp-cell" :href="copy.apiHref">API</a>
      <a class="gp-cell" :href="copy.altHref">{{ copy.altLang }}</a>
      <div class="gp-cell gp-nav-meta">
        <span>{{ copy.status }}</span>
        <span class="gp-status-dot" aria-hidden="true" />
      </div>
    </header>

    <section class="gp-grid gp-hero" aria-label="GlobalPulse overview">
      <div class="gp-cell gp-span-5 gp-hero-copy">
        <p class="gp-kicker">{{ copy.kicker }}</p>
        <h1 class="gp-headline">GlobalPulse</h1>
        <p class="gp-lede">{{ copy.lede }}</p>
        <p class="gp-copy">{{ copy.body }}</p>
        <div class="gp-actions">
          <a class="gp-action gp-action-primary" :href="copy.docsHref">{{ copy.ctaStart }}</a>
          <a class="gp-action" :href="isZh ? '/GlobalPulse/zh/config/admin.html' : '/GlobalPulse/en/config/admin.html'">{{ copy.ctaAdmin }}</a>
          <a class="gp-action" href="https://github.com/InnoNestX/GlobalPulse">GitHub</a>
        </div>
      </div>
      <HomeTerminal :lang="lang" />
    </section>

    <section class="gp-grid" aria-label="Features">
      <div class="gp-cell gp-span-12">
        <h2 class="gp-section-title">{{ copy.modules }}</h2>
      </div>
      <div class="gp-cell gp-span-12">
        <div class="gp-feature-grid">
          <a v-for="item in copy.features" :key="item[0]" class="gp-link-cell" :href="item[2]">
            <strong>{{ item[0] }}</strong>
            <span>{{ item[1] }}</span>
            <em>{{ item[3] }}</em>
          </a>
        </div>
      </div>
    </section>

    <section class="gp-grid" aria-label="Documentation paths">
      <div class="gp-cell gp-span-12">
        <h2 class="gp-section-title">{{ copy.next }}</h2>
      </div>
      <div class="gp-cell gp-span-12">
        <div class="gp-doc-grid">
          <a v-for="item in copy.docsCards" :key="item[0]" class="gp-link-cell" :href="item[2]">
            <strong>{{ item[0] }}</strong>
            <span>{{ item[1] }}</span>
            <em>{{ item[3] }}</em>
          </a>
        </div>
      </div>
    </section>
  </div>
</template>
