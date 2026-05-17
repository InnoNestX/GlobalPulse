---
layout: home
title: GlobalPulse
---

<script>
  if (typeof window !== 'undefined') {
    const gpLanguage = navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
    window.location.replace(`/GlobalPulse/${gpLanguage}/`)
  }
</script>

<div class="gp-shell">
  <section class="gp-grid gp-hero" aria-label="Choose documentation language">
    <div class="gp-cell gp-span-12 gp-hero-copy">
      <p class="gp-kicker">GlobalPulse Documentation</p>
      <h1 class="gp-headline">Select <span>docs channel.</span></h1>
      <p class="gp-copy">If the automatic redirect does not start, choose a documentation language below.</p>
      <div class="gp-actions">
        <a class="gp-action gp-action-primary" href="/GlobalPulse/en/">English</a>
        <a class="gp-action" href="/GlobalPulse/zh/">中文</a>
      </div>
    </div>
  </section>
</div>
