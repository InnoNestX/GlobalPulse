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
<span class="gp-subbrand">Edge briefing relay</span>
</span>
</a>
<a class="gp-cell" href="/GlobalPulse/en/quick-start.html">Docs</a>
<a class="gp-cell" href="/GlobalPulse/en/api.html">API</a>
<a class="gp-cell" href="/GlobalPulse/zh/">中文</a>
<div class="gp-cell gp-nav-meta"><span>Status</span><span class="gp-status-dot" aria-hidden="true"></span></div>
</header>

<section class="gp-grid gp-hero" aria-label="GlobalPulse overview">
<div class="gp-cell gp-span-5 gp-hero-copy">
<p class="gp-kicker">Cloudflare Workers · MIT</p>
<h1 class="gp-headline">GlobalPulse</h1>
<p class="gp-lede">Market briefings that ship on cron.</p>
<p class="gp-copy">Clone, configure, deploy. Watch the Worker pull market data and push reports to Feishu, WeChat, Telegram, and Email.</p>
<div class="gp-actions">
<a class="gp-action gp-action-primary" href="/GlobalPulse/en/quick-start.html">Quick start</a>
<a class="gp-action" href="/GlobalPulse/en/config/admin.html">Admin UI</a>
<a class="gp-action" href="https://github.com/InnoNestX/GlobalPulse">GitHub</a>
</div>
</div>
<div class="gp-cell gp-span-7 gp-terminal-wrap">
<div class="gp-term" data-gp-terminal data-lines='["# boot GlobalPulse on Cloudflare Workers","git clone https://github.com/InnoNestX/GlobalPulse.git","cd GlobalPulse","cp .dev.vars.example .dev.vars","cp wrangler.example.jsonc wrangler.jsonc","npm install","npm run deploy","→ Uploaded globalpulse","→ Cron: */5 * * * *","→ Channels: feishu, telegram, wechat, email","✔ Briefing pipeline online"]'>
<div class="gp-term-bar">
<div class="gp-term-leds" aria-hidden="true"><span></span><span></span><span></span></div>
<span class="gp-term-title">globalpulse@edge — zsh</span>
</div>
<div class="gp-term-body" data-gp-terminal-body aria-live="polite">
<div class="gp-term-line"><span class="gp-term-text is-comment"># boot GlobalPulse on Cloudflare Workers</span></div>
<div class="gp-term-line"><span class="gp-term-prompt">$ </span><span class="gp-term-text">git clone https://github.com/InnoNestX/GlobalPulse.git</span><span class="gp-term-cursor" aria-hidden="true"></span></div>
</div>
</div>
<div class="gp-command-stack" aria-label="Copyable install commands">
<div class="gp-command">
<div class="gp-command-head">
<span>01 · clone</span>
<button type="button" class="gp-copy-btn" data-gp-copy="#gp-cmd-clone">Copy</button>
</div>
<code class="gp-code" id="gp-cmd-clone">git clone https://github.com/InnoNestX/GlobalPulse.git</code>
</div>
<div class="gp-command">
<div class="gp-command-head">
<span>02 · configure</span>
<button type="button" class="gp-copy-btn" data-gp-copy="#gp-cmd-config">Copy</button>
</div>
<code class="gp-code" id="gp-cmd-config">cp wrangler.example.jsonc wrangler.jsonc &amp;&amp; cp .dev.vars.example .dev.vars</code>
</div>
<div class="gp-command">
<div class="gp-command-head">
<span>03 · deploy</span>
<button type="button" class="gp-copy-btn" data-gp-copy="#gp-cmd-deploy">Copy</button>
</div>
<code class="gp-code" id="gp-cmd-deploy">npm install &amp;&amp; npm run deploy</code>
</div>
</div>
</div>
</section>

<section class="gp-grid" aria-label="Features">
<div class="gp-cell gp-span-12">
<h2 class="gp-section-title">Modules</h2>
</div>
<div class="gp-cell gp-span-12">
<div class="gp-feature-grid">
<a class="gp-link-cell" href="/GlobalPulse/en/config/schedules.html"><strong>Scheduled briefings</strong><span>Cron on Workers with per-task timezones and trading calendars.</span><em>Open</em></a>
<a class="gp-link-cell" href="/GlobalPulse/en/features.html"><strong>Market research</strong><span>US stocks, A-shares, crypto, and hotspot feeds in one pipeline.</span><em>Open</em></a>
<a class="gp-link-cell" href="/GlobalPulse/en/config/providers.html"><strong>Push providers</strong><span>Feishu, WeChat, Telegram, and Email from one Admin UI.</span><em>Open</em></a>
<a class="gp-link-cell" href="/GlobalPulse/en/reference/variables.html"><strong>Templates</strong><span>Reusable Markdown, text, JSON, and chat variables.</span><em>Open</em></a>
<a class="gp-link-cell" href="/GlobalPulse/en/config/admin.html"><strong>Admin UI</strong><span>Schedules, channels, live preview, delivery logs.</span><em>Open</em></a>
<a class="gp-link-cell" href="/GlobalPulse/en/api.html"><strong>HTTP API</strong><span>Preview, send, health, and admin endpoints.</span><em>Open</em></a>
</div>
</div>
</section>

<section class="gp-grid" aria-label="Documentation paths">
<div class="gp-cell gp-span-12">
<h2 class="gp-section-title">Next commands</h2>
</div>
<div class="gp-cell gp-span-12">
<div class="gp-doc-grid">
<a class="gp-link-cell" href="/GlobalPulse/en/quick-start.html"><strong>Quick start</strong><span>Install, configure Cloudflare, run the Worker locally.</span><em>Read</em></a>
<a class="gp-link-cell" href="/GlobalPulse/en/deploy/cloudflare.html"><strong>Cloudflare deploy</strong><span>KV, D1, cron triggers, Workers AI, secrets.</span><em>Read</em></a>
<a class="gp-link-cell" href="/GlobalPulse/en/deploy/env.html"><strong>Environment</strong><span>Admin password, API token, provider credentials.</span><em>Read</em></a>
</div>
</div>
</section>

<footer class="gp-grid">
<div class="gp-cell gp-span-12 gp-footer">
<span>GlobalPulse · Documentation</span>
<span>MIT · 2026 InnoNestX</span>
</div>
</footer>
</div>
