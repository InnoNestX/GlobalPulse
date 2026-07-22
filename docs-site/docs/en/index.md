---
layout: home
title: GlobalPulse
description: Self-hosted scheduled market briefings on Cloudflare Workers. Push finance and hotspot digests to Feishu, WeChat, Telegram, and Email.
head:
  - - meta
    - name: keywords
      content: GlobalPulse, Cloudflare Workers, market briefing, scheduled report, Feishu, WeChat, Telegram, A-share, US stock, crypto
---

<div class="gp-shell">
  <header class="gp-grid gp-nav">
    <a class="gp-cell gp-logo" href="/GlobalPulse/en/">
      <span class="gp-mark"><img src="/globalpulse-project-logo.png" alt="GlobalPulse" /></span>
      <span>
        <span class="gp-brand">GlobalPulse</span>
        <span class="gp-subbrand">Scheduled market briefings</span>
      </span>
    </a>
    <a class="gp-cell" href="/GlobalPulse/en/quick-start.html">Docs</a>
    <a class="gp-cell" href="/GlobalPulse/en/api.html">API</a>
    <a class="gp-cell" href="/GlobalPulse/zh/">中文</a>
    <div class="gp-cell gp-nav-meta"><span>License</span><span>MIT</span></div>
  </header>

  <section class="gp-grid gp-hero" aria-label="GlobalPulse overview">
    <div class="gp-cell gp-span-7 gp-hero-copy">
      <p class="gp-kicker">Open source · Cloudflare Workers</p>
      <h1 class="gp-headline">GlobalPulse</h1>
      <p class="gp-lede">Market intelligence that arrives on schedule.</p>
      <p class="gp-copy">Self-host finance and global hotspot briefings on the edge. Collect market data, news, and custom feeds, then push concise reports to Feishu, WeChat, Telegram, and Email.</p>
      <div class="gp-actions">
        <a class="gp-action gp-action-primary" href="/GlobalPulse/en/quick-start.html">Quick start</a>
        <a class="gp-action" href="/GlobalPulse/en/config/admin.html">Admin UI</a>
        <a class="gp-action" href="https://github.com/InnoNestX/GlobalPulse">GitHub</a>
      </div>
    </div>
    <div class="gp-cell gp-span-5 gp-command-stack">
      <div class="gp-command">
        <div class="gp-command-head"><span>1. Clone</span></div>
        <code class="gp-code">git clone https://github.com/InnoNestX/GlobalPulse.git</code>
      </div>
      <div class="gp-command">
        <div class="gp-command-head"><span>2. Configure</span></div>
        <code class="gp-code">cp wrangler.example.jsonc wrangler.jsonc</code>
      </div>
      <div class="gp-command">
        <div class="gp-command-head"><span>3. Deploy</span></div>
        <code class="gp-code">npm run deploy</code>
      </div>
    </div>
  </section>

  <section class="gp-grid" aria-label="Features">
    <div class="gp-cell gp-span-12">
      <h2 class="gp-section-title">What you get</h2>
    </div>
    <div class="gp-cell gp-span-12">
      <div class="gp-feature-grid">
        <a class="gp-link-cell" href="/GlobalPulse/en/config/schedules.html"><strong>Scheduled briefings</strong><span>Cron jobs on Cloudflare Workers with per-task timezones and trading calendars.</span><em>Open</em></a>
        <a class="gp-link-cell" href="/GlobalPulse/en/features.html"><strong>Market research</strong><span>US stocks, A-shares, crypto, and hotspot feeds in one report pipeline.</span><em>Open</em></a>
        <a class="gp-link-cell" href="/GlobalPulse/en/config/providers.html"><strong>Push providers</strong><span>Feishu, WeChat, Telegram, and Email from one Admin UI.</span><em>Open</em></a>
        <a class="gp-link-cell" href="/GlobalPulse/en/reference/variables.html"><strong>Templates</strong><span>Reusable Markdown, text, JSON, and chat message variables.</span><em>Open</em></a>
        <a class="gp-link-cell" href="/GlobalPulse/en/config/admin.html"><strong>Admin UI</strong><span>Password-protected schedules, channels, previews, and delivery logs.</span><em>Open</em></a>
        <a class="gp-link-cell" href="/GlobalPulse/en/api.html"><strong>HTTP API</strong><span>Preview, send, health, and admin endpoints for automation.</span><em>Open</em></a>
      </div>
    </div>
  </section>

  <section class="gp-grid" aria-label="Documentation paths">
    <div class="gp-cell gp-span-12">
      <h2 class="gp-section-title">Get started</h2>
    </div>
    <div class="gp-cell gp-span-12">
      <div class="gp-doc-grid">
        <a class="gp-link-cell" href="/GlobalPulse/en/quick-start.html"><strong>Quick start</strong><span>Install, configure Cloudflare, and run the Worker locally.</span><em>Read</em></a>
        <a class="gp-link-cell" href="/GlobalPulse/en/deploy/cloudflare.html"><strong>Cloudflare deploy</strong><span>Bind KV, D1, cron triggers, Workers AI, and secrets.</span><em>Read</em></a>
        <a class="gp-link-cell" href="/GlobalPulse/en/deploy/env.html"><strong>Environment</strong><span>Admin password, API token, and provider credentials.</span><em>Read</em></a>
      </div>
    </div>
  </section>

  <footer class="gp-grid">
    <div class="gp-cell gp-span-12 gp-footer">
      <span>GlobalPulse · Documentation</span>
      <span>MIT License · 2026 InnoNestX</span>
    </div>
  </footer>
</div>
