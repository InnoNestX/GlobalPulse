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
<span class="gp-subbrand">边缘简报中继</span>
</span>
</a>
<a class="gp-cell" href="/GlobalPulse/zh/quick-start.html">文档</a>
<a class="gp-cell" href="/GlobalPulse/zh/api.html">API</a>
<a class="gp-cell" href="/GlobalPulse/en/">English</a>
<div class="gp-cell gp-nav-meta"><span>状态</span><span class="gp-status-dot" aria-hidden="true"></span></div>
</header>

<section class="gp-grid gp-hero" aria-label="GlobalPulse overview">
<div class="gp-cell gp-span-5 gp-hero-copy">
<p class="gp-kicker">Cloudflare Workers · MIT</p>
<h1 class="gp-headline">GlobalPulse</h1>
<p class="gp-lede">按 Cron 准时发出的市场简报。</p>
<p class="gp-copy">克隆、配置、部署。Worker 拉取行情与新闻，再推送到飞书、微信、Telegram 与 Email。</p>
<div class="gp-actions">
<a class="gp-action gp-action-primary" href="/GlobalPulse/zh/quick-start.html">快速开始</a>
<a class="gp-action" href="/GlobalPulse/zh/config/admin.html">管理后台</a>
<a class="gp-action" href="https://github.com/InnoNestX/GlobalPulse">GitHub</a>
</div>
</div>
<div class="gp-cell gp-span-7 gp-terminal-wrap">
<div class="gp-term" data-gp-terminal data-lines='["# 在 Cloudflare Workers 上启动 GlobalPulse","git clone https://github.com/InnoNestX/GlobalPulse.git","cd GlobalPulse","cp .dev.vars.example .dev.vars","cp wrangler.example.jsonc wrangler.jsonc","npm install","npm run deploy","→ Uploaded globalpulse","→ Cron: */5 * * * *","→ Channels: feishu, telegram, wechat, email","✔ 简报管线已上线"]'>
<div class="gp-term-bar">
<div class="gp-term-leds" aria-hidden="true"><span></span><span></span><span></span></div>
<span class="gp-term-title">globalpulse@edge — zsh</span>
</div>
<div class="gp-term-body" data-gp-terminal-body aria-live="polite">
<div class="gp-term-line"><span class="gp-term-text is-comment"># 在 Cloudflare Workers 上启动 GlobalPulse</span></div>
<div class="gp-term-line"><span class="gp-term-prompt">$ </span><span class="gp-term-text">git clone https://github.com/InnoNestX/GlobalPulse.git</span><span class="gp-term-cursor" aria-hidden="true"></span></div>
</div>
</div>
<div class="gp-command-stack" aria-label="可复制安装命令">
<div class="gp-command">
<div class="gp-command-head">
<span>01 · 克隆</span>
<button type="button" class="gp-copy-btn" data-gp-copy="#gp-zh-cmd-clone">复制</button>
</div>
<code class="gp-code" id="gp-zh-cmd-clone">git clone https://github.com/InnoNestX/GlobalPulse.git</code>
</div>
<div class="gp-command">
<div class="gp-command-head">
<span>02 · 配置</span>
<button type="button" class="gp-copy-btn" data-gp-copy="#gp-zh-cmd-config">复制</button>
</div>
<code class="gp-code" id="gp-zh-cmd-config">cp wrangler.example.jsonc wrangler.jsonc &amp;&amp; cp .dev.vars.example .dev.vars</code>
</div>
<div class="gp-command">
<div class="gp-command-head">
<span>03 · 部署</span>
<button type="button" class="gp-copy-btn" data-gp-copy="#gp-zh-cmd-deploy">复制</button>
</div>
<code class="gp-code" id="gp-zh-cmd-deploy">npm install &amp;&amp; npm run deploy</code>
</div>
</div>
</div>
</section>

<section class="gp-grid" aria-label="Features">
<div class="gp-cell gp-span-12">
<h2 class="gp-section-title">模块</h2>
</div>
<div class="gp-cell gp-span-12">
<div class="gp-feature-grid">
<a class="gp-link-cell" href="/GlobalPulse/zh/config/schedules.html"><strong>定时简报</strong><span>Workers Cron，支持任务级时区与交易日历。</span><em>打开</em></a>
<a class="gp-link-cell" href="/GlobalPulse/zh/features.html"><strong>市场研究</strong><span>美股、A股、加密与热点信息流汇入同一管线。</span><em>打开</em></a>
<a class="gp-link-cell" href="/GlobalPulse/zh/config/providers.html"><strong>推送渠道</strong><span>飞书、微信、Telegram、Email 统一配置。</span><em>打开</em></a>
<a class="gp-link-cell" href="/GlobalPulse/zh/reference/variables.html"><strong>消息模板</strong><span>Markdown / 文本 / JSON / 聊天变量复用。</span><em>打开</em></a>
<a class="gp-link-cell" href="/GlobalPulse/zh/config/admin.html"><strong>管理后台</strong><span>任务、渠道、实时预览、推送日志。</span><em>打开</em></a>
<a class="gp-link-cell" href="/GlobalPulse/zh/api.html"><strong>HTTP API</strong><span>预览、发送、健康检查与管理接口。</span><em>打开</em></a>
</div>
</div>
</section>

<section class="gp-grid" aria-label="Documentation paths">
<div class="gp-cell gp-span-12">
<h2 class="gp-section-title">下一步</h2>
</div>
<div class="gp-cell gp-span-12">
<div class="gp-doc-grid">
<a class="gp-link-cell" href="/GlobalPulse/zh/quick-start.html"><strong>快速开始</strong><span>安装依赖、配置 Cloudflare、本地运行。</span><em>阅读</em></a>
<a class="gp-link-cell" href="/GlobalPulse/zh/deploy/cloudflare.html"><strong>Cloudflare 部署</strong><span>KV、D1、Cron、Workers AI、密钥。</span><em>阅读</em></a>
<a class="gp-link-cell" href="/GlobalPulse/zh/deploy/env.html"><strong>环境变量</strong><span>管理密码、API Token、渠道凭证。</span><em>阅读</em></a>
</div>
</div>
</section>

<footer class="gp-grid">
<div class="gp-cell gp-span-12 gp-footer">
<span>GlobalPulse · 文档</span>
<span>MIT · 2026 InnoNestX</span>
</div>
</footer>
</div>
