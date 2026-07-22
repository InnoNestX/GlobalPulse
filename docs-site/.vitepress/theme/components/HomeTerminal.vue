<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    lang?: 'en' | 'zh'
  }>(),
  { lang: 'en' },
)

const isZh = props.lang === 'zh'

const lines = isZh
  ? [
      '# 在 Cloudflare Workers 上启动 GlobalPulse',
      'git clone https://github.com/InnoNestX/GlobalPulse.git',
      'cd GlobalPulse',
      'cp .dev.vars.example .dev.vars',
      'cp wrangler.example.jsonc wrangler.jsonc',
      'npm install',
      'npm run deploy',
      '→ Uploaded globalpulse',
      '→ Cron: */5 * * * *',
      '→ Channels: feishu, telegram, wechat, email',
      '✔ 简报管线已上线',
    ]
  : [
      '# boot GlobalPulse on Cloudflare Workers',
      'git clone https://github.com/InnoNestX/GlobalPulse.git',
      'cd GlobalPulse',
      'cp .dev.vars.example .dev.vars',
      'cp wrangler.example.jsonc wrangler.jsonc',
      'npm install',
      'npm run deploy',
      '→ Uploaded globalpulse',
      '→ Cron: */5 * * * *',
      '→ Channels: feishu, telegram, wechat, email',
      '✔ Briefing pipeline online',
    ]

const commands = isZh
  ? [
      { id: 'gp-zh-cmd-clone', label: '01 · 克隆', code: 'git clone https://github.com/InnoNestX/GlobalPulse.git' },
      {
        id: 'gp-zh-cmd-config',
        label: '02 · 配置',
        code: 'cp wrangler.example.jsonc wrangler.jsonc && cp .dev.vars.example .dev.vars',
      },
      { id: 'gp-zh-cmd-deploy', label: '03 · 部署', code: 'npm install && npm run deploy' },
    ]
  : [
      { id: 'gp-cmd-clone', label: '01 · clone', code: 'git clone https://github.com/InnoNestX/GlobalPulse.git' },
      {
        id: 'gp-cmd-config',
        label: '02 · configure',
        code: 'cp wrangler.example.jsonc wrangler.jsonc && cp .dev.vars.example .dev.vars',
      },
      { id: 'gp-cmd-deploy', label: '03 · deploy', code: 'npm install && npm run deploy' },
    ]

type Row = {
  kind: 'cmd' | 'comment' | 'out' | 'ok'
  text: string
  typing?: boolean
}

const rows = ref<Row[]>([
  { kind: 'comment', text: lines[0] },
  { kind: 'cmd', text: lines[1], typing: true },
])
const bodyEl = ref<HTMLElement | null>(null)
const copyState = ref<Record<string, string>>({})
let aborted = false
let timer: number | null = null

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    timer = window.setTimeout(() => {
      timer = null
      resolve()
    }, ms)
  })
}

function classify(line: string): Row['kind'] {
  if (line.startsWith('#')) return 'comment'
  if (line.startsWith('✔')) return 'ok'
  if (line.startsWith('→')) return 'out'
  return 'cmd'
}

async function play() {
  while (!aborted) {
    rows.value = []
    await nextTick()
    for (const line of lines) {
      if (aborted) return
      const kind = classify(line)
      if (kind !== 'cmd') {
        rows.value.push({ kind, text: line })
        await nextTick()
        if (bodyEl.value) bodyEl.value.scrollTop = bodyEl.value.scrollHeight
        await sleep(380)
        continue
      }
      const row: Row = { kind, text: '', typing: true }
      rows.value.push(row)
      for (let i = 0; i < line.length; i += 1) {
        if (aborted) return
        row.text = line.slice(0, i + 1)
        rows.value = [...rows.value.slice(0, -1), { ...row }]
        await nextTick()
        if (bodyEl.value) bodyEl.value.scrollTop = bodyEl.value.scrollHeight
        await sleep(26)
      }
      row.typing = false
      rows.value = [...rows.value.slice(0, -1), { ...row }]
      await sleep(480)
    }
    await sleep(1600)
  }
}

async function copyCommand(id: string, code: string) {
  try {
    await navigator.clipboard.writeText(code)
    copyState.value = { ...copyState.value, [id]: isZh ? '已复制' : 'Copied' }
    window.setTimeout(() => {
      const next = { ...copyState.value }
      delete next[id]
      copyState.value = next
    }, 1200)
  } catch {
    copyState.value = { ...copyState.value, [id]: isZh ? '失败' : 'Failed' }
  }
}

onMounted(() => {
  aborted = false
  void play()
})

onBeforeUnmount(() => {
  aborted = true
  if (timer != null) window.clearTimeout(timer)
})
</script>

<template>
  <div class="gp-cell gp-span-7 gp-terminal-wrap">
    <div class="gp-term">
      <div class="gp-term-bar">
        <div class="gp-term-leds" aria-hidden="true"><span /><span /><span /></div>
        <span class="gp-term-title">globalpulse@edge — zsh</span>
      </div>
      <div ref="bodyEl" class="gp-term-body" aria-live="polite">
        <div v-for="(row, index) in rows" :key="`${index}-${row.text}`" class="gp-term-line">
          <span v-if="row.kind === 'cmd'" class="gp-term-prompt">$ </span>
          <span
            class="gp-term-text"
            :class="{
              'is-comment': row.kind === 'comment',
              'is-out': row.kind === 'out',
              'is-ok': row.kind === 'ok',
            }"
          >{{ row.text }}</span>
          <span v-if="row.typing" class="gp-term-cursor" aria-hidden="true" />
        </div>
      </div>
    </div>

    <div class="gp-command-stack" :aria-label="isZh ? '可复制安装命令' : 'Copyable install commands'">
      <div v-for="item in commands" :key="item.id" class="gp-command">
        <div class="gp-command-head">
          <span>{{ item.label }}</span>
          <button
            type="button"
            class="gp-copy-btn"
            :class="{ 'is-copied': Boolean(copyState[item.id]) }"
            @click="copyCommand(item.id, item.code)"
          >
            {{ copyState[item.id] || (isZh ? '复制' : 'Copy') }}
          </button>
        </div>
        <code class="gp-code" :id="item.id">{{ item.code }}</code>
      </div>
    </div>
  </div>
</template>
