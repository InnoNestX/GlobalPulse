---
layout: home
title: GlobalPulse

hero:
  name: GlobalPulse
  text: Market Intelligence
  tagline: Scheduled Finance & Global Hotspot Briefings
  image:
    src: /logo.svg
    alt: GlobalPulse
  actions:
    - theme: brand
      text: Get Started →
      link: /en/quick-start
    - theme: alt
      text: View on GitHub
      link: https://github.com/nestjs/globalpulse

features:
  - icon: ⏰
    title: Scheduled Briefings
    details: Cron-based scheduling with timezone support. Runs every 5 minutes, delivers when you need it.
  - icon: 📊
    title: Market Intelligence
    details: US stocks, A-shares, crypto. Real-time data from Yahoo Finance, Binance, CoinGecko, and more.
  - icon: 🤖
    title: AI-Powered Reports
    details: LLM-generated market analysis with confidence scoring and signal detection.
  - icon: 📱
    title: Multi-Provider Push
    details: Feishu, WeChat, Telegram, Email. One config, all platforms.
  - icon: 🔒
    title: Secure by Design
    details: Password-protected admin UI, KV-backed config, API token auth.
  - icon: ☁️
    title: Edge Computing
    details: Built on Cloudflare Workers. Fast, resilient, globally distributed.
---

<div class="hero-gradient"></div>

<style scoped>
.hero-gradient {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 600px;
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(0, 180, 216, 0.05) 50%, transparent 100%);
  pointer-events: none;
  z-index: -1;
}

:deep(.VPHero) {
  padding-top: 80px !important;
}

:deep(.VPButton.brand) {
  background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%) !important;
  border: none !important;
  font-weight: 600 !important;
  transition: all 0.3s ease !important;
}

:deep(.VPButton.brand:hover) {
  transform: translateY(-2px) !important;
  box-shadow: 0 8px 30px rgba(0, 212, 255, 0.4) !important;
}

:deep(.VPFeature) {
  background: rgba(255, 255, 255, 0.03) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  backdrop-filter: blur(10px) !important;
  transition: all 0.3s ease !important;
}

:deep(.VPFeature:hover) {
  border-color: rgba(0, 212, 255, 0.3) !important;
  transform: translateY(-4px) !important;
}
</style>