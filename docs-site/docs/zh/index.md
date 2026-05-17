---
layout: home
title: GlobalPulse

hero:
  name: GlobalPulse
  text: 市场情报
  tagline: 定时财经与全球热点简报
  image:
    src: /logo.svg
    alt: GlobalPulse
  actions:
    - theme: brand
      text: 快速开始 →
      link: /zh/quick-start
    - theme: alt
      text: GitHub
      link: https://github.com/nestjs/globalpulse

features:
  - icon: ⏰
    title: 定时简报
    details: 支持时区的 Cron 调度。每5分钟运行，按时送达。
  - icon: 📊
    title: 市场情报
    details: 美股、A股、加密货币。实时数据来自Yahoo Finance、Binance、CoinGecko等。
  - icon: 🤖
    title: AI 驱动报告
    details: LLM 生成的市场分析，带置信度评分和信号检测。
  - icon: 📱
    title: 多渠道推送
    details: 飞书、微信、Telegram、Email。一个配置，全平台覆盖。
  - icon: 🔒
    title: 安全设计
    details: 密码保护管理后台，KV 配置存储，API Token 认证。
  - icon: ☁️
    title: 边缘计算
    details: 基于 Cloudflare Workers 构建。快速、弹性、全球分发。
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