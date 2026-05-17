import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'GlobalPulse',
  description: 'Market Intelligence · Scheduled Finance & Global Hotspot Briefings',
  base: '/GlobalPulse/',
  cleanUrls: false,
  ignoreDeadLinks: true,
  head: [
    ['link', { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'theme-color', content: '#00d4ff' }],
    ['meta', { name: 'og:type', content: 'website' }],
  ],
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'GlobalPulse',
    nav: [
      { text: 'Docs', link: '/GlobalPulse/en/' },
      { text: 'API', link: '/GlobalPulse/en/api' },
      { text: 'GitHub', link: 'https://github.com/InnoNestX/GlobalPulse' },
    ],
    sidebar: {
      '/GlobalPulse/en/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is GlobalPulse', link: '/GlobalPulse/en/' },
            { text: 'Quick Start', link: '/GlobalPulse/en/quick-start' },
            { text: 'Features', link: '/GlobalPulse/en/features' },
          ]
        },
        {
          text: 'Deployment',
          items: [
            { text: 'Cloudflare Setup', link: '/GlobalPulse/en/deploy/cloudflare' },
            { text: 'Environment Variables', link: '/GlobalPulse/en/deploy/env' },
          ]
        },
        {
          text: 'Configuration',
          items: [
            { text: 'Admin UI', link: '/GlobalPulse/en/config/admin' },
            { text: 'Schedules', link: '/GlobalPulse/en/config/schedules' },
            { text: 'Providers', link: '/GlobalPulse/en/config/providers' },
            { text: 'Templates', link: '/GlobalPulse/en/config/templates' },
          ]
        },
        {
          text: 'Reference',
          items: [
            { text: 'API Endpoints', link: '/GlobalPulse/en/api' },
            { text: 'Template Variables', link: '/GlobalPulse/en/reference/variables' },
          ]
        }
      ],
      '/GlobalPulse/zh/': [
        {
          text: '简介',
          items: [
            { text: '什么是 GlobalPulse', link: '/GlobalPulse/zh/' },
            { text: '快速开始', link: '/GlobalPulse/zh/quick-start' },
            { text: '功能特性', link: '/GlobalPulse/zh/features' },
          ]
        },
        {
          text: '部署',
          items: [
            { text: 'Cloudflare 部署', link: '/GlobalPulse/zh/deploy/cloudflare' },
            { text: '环境变量', link: '/GlobalPulse/zh/deploy/env' },
          ]
        },
        {
          text: '配置',
          items: [
            { text: '管理后台', link: '/GlobalPulse/zh/config/admin' },
            { text: '定时任务', link: '/GlobalPulse/zh/config/schedules' },
            { text: '推送渠道', link: '/GlobalPulse/zh/config/providers' },
            { text: '消息模板', link: '/GlobalPulse/zh/config/templates' },
          ]
        },
        {
          text: '参考',
          items: [
            { text: 'API 接口', link: '/GlobalPulse/zh/api' },
            { text: '模板变量', link: '/GlobalPulse/zh/reference/variables' },
          ]
        }
      ]
    },
    footer: {
      message: 'Open Source · MIT License',
      copyright: '© 2026 InnoNestX · Made with ❤️ for the community'
    },
    editLink: {
      pattern: 'https://github.com/InnoNestX/GlobalPulse/edit/main/docs-site/docs/:path',
      text: 'Edit this page on GitHub'
    },
    search: {
      provider: 'local'
    },
    docFooter: {
      prev: 'Previous',
      next: 'Next'
    }
  },
  locales: {
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/GlobalPulse/en/',
    },
    zh: {
      label: '中文',
      lang: 'zh-CN',
      link: '/GlobalPulse/zh/',
    }
  },
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    lineNumbers: true
  },
})