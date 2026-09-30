import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import config from '../portfolio.config.ts'
import { completions, run, type Ctx } from './commands.tsx'
import { commonPrefix, complete, expandHistory } from './shell.ts'
import { currentTheme } from './theme.ts'
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

type Power = 'on' | 'off' | 'booting' | 'shutting-down'

/** One console line: text, pause after it (ms), and whether it overwrites the previous line (for counters). */
type BootStep = [text: string, delay: number, replace?: boolean]

const ts = (t: number) => `[${t.toFixed(6).padStart(12)}]`
const ok = (text: string, delay = 90): BootStep => [`[  OK  ] ${text}`, delay]

/** Built at each boot so it reflects the visitor's current theme. */
const bootSteps = (): BootStep[] => [
  // BIOS
  [`PortfolioBIOS v1.0, (C) ${new Date().getFullYear()} ${config.name}`, 250],
  ['CPU: Curiosity Core @ 3.00 GHz', 150],
  ...[1024, 2048, 4096, 8192].map((mb, i): BootStep => [`Memory test: ${mb} MB`, 70, i > 0]),
  ['Memory test: 16384 MB OK', 250, true],
  ['Detecting drives...', 450],
  ['  /dev/portfolio  PortfolioSSD 512GB', 150],
  ['Booting from /dev/portfolio...', 400],
  ['', 60],
  // Kernel
  [`${ts(0)} PortfolioOS kernel 1.0.0 (psh@${config.host}) #1 SMP PREEMPT`, 40],
  [`${ts(0)} Command line: root=/dev/portfolio ro quiet`, 40],
  [`${ts(0.012345)} Memory: 16384MB available`, 40],
  [`${ts(0.104211)} CPU0: Curiosity Core @ 3.00 GHz`, 40],
  [`${ts(0.231009)} portfolio: found ${config.projects.length} projects, ${config.experience.length} jobs`, 40],
  [`${ts(0.412887)} EXT4-fs (portfolio): mounted filesystem with ordered data mode`, 200],
  ['', 60],
  // Services
  ['PortfolioOS 1.0 (tty1)', 250],
  ['', 60],
  ok('Started Kernel Logging Service.'),
  ok('Started Load Kernel Modules.', 60),
  ok(`Mounted /home/${config.user}.`, 120),
  ok(`Loaded ${config.projects.length} projects.`, 160),
  ok(`Loaded ${Object.values(config.skills).flat().length} skills.`, 80),
  ok(`Started Theme Manager (${currentTheme()}).`, 110),
  ok('Started Network Manager.', 220),
  ok('Reached target Network.', 160),
  ok('Started psh, the portfolio shell.', 100),
  ok('Reached target Graphical Interface.', 300),
  ['', 60],
  [`${config.host} login: ${config.user} (automatic login)`, 1500],
]

/** The boot log in reverse: services stop, the disk unmounts, the machine powers down or restarts. */
const shutdownSteps = (reboot: boolean): BootStep[] => [
  ok('Stopped target Graphical Interface.', 140),
  ok('Stopped psh, the portfolio shell.', 110),
  ok(`Stopped Theme Manager (${currentTheme()}).`, 90),
  ok('Stopped Network Manager.', 180),
  ok('Stopped target Network.', 70),
  ok(`Unmounted /home/${config.user}.`, 160),
  ok('Reached target Unmount All Filesystems.', 120),
  ok(reboot ? 'Reached target System Reboot.' : 'Reached target System Power Off.', 250),
  [`${ts(4.213377)} reboot: ${reboot ? 'Restarting system' : 'Power down'}`, 700],
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
    const ctx: Ctx = {
      history: [],
      cwd: HOME,
      cd() {},
      clear() {},
      power() {},
    }
    entries.push({
      id: seq++,
      prompt: promptFor(HOME),
      cmd: config.welcome,
      out: run(config.welcome, ctx),
    })
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
        {now.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })}{' '}
      </span>
      {now.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })}
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
  const [bootLines, setBootLines] = useState<string[]>([])
  const bootRef = useRef<HTMLPreElement>(null)
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
    if (powerAction) setTimeout(() => powerDown(powerAction === 'reboot'), reducedMotion() ? 0 : 600)
  }

  const rebooting = useRef(false)
  const powerDown = (reboot: boolean) => {
    rebooting.current = reboot
    setPower('shutting-down')
  }

  // Boot and shutdown: reveal the console log line by line, then move to the next power state.
  // Any key or click skips ahead.
  useEffect(() => {
    if (power !== 'booting' && power !== 'shutting-down') return
    let timer = 0
    const done =
      power === 'booting'
        ? () => {
            setEntries(freshScreen())
            setHistory([])
            setCursor(0)
            setCwd(HOME)
            setInput('')
            setPower('on')
          }
        : () => setPower(rebooting.current ? 'booting' : 'off')
    // Each line waits its own time, so the log stutters like real hardware.
    const steps = power === 'booting' ? bootSteps() : shutdownSteps(rebooting.current)
    let i = 0
    const next = () => {
      if (i === steps.length) return done()
      const [text, delay, replace] = steps[i++]
      setBootLines((lines) => [...(replace ? lines.slice(0, -1) : lines), text])
      timer = setTimeout(next, reducedMotion() ? 0 : delay)
    }
    setBootLines([])
    next()
    const skip = (e: Event) => {
      e.preventDefault()
      done()
    }
    addEventListener('keydown', skip)
    addEventListener('click', skip)
    return () => {
      clearTimeout(timer)
      removeEventListener('keydown', skip)
      removeEventListener('click', skip)
    }
  }, [power])

  useEffect(() => {
    // Every state but 'on' paints the whole page black (see styles/power.css).
    document.documentElement.dataset.power = power
    if (power === 'on' && mouse()) inputRef.current?.focus()
    if (power === 'off') powerRef.current?.focus()
  }, [power])

  const toggleFullscreen = () =>
    document.fullscreenElement ? document.exitFullscreen() : termRef.current?.requestFullscreen()

  const print = (cmd: string, out: ComponentChildren) => setEntries((e) => [...e, { id: seq++, prompt, cmd, out }])

  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [entries])
  // Boot log sticks to the bottom once it outgrows the screen, like a console.
  useEffect(() => bootRef.current?.scrollTo(0, bootRef.current.scrollHeight), [bootLines])

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
    <>
      {/* inert: while off or booting, nothing on the desktop can be focused or clicked. */}
      <div class={`desktop ${power}`} inert={power !== 'on'}>
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
                  // iOS doesn't shrink the page for the keyboard; bring the prompt back into view.
                  onFocus={() => setTimeout(() => endRef.current?.scrollIntoView({ block: 'end' }), 300)}
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
            <div ref={endRef} />
          </div>

          <nav class="chips" aria-label="Suggested commands">
            {CHIPS.map((c) => (
              <button key={c} type="button" data-cmd={c}>
                {c}
              </button>
            ))}
          </nav>
          <p id="hint" class="sr-only">
            Type a command and press Enter. Tab autocompletes commands and file names, arrow keys browse history. To
            leave the terminal, press Escape, then Tab.
          </p>
        </main>
      </div>

      {/* Full-screen power states, drawn over the whole page like a monitor. */}
      {power === 'off' && (
        <div class="power-screen off">
          <button ref={powerRef} type="button" class="power" onClick={() => setPower('booting')}>
            <span aria-hidden="true">⏻</span> Power on
          </button>
        </div>
      )}
      {(power === 'booting' || power === 'shutting-down') && (
        <div class="power-screen console">
          <p class="sr-only" role="status">
            {power === 'booting' ? 'Starting up.' : 'Shutting down.'} Press any key to skip.
          </p>
          <pre ref={bootRef} class="plain boot-log" aria-hidden="true">
            {bootLines.map((l) =>
              l.startsWith('[  OK  ]') ? (
                <>
                  {'[  '}
                  <span class="ok">OK</span>
                  {'  ]'}
                  {l.slice(8)}
                  {'\n'}
                </>
              ) : (
                l + '\n'
              ),
            )}
          </pre>
          <p class="boot-skip" aria-hidden="true">
            Press any key to skip
          </p>
        </div>
      )}
    </>
  )
}
