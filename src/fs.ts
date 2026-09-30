// A read-only virtual file system generated from the config, for ls/cd/cat/tree.
import config from '../portfolio.config.ts'

export type FsNode = { dir: Record<string, FsNode> } | { file: string }

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const project = (p: (typeof config.projects)[number]) =>
  `# ${p.name}\n\n${p.desc}` +
  (p.url ? `\n\n${p.url}` : '') +
  (p.repo ? `\n${p.url ? '' : '\n'}source: ${p.repo}` : '') +
  (p.tags?.length ? `\ntags: ${p.tags.join(', ')}` : '')

const job = (e: (typeof config.experience)[number]) =>
  `# ${e.role} @ ${e.company}\n${e.date}` +
  (e.desc ? `\n\n${e.desc}` : '') +
  (e.stack?.length ? `\n\nstack: ${e.stack.join(', ')}` : '')

const home: FsNode = {
  dir: {
    'README.md': {
      file: `Welcome to ${config.name}'s portfolio.\n\nTry: ls, cd projects, cat about.txt, tree, neofetch\nType help for every command.`,
    },
    'about.txt': { file: `${config.name}\n${config.title}\n\n${config.about}` },
    'contact.txt': { file: config.links.map((l) => `${l.label}: ${l.url}`).join('\n') },
    ...(config.experience.length && {
      experience: {
        dir: Object.fromEntries(config.experience.map((e) => [`${slug(e.company)}.md`, { file: job(e) }])),
      },
    }),
    projects: { dir: Object.fromEntries(config.projects.map((p) => [`${slug(p.name)}.md`, { file: project(p) }])) },
    skills: {
      dir: Object.fromEntries(
        Object.entries(config.skills).map(([g, s]) => [`${slug(g)}.txt`, { file: s.join('\n') }]),
      ),
    },
    '.secret': { file: 'You found a hidden file. Curious minds make great engineers.' },
  },
}

/** Filled with one entry per command by commands.tsx. */
export const bin = { dir: {} as Record<string, FsNode> }

/** Marks /bin entries so cat and grep treat them as binaries. */
export const BINARY = '\0'

export const root: FsNode = {
  dir: {
    bin,
    etc: {
      dir: {
        hostname: { file: config.host },
        motd: { file: `Welcome to PortfolioOS. Type help to get started.` },
        'os-release': { file: 'NAME="PortfolioOS"\nVERSION="1.0"\nID=portfolioos\nPRETTY_NAME="PortfolioOS 1.0"' },
        passwd: {
          file: `root:x:0:0:root:/root:/bin/psh\n${config.user}:x:1000:1000:${config.name}:/home/${config.user}:/bin/psh`,
        },
      },
    },
    home: { dir: { [config.user]: home } },
    tmp: { dir: {} },
  },
}
export const HOME = ['home', config.user]

const TILDE = /^~(?=\/|$)/

/** Path string -> absolute segments. Handles /, ~, . and .. like a shell. */
export function resolve(cwd: string[], path = ''): string[] {
  const out = path.startsWith('/') ? [] : TILDE.test(path) ? [...HOME] : [...cwd]
  for (const part of path.replace(TILDE, '').split('/')) {
    if (part === '..') out.pop()
    else if (part && part !== '.') out.push(part)
  }
  return out
}

export function lookup(segs: string[]): FsNode | undefined {
  let node: FsNode | undefined = root
  for (const s of segs) node = node && 'dir' in node && Object.hasOwn(node.dir, s) ? node.dir[s] : undefined
  return node
}

/** Absolute segments -> path as shown in the prompt (~ for home). */
export function display(segs: string[]) {
  if (HOME.every((s, i) => segs[i] === s))
    return (
      '~' +
      segs
        .slice(HOME.length)
        .map((s) => '/' + s)
        .join('')
    )
  return '/' + segs.join('/')
}

/** Tab completion for the path being typed; dirs get a trailing slash. */
export function completePath(cwd: string[], partial: string): string[] {
  const i = partial.lastIndexOf('/') + 1
  const base = partial.slice(0, i)
  const prefix = partial.slice(i)
  const node = lookup(resolve(cwd, base))
  if (!node || !('dir' in node)) return []
  return Object.entries(node.dir)
    .filter(([n]) => n.startsWith(prefix) && (prefix.startsWith('.') || !n.startsWith('.')))
    .map(([n, c]) => base + n + ('dir' in c ? '/' : ''))
}

/** Every readable file under a node, as [path, text] pairs. Skips dotfiles and binaries. */
export function walk(node: FsNode, path: string): [string, string][] {
  if (!('dir' in node)) return node.file.startsWith(BINARY) ? [] : [[path, node.file]]
  return Object.entries(node.dir)
    .filter(([n]) => !n.startsWith('.'))
    .flatMap(([n, c]) => walk(c, path.endsWith('/') ? path + n : `${path}/${n}`))
}

/** `tree` output lines for a folder (hidden files skipped). */
export function tree(node: FsNode, prefix = ''): string[] {
  if (!('dir' in node)) return []
  const names = Object.keys(node.dir).filter((n) => !n.startsWith('.'))
  return names.flatMap((n, i) => {
    const last = i === names.length - 1
    const child = node.dir[n]
    const line = `${prefix}${last ? '└── ' : '├── '}${n}${'dir' in child ? '/' : ''}`
    return [line, ...tree(child, prefix + (last ? '    ' : '│   '))]
  })
}
