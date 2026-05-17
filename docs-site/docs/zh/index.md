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
      link: /GlobalPulse/zh/quick-start
    - theme: alt
      text: GitHub
      link: https://github.com/InnoNestX/GlobalPulse

features:
  - icon: ⏰
    title: 定时简报
    details: 支持时区的 Cron 调度。每5分钟运行，按时送达。
  - icon: 📊
    title: 市场情报
    details: 美股、A股、加密货币。实时数据来自 Yahoo Finance、Binance、CoinGecko 等。
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

<div class="hero-bg">
  <div class="gradientOrb orb1"></div>
  <div class="gradientOrb orb2"></div>
  <div class="gradientOrb orb3"></div>
  <div class="grid-overlay"></div>
</div>

<div class="scroll-indicator">
  <div class="mouse">
    <div class="wheel"></div>
  </div>
  <span>向下滚动探索</span>
</div>

<style>
:root {
  --vp-c-brand-1: #00d4ff;
  --vp-c-brand-2: #0099cc;
  --hero-gradient-start: rgba(0, 212, 255, 0.15);
  --hero-gradient-mid: rgba(0, 180, 216, 0.08);
}

.hero-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  z-index: -1;
  background: #0a0e14;
}

.gradientOrb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.6;
  animation: float 20s ease-in-out infinite;
}

.orb1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(0, 212, 255, 0.4) 0%, transparent 70%);
  top: -200px;
  left: -100px;
  animation-delay: 0s;
}

.orb2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(0, 153, 204, 0.3) 0%, transparent 70%);
  top: 50%;
  right: -150px;
  animation-delay: -7s;
  animation-duration: 25s;
}

.orb3 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(0, 212, 255, 0.25) 0%, transparent 70%);
  bottom: -100px;
  left: 30%;
  animation-delay: -14s;
  animation-duration: 22s;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(50px, -30px) scale(1.05);
  }
  50% {
    transform: translate(-20px, 50px) scale(0.95);
  }
  75% {
    transform: translate(-50px, -20px) scale(1.02);
  }
}

.grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  animation: gridMove 30s linear infinite;
}

@keyframes gridMove {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(60px);
  }
}

.scroll-indicator {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  opacity: 0.6;
  animation: fadeInUp 1s ease-out 1.5s both, pulse 2s ease-in-out infinite 2.5s;
}

.scroll-indicator .mouse {
  width: 24px;
  height: 40px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

.scroll-indicator .wheel {
  width: 4px;
  height: 8px;
  background: #00d4ff;
  border-radius: 2px;
  animation: scrollWheel 1.5s ease-in-out infinite;
}

@keyframes scrollWheel {
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(8px);
  }
}

.scroll-indicator span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 2px;
  text-transform: uppercase;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 0.6;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.3;
  }
}

.VPHero {
  padding-top: 100px !important;
  position: relative;
}

.VPHero .container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.VPHero .name {
  font-size: 72px !important;
  font-weight: 800 !important;
  background: linear-gradient(135deg, #00d4ff 0%, #00ffaa 50%, #00d4ff 100%) !important;
  background-size: 200% 200% !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  animation: gradientShift 4s ease-in-out infinite !important;
  text-shadow: 0 0 60px rgba(0, 212, 255, 0.5) !important;
}

@keyframes gradientShift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.VPHero .tagline {
  font-size: 20px !important;
  color: rgba(255, 255, 255, 0.7) !important;
  margin-top: 16px !important;
  letter-spacing: 2px !important;
}

.VPButton {
  padding: 12px 28px !important;
  border-radius: 8px !important;
  font-weight: 600 !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  position: relative !important;
  overflow: hidden !important;
}

.VPButton::before {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: -100% !important;
  width: 100% !important;
  height: 100% !important;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent) !important;
  transition: left 0.5s !important;
}

.VPButton:hover::before {
  left: 100% !important;
}

.VPButton.brand {
  background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%) !important;
  border: none !important;
  box-shadow: 0 4px 20px rgba(0, 212, 255, 0.3) !important;
}

.VPButton.brand:hover {
  transform: translateY(-3px) scale(1.02) !important;
  box-shadow: 0 12px 40px rgba(0, 212, 255, 0.5) !important;
}

.VPButton.alt {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: #fff !important;
}

.VPButton.alt:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  border-color: rgba(0, 212, 255, 0.5) !important;
  transform: translateY(-3px) !important;
}

.VPFeatures {
  padding: 100px 24px !important;
  max-width: 1200px;
  margin: 0 auto;
}

.VPFeature {
  background: rgba(255, 255, 255, 0.02) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 16px !important;
  padding: 28px !important;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
  position: relative !important;
  overflow: hidden !important;
}

.VPFeature::before {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  height: 1px !important;
  background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.5), transparent) !important;
  opacity: 0 !important;
  transition: opacity 0.3s !important;
}

.VPFeature:hover::before {
  opacity: 1 !important;
}

.VPFeature:hover {
  background: rgba(0, 212, 255, 0.05) !important;
  border-color: rgba(0, 212, 255, 0.3) !important;
  transform: translateY(-8px) scale(1.02) !important;
  box-shadow: 0 20px 60px rgba(0, 212, 255, 0.15) !important;
}

.VPFeature .icon {
  font-size: 48px !important;
  margin-bottom: 16px !important;
  display: block !important;
  animation: bounceIn 0.6s ease-out !important;
}

.VPFeature .title {
  font-size: 20px !important;
  font-weight: 700 !important;
  color: #fff !important;
  margin-bottom: 8px !important;
}

.VPFeature .details {
  font-size: 15px !important;
  color: rgba(255, 255, 255, 0.6) !important;
  line-height: 1.6 !important;
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  60% {
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.VPFooter {
  background: rgba(0, 0, 0, 0.3) !important;
  backdrop-filter: blur(10px) !important;
  border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
}

.VPFooter .message,
.VPFooter .copyright {
  color: rgba(255, 255, 255, 0.5) !important;
  font-size: 14px !important;
}

.VPNav {
  background: rgba(10, 14, 20, 0.8) !important;
  backdrop-filter: blur(20px) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
}

.VPNavBarTitle .title {
  font-weight: 700 !important;
  color: #fff !important;
}

.VPNavBarMenuLink {
  color: rgba(255, 255, 255, 0.7) !important;
  transition: color 0.3s !important;
}

.VPNavBarMenuLink:hover {
  color: #00d4ff !important;
}

/* Responsive */
@media (max-width: 768px) {
  .VPHero .name {
    font-size: 48px !important;
  }
  
  .scroll-indicator {
    display: none !important;
  }
  
  .orb1 {
    width: 300px;
    height: 300px;
  }
  
  .orb2, .orb3 {
    width: 200px;
    height: 200px;
  }
}
</style>