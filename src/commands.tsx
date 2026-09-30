import type { ComponentChildren } from 'preact'
import config from '../portfolio.config.ts'
import { BINARY, bin, display, lookup, resolve, tree, walk, type FsNode } from './fs.ts'
import { dieFace, Matrix, RPS, rpsResult, TicTacToe, type Rps } from './games.tsx'
import { closest, tokenize } from './shell.ts'
import { applyTheme, currentTheme, isTheme } from './theme.ts'
import { THEMES } from './types.ts'
import { Banner, Cmd, Err, escapeRe, Ext, highlight, linkify, Pre, pretty, reducedMotion } from './ui.tsx'

export interface Ctx {
  history: string[]
  cwd: string[]
  cd(segs: string[]): void
  clear(): void
  power(action: 'off' | 'reboot'): void
}

interface Command {
  desc: string
  /** Easter eggs: left out of help and autocomplete. */
  hidden?: boolean
  run(args: string[], ctx: Ctx): ComponentChildren
}

/** A file or folder in ls output: folders open, files print, binaries run. */
const FsEntry = ({ name, node, path }: { name: string; node: FsNode; path: string }) =>
  'dir' in node ? (
    <Cmd name={`cd ${path} && ls`} label={`${name}/`} class="dir" />
  ) : node.file.startsWith(BINARY) ? (
    <Cmd name={name} class="bin" />
  ) : (
    <Cmd name={`cat ${path}`} label={name} class="file" />
  )

const bootedAt = Date.now()
const env: Record<string, string> = {
  USER: config.user,
  HOME: `/home/${config.user}`,
  HOSTNAME: config.host,
  SHELL: '/bin/psh',
}

const LOGO = String.raw`
  .--------------.
  | >_           |
  |              |
  |              |
  '--------------'
     _|______|_
`.slice(1)

const readOnly = (name: string): Command => ({
  desc: '',
  hidden: true,
  run: () => <Err>{name}: Read-only file system</Err>,
})

const HELP_GROUPS: [string, string[]][] = [
  ['Portfolio', ['about', 'experience', 'projects', 'skills', 'contact']],
  ['Files', ['ls', 'cd', 'pwd', 'cat', 'tree', 'grep']],
  ['System', ['help', 'man', 'which', 'whoami', 'hostname', 'echo', 'date', 'uname', 'neofetch', 'history', 'clear']],
  ['Look & power', ['theme', 'banner', 'shutdown', 'reboot']],
  ['Fun', ['matrix', 'tictactoe', 'rps', 'roll', 'flip']],
]

export const commands: Record<string, Command> = {
  help: {
    desc: 'List available commands',
    run: () => {
      const listed = HELP_GROUPS.flatMap(([, names]) => names)
      // Commands you add yourself show up under "Other" until you put them in a group.
      const groups = [
        ...HELP_GROUPS,
        ['Other', visibleCommands.filter((n) => !listed.includes(n))] as [string, string[]],
      ]
      return (
        <>
          {groups
            .filter(([, names]) => names.length)
            .map(([title, names]) => (
              <section key={title} class="help-group">
                <p class="muted">{title}</p>
                <dl class="grid">
                  {names.map((name) => (
                    <>
                      <dt>
                        <Cmd name={name} />
                      </dt>
                      <dd>{commands[name].desc}</dd>
                    </>
                  ))}
                </dl>
              </section>
            ))}
        </>
      )
    },
  },

  // Portfolio shortcuts
  about: {
    desc: 'Who I am',
    run: () => (
      <>
        <p class="accent">{config.name}</p>
        <p class="muted">{config.title}</p>
        <Pre>{config.about}</Pre>
      </>
    ),
  },
  projects: {
    desc: 'Things I have built',
    run: () => (
      <ul class="list">
        {config.projects.map((p) => (
          <li key={p.name}>
            {p.url ? <Ext href={p.url}>{p.name}</Ext> : <span class="accent">{p.name}</span>} — {p.desc}
            {p.tags?.length ? <span class="muted"> [{p.tags.join(', ')}]</span> : null}
            {p.repo && (
              <>
                {' '}
                <Ext href={p.repo}>source</Ext>
              </>
            )}
          </li>
        ))}
      </ul>
    ),
  },
  experience: {
    desc: 'Where I have worked',
    run: () =>
      config.experience.length ? (
        <ol class="list plain-list">
          {config.experience.map((e) => (
            <li key={e.company + e.date} class="job">
              <p>
                <span class="muted job-date">{e.date.padEnd(13)}</span>
                <span class="accent">{e.company}</span> · {e.role}
              </p>
              {e.desc && <p class="job-desc">{e.desc}</p>}
              {e.stack?.length ? <p class="job-desc muted">{e.stack.join(', ')}</p> : null}
            </li>
          ))}
        </ol>
      ) : (
        <p class="muted">No experience listed.</p>
      ),
  },
  skills: {
    desc: 'What I work with',
    run: () => (
      <dl class="grid">
        {Object.entries(config.skills).map(([group, items]) => (
          <>
            <dt class="accent">{group}</dt>
            <dd>{items.join(' · ')}</dd>
          </>
        ))}
      </dl>
    ),
  },
  contact: {
    desc: 'How to reach me',
    run: () => (
      <dl class="grid">
        {config.links.map((l) => (
          <>
            <dt class="accent">{l.label}</dt>
            <dd>
              <Ext href={l.url}>{pretty(l.url)}</Ext>
            </dd>
          </>
        ))}
      </dl>
    ),
  },

  // Unix
  ls: {
    desc: 'List files (-a hidden, -l details)',
    run: (args, { cwd }) => {
      const flags = args.filter((a) => a.startsWith('-')).join('')
      const target = args.find((a) => !a.startsWith('-'))
      const segs = resolve(cwd, target)
      const node = lookup(segs)
      if (!node) return <Err>ls: {target}: No such file or directory</Err>
      if (!('dir' in node)) return <p>{target}</p>
      const items = Object.entries(node.dir)
        .filter(([n]) => flags.includes('a') || !n.startsWith('.'))
        .map(([name, child]) => ({ name, child, path: display([...segs, name]) }))
      if (!flags.includes('l')) {
        return (
          <p class="ls">
            {items.map((i) => (
              <FsEntry key={i.name} name={i.name} node={i.child} path={i.path} />
            ))}
          </p>
        )
      }
      const date = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
      return (
        <div>
          {items.map(({ name, child, path }) => {
            const dir = 'dir' in child
            const size = String(dir ? 4096 : child.file.length).padStart(5)
            return (
              <p key={name}>
                <span class="muted pre-inline">
                  {dir ? 'drwxr-xr-x' : '-rw-r--r--'}
                  <span class="hide-narrow"> {config.user}</span> {size}
                  <span class="hide-narrow"> {date}</span>{' '}
                </span>
                <FsEntry name={name} node={child} path={path} />
              </p>
            )
          })}
        </div>
      )
    },
  },
  cd: {
    desc: 'Change directory',
    run: ([target], ctx) => {
      const segs = resolve(ctx.cwd, target ?? '~')
      const node = lookup(segs)
      if (!node) return <Err>cd: no such file or directory: {target}</Err>
      if (!('dir' in node)) return <Err>cd: not a directory: {target}</Err>
      ctx.cd(segs)
      return null
    },
  },
  pwd: {
    desc: 'Print working directory',
    run: (_, { cwd }) => <p>/{cwd.join('/')}</p>,
  },
  cat: {
    desc: 'Print a file',
    run: (args, { cwd }) => {
      if (!args.length) return <Err>usage: cat {'<file>'}</Err>
      return args.map((a) => {
        const node = lookup(resolve(cwd, a))
        if (!node) return <Err>cat: {a}: No such file or directory</Err>
        if ('dir' in node) return <Err>cat: {a}: Is a directory</Err>
        if (node.file.startsWith(BINARY)) return <Err>cat: {a}: binary file (try running it)</Err>
        return <Pre>{linkify(node.file)}</Pre>
      })
    },
  },
  tree: {
    desc: 'Show folders as a tree',
    run: ([target], { cwd }) => {
      const segs = resolve(cwd, target)
      const node = lookup(segs)
      if (!node) return <Err>tree: {target}: No such file or directory</Err>
      return <pre class="plain">{[target ?? '.', ...tree(node)].join('\n')}</pre>
    },
  },
  grep: {
    desc: 'Search files: grep [-i] <text> [path]',
    run: (args, { cwd }) => {
      const [pattern, target] = args.filter((a) => !a.startsWith('-'))
      if (!pattern) return <Err>usage: grep [-i] {'<text>'} [path]</Err>
      const flags = args.includes('-i') ? 'i' : ''
      const segs = resolve(cwd, target)
      const node = lookup(segs)
      if (!node) return <Err>grep: {target}: No such file or directory</Err>
      const re = new RegExp(`(${escapeRe(pattern)})`, flags)
      return walk(node, display(segs)).flatMap(([path, text]) =>
        text
          .split('\n')
          .filter((l) => re.test(l))
          .map((l) => (
            <p>
              <Cmd name={`cat ${path}`} label={path} class="file" />
              <span class="muted">:</span>
              {highlight(l, new RegExp(re.source, flags + 'g'))}
            </p>
          )),
      )
    },
  },
  man: {
    desc: 'Show the manual for a command',
    run: ([name]) => {
      if (!name) return <p>What manual page do you want?</p>
      const c = Object.hasOwn(commands, name) ? commands[name] : undefined
      if (!c || c.hidden) return <Err>No manual entry for {name}</Err>
      return (
        <dl class="man">
          <dt class="accent">NAME</dt>
          <dd>
            {name} - {c.desc}
          </dd>
          <dt class="accent">FILE</dt>
          <dd>/bin/{name}</dd>
        </dl>
      )
    },
  },
  which: {
    desc: 'Locate a command',
    run: (args) => args.map((a) => (Object.hasOwn(commands, a) ? <p>/bin/{a}</p> : <Err>{a} not found</Err>)),
  },
  whoami: { desc: 'Print current user', run: () => <p>{config.user}</p> },
  hostname: { desc: 'Print machine name', run: () => <p>{config.host}</p> },
  echo: {
    desc: 'Print text ($USER, $HOME work)',
    run: (args) => <p>{args.join(' ').replace(/\$(\w+)/g, (_, k: string) => env[k] ?? '')}</p>,
  },
  date: { desc: 'Print date and time', run: () => <p>{new Date().toString()}</p> },
  uname: {
    desc: 'Print system info (-a for all)',
    run: (args) => <p>{args.includes('-a') ? `PortfolioOS ${config.host} 1.0.0 preact psh browser` : 'PortfolioOS'}</p>,
  },
  neofetch: {
    desc: 'System info, with style',
    run: () => {
      const mins = Math.floor((Date.now() - bootedAt) / 60000)
      const info: [string, string][] = [
        ['OS', 'PortfolioOS 1.0'],
        ['Host', config.name],
        ['Role', config.title],
        ['Shell', 'psh'],
        ['Theme', currentTheme()],
        ['Uptime', mins ? `${mins} min` : 'just booted'],
        ['Projects', String(config.projects.length)],
        ['Skills', String(Object.values(config.skills).flat().length)],
        ['Resolution', `${innerWidth}x${innerHeight}`],
      ]
      return (
        <div class="neofetch">
          <pre class="plain accent" aria-hidden="true">
            {LOGO}
          </pre>
          <div>
            <p class="accent">
              {config.user}@{config.host}
            </p>
            <p class="muted">{'-'.repeat(config.user.length + config.host.length + 1)}</p>
            {info.map(([k, v]) => (
              <p key={k}>
                <span class="accent">{k}:</span> {v}
              </p>
            ))}
            <p class="swatches" aria-hidden="true">
              {['fg', 'muted', 'accent', 'link', 'cmd', 'error'].map((c) => (
                <i key={c} style={{ background: `var(--${c})` }} />
              ))}
            </p>
          </div>
        </div>
      )
    },
  },
  theme: {
    desc: 'Change colors: theme <name>, or pick one',
    run: ([t]) => {
      if (isTheme(t)) {
        applyTheme(t)
        return <p class="muted">Theme set to {t}.</p>
      }
      const current = currentTheme()
      return (
        <>
          {t && <p class="error">Unknown theme: {t}</p>}
          <p class="muted">Usage: theme {'<name>'}. Or pick one:</p>
          <p class="themes">
            {THEMES.map((n) => (
              <button key={n} type="button" data-theme={n} data-cmd={`theme ${n}`} aria-current={n === current}>
                {['accent', 'link', 'cmd', 'error'].map((c) => (
                  <i key={c} aria-hidden="true" style={{ background: `var(--${c})` }} />
                ))}
                {n}
              </button>
            ))}
          </p>
        </>
      )
    },
  },
  history: {
    desc: 'Show previous commands',
    run: (_, { history }) => (
      <ol class="list">
        {history.map((h, i) => (
          <li key={i}>{h}</li>
        ))}
      </ol>
    ),
  },
  banner: {
    desc: 'Show the welcome banner',
    run: () => <Banner />,
  },
  shutdown: {
    desc: 'Power off the terminal',
    run: (_, { power }) => {
      power('off')
      return (
        <Pre>
          Broadcast message from {config.user}@{config.host}:{'\n'}The system is going down for poweroff NOW!
        </Pre>
      )
    },
  },
  reboot: {
    desc: 'Restart the terminal',
    run: (_, { power }) => {
      power('reboot')
      return (
        <Pre>
          Broadcast message from {config.user}@{config.host}:{'\n'}The system is going down for reboot NOW!
        </Pre>
      )
    },
  },
  matrix: {
    desc: 'Enter the Matrix (any key exits)',
    run: () =>
      reducedMotion() ? (
        <p class="muted">The Matrix is off because your system asks for reduced motion.</p>
      ) : (
        <Matrix />
      ),
  },
  tictactoe: { desc: 'Play tic-tac-toe against the computer', run: () => <TicTacToe /> },
  rps: {
    desc: 'Rock, paper, scissors: rps <rock|paper|scissors>',
    run: ([pick]) => {
      if (!RPS.includes(pick as Rps)) {
        return (
          <p>
            Pick one:{' '}
            {RPS.map((r) => (
              <>
                {' '}
                <Cmd key={r} name={`rps ${r}`} label={r} />
              </>
            ))}
          </p>
        )
      }
      const them = RPS[Math.floor(Math.random() * 3)]
      const result = rpsResult(pick as Rps, them)
      return (
        <p>
          You: {pick} · Computer: {them} —{' '}
          {result === 'win' ? (
            <span class="accent">You win!</span>
          ) : result === 'lose' ? (
            <span class="error">You lose.</span>
          ) : (
            'Draw.'
          )}{' '}
          <Cmd name={`rps ${pick}`} label="again" />
        </p>
      )
    },
  },
  roll: {
    desc: 'Roll a die: roll [sides]',
    run: ([n]) => {
      const sides = n === undefined ? 6 : Number(n)
      if (!Number.isInteger(sides) || sides < 2 || sides > 1000)
        return <Err>roll: sides must be a whole number from 2 to 1000</Err>
      const value = 1 + Math.floor(Math.random() * sides)
      return sides === 6 ? (
        <>
          <pre class="plain die" aria-hidden="true">
            {dieFace(value)}
          </pre>
          <p>You rolled a {value}.</p>
        </>
      ) : (
        <p>
          You rolled a {value} (d{sides}).
        </p>
      )
    },
  },
  flip: { desc: 'Flip a coin', run: () => <p>{Math.random() < 0.5 ? 'Heads' : 'Tails'}.</p> },
  clear: {
    desc: 'Clear the screen (Ctrl+L)',
    run: (_, { clear }) => {
      clear()
      return null
    },
  },

  // Easter eggs
  sudo: {
    desc: '',
    hidden: true,
    run: () => (
      <Pre>
        [sudo] password for {config.user}:{'\n'}
        {config.user} is not in the sudoers file. This incident will be reported.
      </Pre>
    ),
  },
  rm: {
    desc: '',
    hidden: true,
    run: (args) =>
      args.some((a) => /^-\w*r/.test(a)) && args.includes('/') ? (
        <Pre>
          rm: removing /bin...{'\n'}rm: removing /home...{'\n'}rm: removing /usr...{'\n'}
          <span class="accent">Just kidding. Nothing was deleted. Nice try though.</span>
        </Pre>
      ) : (
        <Err>rm: cannot remove: Read-only file system</Err>
      ),
  },
  poweroff: { desc: '', hidden: true, run: (args, ctx) => commands.shutdown.run(args, ctx) },
  touch: readOnly('touch'),
  mkdir: readOnly('mkdir'),
  mv: readOnly('mv'),
  cp: readOnly('cp'),
  exit: { desc: '', hidden: true, run: () => <Pre>logout{'\n'}There is no escape. Try clear instead.</Pre> },
  vim: { desc: '', hidden: true, run: () => <p>You are now stuck in vim forever. (Hint: :q)</p> },
  ':q': { desc: '', hidden: true, run: () => <p class="accent">Congratulations, you exited vim.</p> },
  cowsay: {
    desc: '',
    hidden: true,
    run: (args) => {
      const msg = args.join(' ') || 'moo'
      const bar = (c: string) => ' ' + c.repeat(msg.length + 2)
      return (
        <pre class="plain">
          {`${bar('_')}\n< ${msg} >\n${bar('-')}\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||`}
        </pre>
      )
    },
  },
}

/** Commands shown in help, /bin, Tab and "did you mean" (easter eggs stay hidden). */
const visibleCommands = Object.keys(commands).filter((n) => !commands[n].hidden)

/** Everything Tab can complete a command name to. */
export const completions = [...visibleCommands, ...THEMES.map((t) => `theme ${t}`)]

for (const name of visibleCommands) bin.dir[name] = { file: BINARY }

function runOne(line: string, ctx: Ctx): ComponentChildren {
  const [raw, ...args] = tokenize(line)
  if (!raw) return null
  const name = raw.toLowerCase()
  if (Object.hasOwn(commands, name)) return commands[name].run(args, ctx)
  const suggestion = closest(name, visibleCommands)
  return (
    <p>
      <span class="error">psh: command not found: {raw}.</span>{' '}
      {suggestion ? (
        <>
          Did you mean <Cmd name={suggestion} />?
        </>
      ) : (
        <>
          Try <Cmd name="help" />.
        </>
      )}
    </p>
  )
}

/** Runs a line; `a && b` runs both in order, sharing cwd changes through ctx. */
export const run = (line: string, ctx: Ctx) => line.split('&&').map((part) => runOne(part, ctx))
