// Small building blocks shared by commands and the terminal.
import type { ComponentChildren } from 'preact'
import config from '../portfolio.config.ts'

/** Clickable command; Terminal handles clicks on any [data-cmd]. */
export const Cmd = ({ name, label = name, class: cls = '' }: { name: string; label?: string; class?: string }) => (
  <button type="button" class={`cmd ${cls}`} data-cmd={name}>
    {label}
  </button>
)

export const Ext = ({ href, children }: { href: string; children: ComponentChildren }) => (
  <a href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer">
    {children}
  </a>
)

export const Err = ({ children }: { children: ComponentChildren }) => <p class="error">{children}</p>
export const Pre = ({ children }: { children: ComponentChildren }) => <p class="pre">{children}</p>

/** Big ASCII-art name from config.banner (rendered at build time). */
export const Banner = () =>
  __BANNER__ ? (
    <>
      <pre
        class="plain banner accent"
        aria-hidden="true"
        style={{ '--cols': Math.max(...__BANNER__.split('\n').map((l) => l.length)) }}
      >
        {__BANNER__}
      </pre>
      <span class="sr-only">{config.banner}</span>
    </>
  ) : null

export const pretty = (url: string) => url.replace(/^(https?:\/\/|mailto:)/, '')

/** Turns URLs in plain text into links. */
export const linkify = (text: string) =>
  text.split(/((?:https?:\/\/|mailto:)\S+)/).map((part, i) => (i % 2 ? <Ext href={part}>{pretty(part)}</Ext> : part))

export const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Wraps matches of `re` (which must have one capture group) in <mark>. */
export const highlight = (text: string, re: RegExp) =>
  text.split(re).map((part, i) => (i % 2 ? <mark>{part}</mark> : part))

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
