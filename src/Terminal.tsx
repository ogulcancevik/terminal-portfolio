import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import config from '../portfolio.config.ts'
import { completions, run, type Ctx } from './commands.tsx'
import { commonPrefix, complete, expandHistory } from './shell.ts'
import { Banner, Cmd, reducedMotion } from './ui.tsx'
import { completePath, display, HOME } from './fs.ts'

interface Entry {
  id: number
  prompt: string
  cmd: string | null
  out: ComponentChildren
}

const CHIPS = ['help', 'about', 'experience', 'projects', 'skills', 'contact', 'ls', 'neofetch', 'clear']
const promptFor = (cwd: string[]) => `${config.user}@${config.host}:${display(cwd)}$`
let seq = 0

type Power = 'on' | 'off' | 'booting'

const BOOT = [
  'PortfolioOS 1.0 (tty1)',
  '',
  '[  OK  ] Started Kernel Logging Service.',
  `[  OK  ] Mounted /home/${config.user}.`,
  '[  OK  ] Started Portfolio Content Loader.',
  '[  OK  ] Started Theme Manager.',
  '[  OK  ] Reached target Graphical Interface.',
  '[  OK  ] Started psh, the portfolio shell.',
]

const mouse = () => matchMedia('(pointer: fine)').matches

/** Screen right after boot: banner, login line, then the welcome command's output. */
function freshScreen(): Entry[] {
  const entries: Entry[] = [
    {
      id: seq++,
      prompt: '',
      cmd: null,
      out: (
        <>
          <Banner />
          <p class="muted">
            Last login: {new Date().toString().slice(0, 24)} on ttys000
            <br />
            Welcome! Type <Cmd name="help" />, try <Cmd name="ls" /> or <Cmd name="neofetch" />, or tap a command below.
          </p>
        </>
      ),
    },
  ]
  if (config.welcome) {
    const ctx: Ctx = { history: [], cwd: HOME, cd() {}, clear() {}, power() {} }
    entries.push({ id: seq++, prompt: promptFor(HOME), cmd: config.welcome, out: run(config.welcome, ctx) })
  }
  return entries
}

/** Date and time for the full-layout status bar. */
function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <time class="muted" dateTime={now.toISOString()}>
      <span class="hide-narrow">
        {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
      </span>
      {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
    </time>
  )
}

export function Terminal() {
  const [entries, setEntries] = useState<Entry[]>(config.boot ? [] : freshScreen)
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [cursor, setCursor] = useState(0) // index into history; history.length = fresh line
  const [cwd, setCwd] = useState(HOME)
  const inputRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const lastTab = useRef<string | null>(null) // input at the previous Tab press, for bash-style double Tab
  const escaped = useRef(false) // Esc was just pressed: the next Tab leaves the terminal
  const termRef = useRef<HTMLElement>(null)
  const powerRef = useRef<HTMLButtonElement>(null)
  const [power, setPower] = useState<Power>(config.boot ? 'booting' : 'on')
  const [booted, setBooted] = useState(0) // boot lines shown so far
  const [minimized, setMinimized] = useState(false)
  const prompt = promptFor(cwd)

  const exec = (line: string, record = true) => {
    lastTab.current = null
    const typed = line.trim()
    const cmd = expandHistory(typed, history)
    if (cmd === null) {
      setInput('')
      return print(typed, <p class="error">psh: {typed}: event not found</p>)
    }
    const nextHistory = cmd && record ? [...history, cmd] : history
    setHistory(nextHistory)
    setCursor(nextHistory.length)
    setInput('')
    let cleared = false
    let powerAction: 'off' | 'reboot' | null = null
    const ctx: Ctx = {
      history: nextHistory,
      cwd,
      cd: (segs) => (ctx.cwd = segs),
      clear: () => (cleared = true),
      power: (a) => (powerAction = a),
    }
    const out = cmd ? run(cmd, ctx) : null
    setCwd(ctx.cwd)
    if (cleared) setEntries([])
    // Like bash, show what !! expanded to before its output.
    else print(typed, cmd === typed ? out : [<p>{cmd}</p>, out])
    // Let the broadcast message show for a moment before the screen goes dark.
    if (powerAction) setTimeout(() => powerDown(powerAction === 'reboot'), reducedMotion() ? 0 : 1200)
  }

  const powerDown = (reboot: boolean) => {
    setBooted(0)
    setPower(reboot ? 'booting' : 'off')
  }

  // Boot: reveal the log line by line, then start a fresh session. Any key or click skips ahead.
  useEffect(() => {
    if (power !== 'booting') return
    let n = 0
    const done = () => {
      setEntries(freshScreen())
      setHistory([])
      setCursor(0)
      setCwd(HOME)
      setInput('')
      setPower('on')
    }
    const id = setInterval(
      () => {
        setBooted(++n)
        if (n > BOOT.length) done()
      },
      reducedMotion() ? 0 : 150,
    )
    const skip = (e: Event) => {
      e.preventDefault()
      done()
    }
    addEventListener('keydown', skip)
    addEventListener('click', skip)
    return () => {
      clearInterval(id)
      removeEventListener('keydown', skip)
      removeEventListener('click', skip)
    }
  }, [power])

  useEffect(() => {
    if (power === 'on' && mouse()) inputRef.current?.focus()
    if (power === 'off') powerRef.current?.focus()
  }, [power])

  const toggleFullscreen = () =>
    document.fullscreenElement ? document.exitFullscreen() : termRef.current?.requestFullscreen()

  const print = (cmd: string, out: ComponentChildren) => setEntries((e) => [...e, { id: seq++, prompt, cmd, out }])

  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [entries, booted])

  const tab = () => {
    const words = input.trimStart().split(/\s+/)
    const last = words[words.length - 1]
    // Complete a file path after a command (except theme, whose args are in `completions`).
    const shown = words.length > 1 && words[0] !== 'theme' ? completePath(cwd, last) : complete(input, completions)
    const head = words.length > 1 && words[0] !== 'theme' ? input.slice(0, input.length - last.length) : ''
    if (!shown.length) return
    if (shown.length === 1) {
      // Unique match: finish it; add a space unless it's a folder, like bash.
      return setInput(head + shown[0] + (shown[0].endsWith('/') ? '' : ' '))
    }
    const prefix = commonPrefix(shown.map((s) => head + s))
    if (prefix.length > input.trimStart().length) setInput(prefix)
    // Nothing more to fill in: the second Tab in a row lists the options.
    else if (lastTab.current === input) print(input, <p class="muted">{shown.join('   ')}</p>)
    lastTab.current = input
  }

  const onKeyDown = (e: KeyboardEvent & { currentTarget: HTMLInputElement }) => {
    const leaving = escaped.current
    escaped.current = e.key === 'Escape'
    // Only two Tabs in a row list options; any other key starts over.
    if (e.key !== 'Tab') lastTab.current = null
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const i = Math.min(history.length, Math.max(0, cursor + (e.key === 'ArrowUp' ? -1 : 1)))
      setCursor(i)
      setInput(history[i] ?? '')
    } else if (e.key === 'Tab' && !e.shiftKey && !leaving) {
      // Tab completes, like a real shell. Keyboard users leave with Esc then Tab (announced in #hint),
      // so focus is never trapped. Shift+Tab also moves focus normally.
      e.preventDefault()
      if (input.trim()) tab() // empty line: Tab does nothing
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      setEntries([])
    } else if (e.key === 'c' && e.ctrlKey && e.currentTarget.selectionStart === e.currentTarget.selectionEnd) {
      // Interrupt: drop the line, like ^C in a shell. Selected text still copies.
      e.preventDefault()
      print(input + '^C', null)
      setInput('')
    } else if (e.key === 'u' && e.ctrlKey) {
      e.preventDefault()
      setInput('')
    }
  }

  const onClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    const cmd = target.closest<HTMLElement>('[data-cmd]')?.dataset.cmd
    if (cmd) return exec(cmd)
    // Clicking the terminal focuses the prompt, unless the user is selecting text or following a link.
    if (!target.closest('a, button') && !getSelection()?.toString()) inputRef.current?.focus()
  }

  return (
    <main ref={termRef} class={`term ${power} ${minimized ? 'min' : ''}`} onClick={onClick}>
      <header class="bar">
        {config.layout === 'full' ? (
          <div class="status">
            <button
              type="button"
              class="icon"
              aria-label="Shut down"
              title="Shut down"
              disabled={power !== 'on'}
              onClick={() => exec('shutdown')}
            >
              ⏻
            </button>
            <span class="muted hide-narrow">
              {config.user}@{config.host}
            </span>
          </div>
        ) : (
          <div class="controls">
            <button
              type="button"
              class="ctl close"
              aria-label="Shut down"
              title="Shut down"
              disabled={power !== 'on'}
              onClick={() => exec('shutdown')}
            />
            <button
              type="button"
              class="ctl min"
              aria-label={minimized ? 'Restore' : 'Minimize'}
              title={minimized ? 'Restore' : 'Minimize'}
              aria-expanded={!minimized}
              onClick={() => setMinimized((m) => !m)}
            />
            {document.fullscreenEnabled && (
              <button
                type="button"
                class="ctl full"
                aria-label="Toggle full screen"
                title="Full screen"
                onClick={toggleFullscreen}
              />
            )}
          </div>
        )}
        <h1>
          {config.name} — {config.title}
        </h1>
        {config.layout === 'full' && (
          <div class="status end">
            <Clock />
            {document.fullscreenEnabled && (
              <button
                type="button"
                class="icon"
                aria-label="Toggle full screen"
                title="Full screen"
                onClick={toggleFullscreen}
              >
                ⛶
              </button>
            )}
          </div>
        )}
      </header>

      <div class="screen">
        {power === 'off' && (
          <div class="off-screen">
            <button ref={powerRef} type="button" class="power" onClick={() => setPower('booting')}>
              <span aria-hidden="true">⏻</span> Power on
            </button>
          </div>
        )}
        {power === 'booting' && (
          <pre class="plain boot" aria-live="polite">
            {BOOT.slice(0, booted).map((l) =>
              l.startsWith('[  OK  ]') ? (
                <>
                  {'[  '}
                  <span class="accent">OK</span>
                  {'  ]'}
                  {l.slice(8)}
                  {'\n'}
                </>
              ) : (
                l + '\n'
              ),
            )}
          </pre>
        )}
        {power === 'on' && (
          <>
            <div class="log" role="log" aria-live="polite">
              {entries.map((e) => (
                <section key={e.id} class="entry">
                  {e.cmd !== null && (
                    <p>
                      <span class="prompt">{e.prompt}</span> {e.cmd}
                    </p>
                  )}
                  {e.out}
                </section>
              ))}
            </div>

            <form
              class="input-line"
              onSubmit={(e) => {
                e.preventDefault()
                exec(input)
              }}
            >
              <label for="cmd" class="prompt">
                {prompt}
              </label>
              <input
                id="cmd"
                ref={inputRef}
                value={input}
                onInput={(e) => setInput(e.currentTarget.value)}
                onKeyDown={onKeyDown}
                autocomplete="off"
                autocapitalize="off"
                autocorrect="off"
                spellcheck={false}
                enterKeyHint="go"
                aria-describedby="hint"
              />
            </form>
          </>
        )}
        <div ref={endRef} />
      </div>

      <nav class="chips" aria-label="Suggested commands" hidden={power !== 'on'}>
        {CHIPS.map((c) => (
          <button key={c} type="button" data-cmd={c}>
            {c}
          </button>
        ))}
      </nav>
      <p id="hint" class="sr-only">
        Type a command and press Enter. Tab autocompletes commands and file names, arrow keys browse history. To leave
        the terminal, press Escape, then Tab.
      </p>
    </main>
  )
}
