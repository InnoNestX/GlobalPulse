import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'GlobalPulse',
  description: 'Market Intelligence · Scheduled Finance & Global Hotspot Briefings',
  srcDir: '.',
  lang: 'en-US',
  cleanUrls: true,
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
      { text: 'Docs', link: '/en/' },
      { text: 'API', link: '/en/api' },
      { text: 'GitHub', link: 'https://github.com/nestjs/globalpulse' },
    ],
    sidebar: {
      '/en/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is GlobalPulse', link: '/en/' },
            { text: 'Quick Start', link: '/en/quick-start' },
            { text: 'Features', link: '/en/features' },
          ]
        },
        {
          text: 'Deployment',
          items: [
            { text: 'Cloudflare Setup', link: '/en/deploy/cloudflare' },
            { text: 'Environment Variables', link: '/en/deploy/env' },
          ]
        },
        {
          text: 'Configuration',
          items: [
            { text: 'Admin UI', link: '/en/config/admin' },
            { text: 'Schedules', link: '/en/config/schedules' },
            { text: 'Providers', link: '/en/config/providers' },
            { text: 'Templates', link: '/en/config/templates' },
          ]
        },
        {
          text: 'Reference',
          items: [
            { text: 'API Endpoints', link: '/en/api' },
            { text: 'Template Variables', link: '/en/reference/variables' },
          ]
        }
      ],
      '/zh/': [
        {
          text: '简介',
          items: [
            { text: '什么是 GlobalPulse', link: '/zh/' },
            { text: '快速开始', link: '/zh/quick-start' },
            { text: '功能特性', link: '/zh/features' },
          ]
        },
        {
          text: '部署',
          items: [
            { text: 'Cloudflare 部署', link: '/zh/deploy/cloudflare' },
            { text: '环境变量', link: '/zh/deploy/env' },
          ]
        },
        {
          text: '配置',
          items: [
            { text: '管理后台', link: '/zh/config/admin' },
            { text: '定时任务', link: '/zh/config/schedules' },
            { text: '推送渠道', link: '/zh/config/providers' },
            { text: '消息模板', link: '/zh/config/templates' },
          ]
        },
        {
          text: '参考',
          items: [
            { text: 'API 接口', link: '/zh/api' },
            { text: '模板变量', link: '/zh/reference/variables' },
          ]
        }
      ]
    },
    footer: {
      message: 'Open Source · MIT License',
      copyright: 'Copyright © 2024 GlobalPulse'
    },
    editLink: {
      pattern: 'https://github.com/nestjs/globalpulse/edit/main/docs-site/:path',
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
      link: '/en/',
    },
    zh: {
      label: '中文',
      lang: 'zh-CN',
      link: '/zh/',
    }
  },
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    lineNumbers: true
  },
  