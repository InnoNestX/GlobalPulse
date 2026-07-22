<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    lang?: 'en' | 'zh'
  }>(),
  { lang: 'en' },
)

const isZh = props.lang === 'zh'

type OutLine = {
  text: string
  tone?: 'dim' | 'info' | 'ok' | 'warn' | 'err'
  delay?: number
}

type Step = {
  cmd: string
  cwd: string
  output: OutLine[]
  thinkMs?: number
}

const host = 'workers'
const user = 'xuxu'

const TYPE_CHAR_MS = 62
const TYPE_SPACE_MS = 110
const AFTER_ENTER_MS = 420
const BETWEEN_STEPS_MS = 520
const LOOP_IDLE_MS = 4800
const START_PAUSE_MS = 700

const session: Step[] = [
  {
    cwd: '~',
    cmd: 'git clone https://github.com/InnoNestX/GlobalPulse.git',
    thinkMs: 900,
    output: [
      { text: "Cloning into 'GlobalPulse'...", tone: 'dim', delay: 420 },
      { text: 'remote: Enumerating objects: 286, done.', tone: 'dim', delay: 380 },
      { text: 'remote: Counting objects: 100% (286/286), done.', tone: 'dim', delay: 360 },
      { text: 'remote: Compressing objects: 100% (142/142), done.', tone: 'dim', delay: 360 },
      { text: 'Receiving objects: 100% (286/286), 1.84 MiB | 4.2 MiB/s, done.', delay: 520 },
      { text: 'Resolving deltas: 100% (118/118), done.', delay: 420 },
    ],
  },
  {
    cwd: '~',
    cmd: 'cd GlobalPulse',
    thinkMs: 280,
    output: [],
  },
  {
    cwd: '~/GlobalPulse',
    cmd: 'cp .dev.vars.example .dev.vars',
    thinkMs: 260,
    output: [],
  },
  {
    cwd: '~/GlobalPulse',
    cmd: 'cp wrangler.example.jsonc wrangler.jsonc',
    thinkMs: 260,
    output: [],
  },
  {
    cwd: '~/GlobalPulse',
    cmd: 'npm install',
    thinkMs: 1100,
    output: [
      { text: 'npm warn deprecated inflight@1.0.6: This module is not supported...', tone: 'warn', delay: 480 },
      { text: '', delay: 220 },
      { text: 'added 214 packages, and audited 215 packages in 6s', delay: 700 },
      { text: '', delay: 200 },
      { text: '32 packages are looking for funding', tone: 'dim', delay: 360 },
      { text: '  run `npm fund` for details', tone: 'dim', delay: 320 },
      { text: '', delay: 180 },
      { text: 'found 0 vulnerabilities', tone: 'ok', delay: 480 },
    ],
  },
  {
    cwd: '~/GlobalPulse',
    cmd: 'npm run deploy',
    thinkMs: 1300,
    output: [
      { text: '', delay: 220 },
      { text: '> globalpulse@0.1.0 deploy', tone: 'dim', delay: 320 },
      { text: '> wrangler deploy', tone: 'dim', delay: 300 },
      { text: '', delay: 220 },
      { text: ' ⛅️ wrangler 4.90.1', tone: 'info', delay: 420 },
      { text: '───────────────────', tone: 'dim', delay: 260 },
      { text: 'Total Upload: 412.18 KiB / gzip: 98.42 KiB', delay: 560 },
      { text: 'Worker Startup Time: 18 ms', delay: 380 },
      { text: 'Uploaded globalpulse (3.21 sec)', tone: 'ok', delay: 700 },
      { text: 'Deployed globalpulse triggers (1.04 sec)', tone: 'ok', delay: 560 },
      { text: '  schedule: */5 * * * *', tone: 'info', delay: 420 },
      { text: '  https://globalpulse.<account>.workers.dev', tone: 'info', delay: 460 },
      { text: 'Current Version ID: 8f2c1a9b-4d77-4e01-9c3a-12ab34cd56ef', tone: 'dim', delay: 480 },
      {
        text: 'Admin UI: https://globalpulse.<account>.workers.dev/admin',
        tone: 'ok',
        delay: 520,
      },
    ],
  },
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

type Row =
  | { kind: 'prompt'; cwd: string; cmd: string; typing?: boolean; idle?: boolean }
  | { kind: 'out'; text: string; tone?: OutLine['tone'] }

const rows = ref<Row[]>([])
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

async function scrollBottom() {
  await nextTick()
  const el = bodyEl.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

function promptPrefix(cwd: string) {
  return `${user}@${host}:${cwd}`
}

async function typeCommand(cwd: string, cmd: string) {
  const row: Extract<Row, { kind: 'prompt' }> = { kind: 'prompt', cwd, cmd: '', typing: true }
  rows.value.push(row)
  await scrollBottom()
  for (let i = 0; i < cmd.length; i += 1) {
    if (aborted) return
    row.cmd = cmd.slice(0, i + 1)
    rows.value = [...rows.value.slice(0, -1), { ...row }]
    await scrollBottom()
    const ch = cmd[i]
    const jitter = i % 7 === 0 ? 28 : i % 4 === 0 ? 14 : 0
    await sleep((ch === ' ' ? TYPE_SPACE_MS : TYPE_CHAR_MS) + jitter)
  }
  row.typing = false
  rows.value = [...rows.value.slice(0, -1), { ...row }]
  await sleep(AFTER_ENTER_MS)
}

async function streamOutput(lines: OutLine[]) {
  for (const line of lines) {
    if (aborted) return
    await sleep(line.delay ?? 320)
    rows.value.push({ kind: 'out', text: line.text, tone: line.tone })
    await scrollBottom()
  }
}

async function play() {
  while (!aborted) {
    rows.value = []
    await scrollBottom()
    await sleep(START_PAUSE_MS)

    for (const step of session) {
      if (aborted) return
      await typeCommand(step.cwd, step.cmd)
      await sleep(step.thinkMs ?? 320)
      if (step.output.length) await streamOutput(step.output)
      else await sleep(180)
      await sleep(BETWEEN_STEPS_MS)
    }

    if (aborted) return
    rows.value.push({
      kind: 'prompt',
      cwd: '~/GlobalPulse',
      cmd: '',
      idle: true,
      typing: true,
    })
    await scrollBottom()
    await sleep(LOOP_IDLE_MS)
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
        <span class="gp-term-title">{{ user }}@{{ host }} — zsh</span>
      </div>
      <div ref="bodyEl" class="gp-term-body" aria-live="polite">
        <div
          v-for="(row, index) in rows"
          :key="index"
          class="gp-term-line"
          :class="{ 'is-blank': row.kind === 'out' && !row.text }"
        >
          <template v-if="row.kind === 'prompt'">
            <span class="gp-term-user">{{ promptPrefix(row.cwd) }}</span>
            <span class="gp-term-prompt"> % </span>
            <span class="gp-term-text">{{ row.cmd }}</span>
            <span v-if="row.typing || row.idle" class="gp-term-cursor" aria-hidden="true" />
          </template>
          <template v-else>
            <span
              class="gp-term-out"
              :class="{
                'is-dim': row.tone === 'dim',
                'is-info': row.tone === 'info',
                'is-ok': row.tone === 'ok',
                'is-warn': row.tone === 'warn',
                'is-err': row.tone === 'err',
              }"
            >{{ row.text || '\u00A0' }}</span>
          </template>
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
