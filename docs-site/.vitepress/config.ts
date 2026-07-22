import { defineConfig } from 'vitepress'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const base = '/GlobalPulse/'
const siteUrl = 'https://innonestx.github.io/GlobalPulse/'

export default defineConfig({
  title: 'GlobalPulse',
  description:
    'Self-hosted scheduled market briefings on Cloudflare Workers. Push finance and hotspot digests to Feishu, WeChat, Telegram, and Email.',
  base,
  srcDir: 'docs',
  outDir: '_site',
  cacheDir: '.vitepress/cache',
  cleanUrls: false,
  ignoreDeadLinks: true,
  lastUpdated: true,
  sitemap: {
    hostname: siteUrl,
  },
  buildEnd(siteConfig) {
    writeFileSync(
      join(siteConfig.outDir, 'robots.txt'),
      `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}sitemap.xml\n`,
    )
  },
  head: [
    ['link', { rel: 'icon', href: `${base}globalpulse-project-logo.png`, type: 'image/png' }],
    ['meta', { name: 'theme-color', content: '#050b0f' }],
    ['meta', { name: 'author', content: 'InnoNestX' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'GlobalPulse' }],
    ['meta', { property: 'og:title', content: 'GlobalPulse — Scheduled Market Briefings' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'Self-hosted finance and hotspot briefings on Cloudflare Workers. Push to Feishu, WeChat, Telegram, and Email.',
      },
    ],
    ['meta', { property: 'og:url', content: siteUrl }],
    ['meta', { property: 'og:image', content: `${siteUrl}globalpulse-project-logo.png` }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:title', content: 'GlobalPulse — Scheduled Market Briefings' }],
    [
      'meta',
      {
        name: 'twitter:description',
        content:
          'Self-hosted finance and hotspot briefings on Cloudflare Workers. Push to Feishu, WeChat, Telegram, and Email.',
      },
    ],
  ],
  themeConfig: {
    logo: {
      src: '/globalpulse-project-logo.png',
      alt: 'GlobalPulse',
    },
    siteTitle: 'GlobalPulse',
    nav: [
      { text: 'Docs', link: '/en/' },
      { text: 'API', link: '/en/api' },
      { text: 'GitHub', link: 'https://github.com/InnoNestX/GlobalPulse' },
    ],
    sidebar: {
      '/en/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is GlobalPulse', link: '/en/' },
            { text: 'Quick Start', link: '/en/quick-start' },
            { text: 'Features', link: '/en/features' },
          ],
        },
        {
          text: 'Deployment',
          items: [
            { text: 'Cloudflare Setup', link: '/en/deploy/cloudflare' },
            { text: 'Environment Variables', link: '/en/deploy/env' },
          ],
        },
        {
          text: 'Configuration',
          items: [
            { text: 'Admin UI', link: '/en/config/admin' },
            { text: 'Schedules', link: '/en/config/schedules' },
            { text: 'Providers', link: '/en/config/providers' },
            { text: 'Templates', link: '/en/config/templates' },
          ],
        },
        {
          text: 'Reference',
          items: [
            { text: 'API Endpoints', link: '/en/api' },
            { text: 'Template Variables', link: '/en/reference/variables' },
          ],
        },
      ],
      '/zh/': [
        {
          text: '简介',
          items: [
            { text: '什么是 GlobalPulse', link: '/zh/' },
            { text: '快速开始', link: '/zh/quick-start' },
            { text: '功能特性', link: '/zh/features' },
          ],
        },
        {
          text: '部署',
          items: [
            { text: 'Cloudflare 部署', link: '/zh/deploy/cloudflare' },
            { text: '环境变量', link: '/zh/deploy/env' },
          ],
        },
        {
          text: '配置',
          items: [
            { text: '管理后台', link: '/zh/config/admin' },
            { text: '定时任务', link: '/zh/config/schedules' },
            { text: '推送渠道', link: '/zh/config/providers' },
            { text: '消息模板', link: '/zh/config/templates' },
          ],
        },
        {
          text: '参考',
          items: [
            { text: 'API 接口', link: '/zh/api' },
            { text: '模板变量', link: '/zh/reference/variables' },
          ],
        },
      ],
    },
    footer: {
      message: 'Open Source · MIT License',
      copyright: '© 2026 InnoNestX',
    },
    editLink: {
      pattern: 'https://github.com/InnoNestX/GlobalPulse/edit/main/docs-site/docs/:path',
      text: 'Edit this page on GitHub',
    },
    search: {
      provider: 'local',
    },
    docFooter: {
      prev: 'Previous',
      next: 'Next',
    },
  },
  locales: {
    root: {
      label: 'Language',
      lang: 'en-US',
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: 'GlobalPulse',
      description:
        'Self-hosted scheduled market briefings on Cloudflare Workers. Push finance and hotspot digests to Feishu, WeChat, Telegram, and Email.',
    },
    zh: {
      label: '中文',
      lang: 'zh-CN',
      link: '/zh/',
      title: 'GlobalPulse',
      description:
        '基于 Cloudflare Workers 的自托管定时市场简报。将财经与热点摘要推送到飞书、微信、Telegram 与 Email。',
      themeConfig: {
        nav: [
          { text: '文档', link: '/zh/' },
          { text: 'API', link: '/zh/api' },
          { text: 'GitHub', link: 'https://github.com/InnoNestX/GlobalPulse' },
        ],
        editLink: {
          pattern: 'https://github.com/InnoNestX/GlobalPulse/edit/main/docs-site/docs/:path',
          text: '在 GitHub 上编辑此页',
        },
        docFooter: {
          prev: '上一页',
          next: '下一页',
        },
        footer: {
          message: '开源 · MIT License',
          copyright: '© 2026 InnoNestX',
        },
      },
    },
  },
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    lineNumbers: true,
  },
})
