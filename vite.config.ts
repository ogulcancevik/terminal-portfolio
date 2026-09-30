import preact from '@preact/preset-vite'
import figlet from 'figlet'
import { defineConfig } from 'vite'
import config from './portfolio.config.ts'

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
const link = (url: string, text: string) => `<a href="${esc(url)}">${esc(text)}</a>`

// Title, description and a no-JS copy of the content come from the config, so crawlers see them.
const head = `<title>${esc(`${config.name} — ${config.title}`)}</title>
    <meta name="description" content="${esc(config.about.split('\n')[0].slice(0, 160))}" />`

const noscript = `<noscript>
      <h1>${esc(config.name)}</h1>
      <p>${esc(config.title)}</p>
      <p>${esc(config.about)}</p>
      <h2>Experience</h2>
      <ul>${config.experience.map((e) => `<li>${esc(e.role)} at ${esc(e.company)} (${esc(e.date)})${e.desc ? ': ' + esc(e.desc) : ''}</li>`).join('')}</ul>
      <h2>Projects</h2>
      <ul>${config.projects.map((p) => `<li>${p.url ? link(p.url, p.name) : esc(p.name)}: ${esc(p.desc)}</li>`).join('')}</ul>
      <h2>Skills</h2>
      <ul>${Object.entries(config.skills)
        .map(([g, s]) => `<li>${esc(g)}: ${esc(s.join(', '))}</li>`)
        .join('')}</ul>
      <h2>Contact</h2>
      <ul>${config.links.map((l) => `<li>${link(l.url, l.label)}</li>`).join('')}</ul>
    </noscript>`

// Big ASCII-art name, rendered at build time so visitors don't download figlet.
// Browse fonts: https://patorjk.com/software/taag/
const banner = config.banner
  ? figlet
      .textSync(config.banner, { font: 'ANSI Shadow' })
      .split('\n')
      .map((l) => l.trimEnd())
      .join('\n')
      .trimEnd()
  : ''

export default defineConfig({
  base: './', // works on any subpath, e.g. GitHub Pages project sites
  define: { __BANNER__: JSON.stringify(banner) },
  plugins: [
    preact(),
    {
      name: 'portfolio-html',
      transformIndexHtml: (html) =>
        html.replace('<!--portfolio:head-->', head).replace('<!--portfolio:noscript-->', noscript),
    },
  ],
})
