const TYPING_MS = 28
const LINE_PAUSE_MS = 520
const LOOP_PAUSE_MS = 1800

type TerminalSession = {
  root: HTMLElement
  body: HTMLElement
  lines: string[]
  timer: number | null
  aborted: boolean
}

const sessions = new WeakMap<HTMLElement, TerminalSession>()

function sleep(ms: number, session: TerminalSession) {
  return new Promise<void>((resolve) => {
    session.timer = window.setTimeout(() => {
      session.timer = null
      resolve()
    }, ms)
  })
}

function clearSession(session: TerminalSession) {
  session.aborted = true
  if (session.timer != null) {
    window.clearTimeout(session.timer)
    session.timer = null
  }
}

async function play(session: TerminalSession) {
  const { body, lines } = session
  while (!session.aborted) {
    body.replaceChildren()
    for (const line of lines) {
      if (session.aborted) return
      const row = document.createElement('div')
      row.className = 'gp-term-line'
      const prompt = document.createElement('span')
      prompt.className = 'gp-term-prompt'
      prompt.textContent = line.startsWith('#') || line.startsWith('✔') || line.startsWith('→') ? '' : '$ '
      const text = document.createElement('span')
      text.className = 'gp-term-text'
      const cursor = document.createElement('span')
      cursor.className = 'gp-term-cursor'
      cursor.setAttribute('aria-hidden', 'true')
      row.append(prompt, text, cursor)
      body.append(row)
      body.scrollTop = body.scrollHeight

      const content = line
      if (line.startsWith('#') || line.startsWith('✔') || line.startsWith('→')) {
        text.textContent = content
        text.classList.add(line.startsWith('✔') ? 'is-ok' : line.startsWith('→') ? 'is-out' : 'is-comment')
        cursor.remove()
        await sleep(LINE_PAUSE_MS * 0.7, session)
        continue
      }

      for (let i = 0; i < content.length; i += 1) {
        if (session.aborted) return
        text.textContent = content.slice(0, i + 1)
        body.scrollTop = body.scrollHeight
        await sleep(TYPING_MS, session)
      }
      cursor.remove()
      await sleep(LINE_PAUSE_MS, session)
    }
    await sleep(LOOP_PAUSE_MS, session)
  }
}

function readLines(root: HTMLElement): string[] {
  const raw = root.getAttribute('data-lines')
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function bindCopyButtons(scope: ParentNode = document) {
  scope.querySelectorAll<HTMLButtonElement>('[data-gp-copy]').forEach((button) => {
    if (button.dataset.bound === '1') return
    button.dataset.bound = '1'
    button.addEventListener('click', async () => {
      const target = button.getAttribute('data-gp-copy')
      const code = target
        ? document.querySelector<HTMLElement>(target)
        : button.parentElement?.querySelector('code')
      const value = code?.textContent?.trim()
      if (!value) return
      try {
        await navigator.clipboard.writeText(value)
        const prev = button.textContent
        button.textContent = 'Copied'
        button.classList.add('is-copied')
        window.setTimeout(() => {
          button.textContent = prev
          button.classList.remove('is-copied')
        }, 1200)
      } catch {
        button.textContent = 'Failed'
      }
    })
  })
}

export function mountLandingEffects() {
  bindCopyButtons(document)

  document.querySelectorAll<HTMLElement>('[data-gp-terminal]').forEach((root) => {
    const body = root.querySelector<HTMLElement>('[data-gp-terminal-body]')
    if (!body) return
    const existing = sessions.get(root)
    if (existing) clearSession(existing)

    const lines = readLines(root)
    if (!lines.length) return

    const session: TerminalSession = {
      root,
      body,
      lines,
      timer: null,
      aborted: false,
    }
    sessions.set(root, session)
    void play(session)
  })
}
