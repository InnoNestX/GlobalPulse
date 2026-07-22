---
layout: home
title: GlobalPulse
description: 基于 Cloudflare Workers 的自托管定时市场简报。将财经与热点摘要推送到飞书、微信、Telegram 与 Email。
head:
  - - meta
    - name: keywords
      content: GlobalPulse, Cloudflare Workers, 市场简报, 定时推送, 飞书, 微信, Telegram, A股, 美股, 加密货币
---

<div class="gp-shell">
  <header class="gp-grid gp-nav">
    <a class="gp-cell gp-logo" href="/GlobalPulse/zh/">
      <span class="gp-mark"><img src="/globalpulse-project-logo.png" alt="GlobalPulse" /></span>
      <span>
        <span class="gp-brand">GlobalPulse</span>
        <span class="gp-subbrand">定时市场简报</span>
      </span>
    </a>
    <a class="gp-cell" href="/GlobalPulse/zh/quick-start.html">文档</a>
    <a class="gp-cell" href="/GlobalPulse/zh/api.html">API</a>
    <a class="gp-cell" href="/GlobalPulse/en/">English</a>
    <div class="gp-cell gp-nav-meta"><span>许可</span><span>MIT</span></div>
  </header>

  <section class="gp-grid gp-hero" aria-label="GlobalPulse overview">
    <div class="gp-cell gp-span-7 gp-hero-copy">
      <p class="gp-kicker">开源 · Cloudflare Workers</p>
      <h1 class="gp-headline">GlobalPulse</h1>
      <p class="gp-lede">按时送达的市场情报。</p>
      <p class="gp-copy">在边缘自托管财经与全球热点简报。汇聚行情、新闻与自定义订阅源，再把简洁报告推送到飞书、微信、Telegram 与 Email。</p>
      <div class="gp-actions">
        <a class="gp-action gp-action-primary" href="/GlobalPulse/zh/quick-start.html">快速开始</a>
        <a class="gp-action" href="/GlobalPulse/zh/config/admin.html">管理后台</a>
        <a class="gp-action" href="https://github.com/InnoNestX/GlobalPulse">GitHub</a>
      </div>
    </div>
    <div class="gp-cell gp-span-5 gp-command-stack">
      <div class="gp-command">
        <div class="gp-command-head"><span>1. 克隆</span></div>
        <code class="gp-code">git clone https://github.com/InnoNestX/GlobalPulse.git</code>
      </div>
      <div class="gp-command">
        <div class="gp-command-head"><span>2. 配置</span></div>
        <code class="gp-code">cp wrangler.example.jsonc wrangler.jsonc</code>
      </div>
      <div class="gp-command">
        <div class="gp-command-head"><span>3. 部署</span></div>
        <code class="gp-code">npm run deploy</code>
      </div>
    </div>
  </section>

  <section class="gp-grid" aria-label="Features">
    <div class="gp-cell gp-span-12">
      <h2 class="gp-section-title">你能得到什么</h2>
    </div>
    <div class="gp-cell gp-span-12">
      <div class="gp-feature-grid">
        <a class="gp-link-cell" href="/GlobalPulse/zh/config/schedules.html"><strong>定时简报</strong><span>Cloudflare Workers 上的 Cron 任务，支持任务级时区与交易日历。</span><em>打开</em></a>
        <a class="gp-link-cell" href="/GlobalPulse/zh/features.html"><strong>市场研究</strong><span>美股、A股、加密货币与热点信息流汇入同一报告流程。</span><em>打开</em></a>
        <a class="gp-link-cell" href="/GlobalPulse/zh/config/providers.html"><strong>推送渠道</strong><span>飞书、微信、Telegram 与 Email 在同一管理后台配置。</span><em>打开</em></a>
        <a class="gp-link-cell" href="/GlobalPulse/zh/reference/variables.html"><strong>消息模板</strong><span>面向 Markdown、纯文本、JSON 与聊天渠道的复用变量。</span><em>打开</em></a>
        <a class="gp-link-cell" href="/GlobalPulse/zh/config/admin.html"><strong>管理后台</strong><span>密码保护的任务、渠道、预览与推送日志界面。</span><em>打开</em></a>
        <a class="gp-link-cell" href="/GlobalPulse/zh/api.html"><strong>HTTP API</strong><span>预览、发送、健康检查与管理接口，便于自动化。</span><em>打开</em></a>
      </div>
    </div>
  </section>

  <section class="gp-grid" aria-label="Documentation paths">
    <div class="gp-cell gp-span-12">
      <h2 class="gp-section-title">从这里开始</h2>
    </div>
    <div class="gp-cell gp-span-12">
      <div class="gp-doc-grid">
        <a class="gp-link-cell" href="/GlobalPulse/zh/quick-start.html"><strong>快速开始</strong><span>安装依赖、配置 Cloudflare，并在本地运行 Worker。</span><em>阅读</em></a>
        <a class="gp-link-cell" href="/GlobalPulse/zh/deploy/cloudflare.html"><strong>Cloudflare 部署</strong><span>绑定 KV、D1、Cron Triggers、Workers AI 与密钥。</span><em>阅读</em></a>
        <a class="gp-link-cell" href="/GlobalPulse/zh/deploy/env.html"><strong>环境变量</strong><span>管理密码、API Token 与渠道凭证说明。</span><em>阅读</em></a>
      </div>
    </div>
  </section>

  <footer class="gp-grid">
    <div class="gp-cell gp-span-12 gp-footer">
      <span>GlobalPulse · 文档</span>
      <span>MIT License · 2026 InnoNestX</span>
    </div>
  </footer>
</div>
