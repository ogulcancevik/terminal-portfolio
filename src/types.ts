export const THEMES = [
  'dracula',
  'catppuccin',
  'tokyo-night',
  'nord',
  'gruvbox',
  'one-dark',
  'monokai',
  'rose-pine',
  'solarized',
  'github-light',
  'retro',
] as const
export type ThemeName = (typeof THEMES)[number]

export interface Project {
  name: string
  desc: string
  /** Live site */
  url?: string
  /** Source code */
  repo?: string
  tags?: string[]
}

export interface Experience {
  company: string
  role: string
  /** Free text, e.g. '2021 - 2023' or 'Present' */
  date: string
  desc?: string
  stack?: string[]
}

export interface Link {
  label: string
  url: string
}

export interface PortfolioConfig {
  name: string
  title: string
  /** Line breaks are kept. */
  about: string
  /** Newest first. Empty array to hide the experience command. */
  experience: Experience[]
  projects: Project[]
  /** Group name -> skills, e.g. { Languages: ['TypeScript', 'Go'] } */
  skills: Record<string, string[]>
  links: Link[]
  /** Play the boot sequence when the page opens (visitors can skip it with any key or click). */
  boot: boolean
  /** 'window': a floating terminal window. 'full': edge-to-edge with a status bar and clock. */
  layout: 'window' | 'full'
  /** Default theme; visitors can switch with `theme <name>`. */
  theme: ThemeName
  /** Text drawn as big ASCII art at the top, e.g. your name. Empty string to skip. */
  banner: string
  /** Command run on page load. Empty string to skip. */
  welcome: string
  /** Unix username: shown in the prompt and used as the home folder, e.g. /home/visitor */
  user: string
  /** Machine name shown in the prompt: user@host:~$ */
  host: string
}

declare global {
  /** config.banner as ASCII art, injected by vite.config.ts. */
  const __BANNER__: string
}
