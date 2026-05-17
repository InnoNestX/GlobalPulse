---
layout: home
title: GlobalPulse
---

<div class="gp-shell">
  <header class="gp-grid gp-nav">
    <a class="gp-cell gp-logo" href="/GlobalPulse/en/">
      <span class="gp-mark"><img src="/globalpulse-project-logo.png" alt="GlobalPulse" /></span>
      <span>
        <span class="gp-brand">GlobalPulse</span>
        <span class="gp-subbrand">Market signal relay</span>
      </span>
    </a>
    <a class="gp-cell" href="/GlobalPulse/en/quick-start.html">Docs<span class="gp-blink"></span></a>
    <a class="gp-cell" href="/GlobalPulse/en/api.html">API<span class="gp-blink"></span></a>
    <a class="gp-cell" href="/GlobalPulse/zh/">中文<span class="gp-blink"></span></a>
    <div class="gp-cell gp-nav-meta"><span>Status</span><span>Edge online</span></div>
  </header>

  <section class="gp-grid gp-hero" aria-label="GlobalPulse overview">
    <div class="gp-cell gp-span-7 gp-hero-copy">
      <p class="gp-kicker">Open Source / MIT License / Cloudflare Workers</p>
      <h1 class="gp-headline">Market intelligence that <span>arrives on schedule.</span></h1>
      <p class="gp-copy">GlobalPulse is a self-hosted briefing engine for finance desks, builders, and operators. It watches market data, news, macro context, and custom feeds, then pushes concise AI-assisted reports to the channels where your team already works.</p>
      <div class="gp-actions">
        <a class="gp-action gp-action-primary" href="/GlobalPulse/en/quick-start.html">Start protocol</a>
        <a class="gp-action" href="/GlobalPulse/en/config/admin.html">Admin cockpit</a>
        <a class="gp-action" href="https://github.com/InnoNestX/GlobalPulse">GitHub source</a>
      </div>
    </div>
    <div class="gp-cell gp-span-5 gp-command-stack">
      <div class="gp-command">
        <div class="gp-command-head"><span>1. Clone</span><span class="gp-copy-token">Copy</span></div>
        <code class="gp-code">git clone https://github.com/InnoNestX/GlobalPulse.git</code>
      </div>
      <div class="gp-command">
        <div class="gp-command-head"><span>2. Configure</span><span class="gp-copy-token">Copy</span></div>
        <code class="gp-code">cp wrangler.example.jsonc wrangler.jsonc</code>
      </div>
      <div class="gp-command">
        <div class="gp-command-head"><span>3. Deploy</span><span class="gp-copy-token">Copy</span></div>
        <code class="gp-code">npm run deploy</code>
      </div>
    </div>
  </section>

  <section class="gp-grid" aria-label="Signal map">
    <div class="gp-cell gp-span-12">
      <h2 class="gp-section-title"><span>Live Signal Topology</span><span>US / A-share / Crypto / Hotspot</span></h2>
    </div>
    <div class="gp-cell gp-span-5 gp-radar">
      <div class="gp-radar-sweep"></div>
      <div class="gp-node gp-node-a">Yahoo</div>
      <div class="gp-node gp-node-b">Binance</div>
      <div class="gp-node gp-node-c">News</div>
      <div class="gp-node gp-node-d">LLM</div>
    </div>
    <div class="gp-cell gp-span-7 gp-terminal">
      <div class="gp-terminal-bar">
        <div class="gp-leds"><span></span><span></span><span></span></div>
        <span class="gp-terminal-title">GlobalPulse relay</span>
      </div>
      <div class="gp-terminal-body">
        <span class="gp-terminal-line">&gt; schedule window opened: Asia/Hong_Kong 09:00</span>
        <span class="gp-terminal-line">&gt; loading watchlist: AAPL, NVDA, 300750.SZ, BTCUSDT</span>
        <span class="gp-terminal-line">&gt; scoring catalysts: earnings, macro, sentiment, liquidity</span>
        <span class="gp-terminal-line">&gt; generating bilingual market briefing with confidence notes</span>
        <span class="gp-terminal-line">&gt; dispatching to Feishu, WeChat, Telegram, Email</span>
        <span class="gp-terminal-line">&gt; archive complete: D1 evidence packet sealed <span class="gp-blink"></span></span>
      </div>
    </div>
  </section>

  <section class="gp-grid" aria-label="Operational stats">
    <div class="gp-cell gp-span-12">
      <div class="gp-stat-grid">
        <div class="gp-stat"><span class="gp-stat-label">Scheduler</span><span class="gp-stat-value">5 min</span></div>
        <div class="gp-stat"><span class="gp-stat-label">Task slots</span><span class="gp-stat-value">20</span></div>
        <div class="gp-stat"><span class="gp-stat-label">Watchlist cap</span><span class="gp-stat-value">80</span></div>
      </div>
    </div>
  </section>

  <section class="gp-grid" aria-label="Features">
    <div class="gp-cell gp-span-12">
      <h2 class="gp-section-title"><span>Core Modules</span><span>Briefing engine v0.1</span></h2>
    </div>
    <div class="gp-cell gp-span-12">
      <div class="gp-feature-grid">
        <a class="gp-link-cell" href="/GlobalPulse/en/config/schedules.html"><strong>Scheduled briefings</strong><span>Cron-aware jobs run at the edge and respect each task timezone.</span><em>Open</em></a>
        <a class="gp-link-cell" href="/GlobalPulse/en/features.html"><strong>Market research</strong><span>US stocks, A-shares, crypto, and global hotspot feeds in one report flow.</span><em>Open</em></a>
        <a class="gp-link-cell" href="/GlobalPulse/en/reference/variables.html"><strong>Template variables</strong><span>Reusable message fields for Markdown, text, JSON, email, and chat outputs.</span><em>Open</em></a>
        <a class="gp-link-cell" href="/GlobalPulse/en/config/providers.html"><strong>Push providers</strong><span>Feishu, WeChat, Telegram, and Email delivery from one admin cockpit.</span><em>Open</em></a>
        <a class="gp-link-cell" href="/GlobalPulse/en/config/admin.html"><strong>Admin cockpit</strong><span>Password-protected UI for schedules, channels, previews, and logs.</span><em>Open</em></a>
        <a class="gp-link-cell" href="/GlobalPulse/en/api.html"><strong>HTTP control plane</strong><span>Preview, send, health, admin, and provider endpoints for automation.</span><em>Open</em></a>
      </div>
    </div>
  </section>

  <section class="gp-grid" aria-label="Documentation paths">
    <div class="gp-cell gp-span-12">
      <h2 class="gp-section-title"><span>Documentation routes</span><span>Choose your entry point</span></h2>
    </div>
    <div class="gp-cell gp-span-12">
      <div class="gp-doc-grid">
        <a class="gp-link-cell" href="/GlobalPulse/en/quick-start.html"><strong>Quick start</strong><span>Install dependencies, configure Cloudflare, and run the Worker locally.</span><em>Read</em></a>
        <a class="gp-link-cell" href="/GlobalPulse/en/deploy/cloudflare.html"><strong>Cloudflare deploy</strong><span>Bind KV, D1, cron triggers, Workers AI, and secrets for production.</span><em>Read</em></a>
        <a class="gp-link-cell" href="/GlobalPulse/en/deploy/env.html"><strong>Environment</strong><span>Required variables, provider credentials, admin password, and API tokens.</span><em>Read</em></a>
      </div>
    </div>
  </section>

  <footer class="gp-grid">
    <div class="gp-cell gp-span-12 gp-footer">
      <span>GlobalPulse docs / GitHub Pages</span>
      <span>MIT License / 2026</span>
    </div>
  </footer>
</div>
