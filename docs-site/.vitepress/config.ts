import { defineConfig } from 'vitepress'

const base = '/GlobalPulse/'

export default defineConfig({
  title: 'GlobalPulse',
  description: 'Market Intelligence · Scheduled Finance & Global Hotspot Briefings',
  base,
  srcDir: 'docs',
  outDir: '_site',
  cacheDir: '.vitepress/cache',
  cleanUrls: false,
  ignoreDeadLinks: true,
  head: [
    ['link', { rel: 'icon', href: `${base}globalpulse-project-logo.png`, type: 'image/png' }],
    ['meta', { name: 'theme-color', content: '#061310' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:title', content: 'GlobalPulse Documentation' }],
    ['meta', { name: 'og:description', content: 'Sci-fi documentation for scheduled market intelligence on Cloudflare Workers.' }],
  ],
  themeConfig: {
    logo: {
      src: '/globalpulse-project-logo.png',
      alt: 'GlobalPulse'
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
      message: 'Open Source / MIT License',
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
})
