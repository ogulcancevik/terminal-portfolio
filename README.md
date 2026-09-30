# terminal-portfolio

A personal portfolio that behaves like a Unix terminal. Fork it, edit one file, deploy anywhere. No backend, no database, ~12 KB gzipped.

## Features

- A virtual file system built from your config: `/home/<user>` holds `about.txt`, `experience/`, `projects/`, `skills/`, plus `/bin`, `/etc`, `/tmp`
- Unix commands: `ls [-la]`, `cd`, `pwd`, `cat`, `tree`, `grep [-i]`, `man`, `which`, `echo $USER`, `whoami`, `hostname`, `uname -a`, `date`, `neofetch`
- Portfolio shortcuts: `about`, `experience`, `projects`, `skills`, `contact`, `theme`
- Shell feel: Tab completes commands and paths (double Tab lists options), ↑/↓ history, `!!` / `!n`, `a && b`, quoted args, Ctrl+C / Ctrl+U / Ctrl+L
- Big ASCII-art name banner, generated at build time with figlet (zero runtime cost)
- Working window buttons: shut down (with a fake boot sequence on power-on), minimize, full screen; also `shutdown` / `reboot` commands
- Two layouts: a floating `window`, or `full` screen with a status bar, clock and power button
- Fun: `matrix` rain, `tictactoe`, `rps`, `roll`, `flip`
- Easter eggs for the curious (try `sudo`)
- Clickable command buttons for visitors who don't want to type (and for phones)
- 11 themes: Dracula, Catppuccin, Tokyo Night, Nord, Gruvbox, One Dark, Monokai, Rosé Pine, Solarized, GitHub Light and a green-phosphor `retro`. Type `theme` for a live preview picker; the choice is remembered per visitor
- Accessible: real input with label, `role="log"` live output, visible focus, no keyboard traps
- SEO: title, description and a no-JS copy of your content are generated from your config at build time

## Quick start

```bash
# 1. Fork this repo on GitHub, then:
git clone https://github.com/<you>/terminal-portfolio.git
cd terminal-portfolio
npm install
npm run dev
```

## Make it yours

Edit **`portfolio.config.ts`**. That's the only file you need to touch.

| Field      | What it is                                                  |
| ---------- | ----------------------------------------------------------- |
| `name`     | Your name                                                   |
| `title`    | Job title / tagline                                         |
| `about`    | A few lines about you; line breaks are kept                 |
| `experience` | `{ company, role, date, desc?, stack? }[]`, newest first (`[]` to hide) |
| `projects` | `{ name, desc, url?, repo?, tags? }[]`; `url` is the live site, `repo` the source |
| `skills`   | Groups of skills, e.g. `{ Languages: ['Go', 'TypeScript'] }` |
| `links`    | `{ label, url }[]`; use `mailto:` for email                 |
| `boot`     | Play the boot sequence on page load (skippable with any key or click) |
| `layout`   | `'window'` (floating window) or `'full'` (edge to edge, status bar + clock) |
| `theme`    | Default theme, e.g. `dracula`, `nord`, `github-light` (see `THEMES` in `src/types.ts`) |
| `banner`   | Text drawn as big ASCII art on load, e.g. your name (`''` to skip) |
| `welcome`  | Command run on page load (`''` to skip)                     |
| `user`     | Username in the prompt and home folder (`/home/<user>`)      |
| `host`     | Machine name in the prompt: `user@host:~$`                  |

The file is type-checked, so your editor autocompletes fields and flags typos.

### Add a command

Add an entry to `commands` in `src/commands.tsx`:

```tsx
blog: {
  desc: 'Read my blog',
  run: () => <a href="https://example.com/blog">example.com/blog</a>,
},
```

It appears in `help` (under "Other" until you add it to `HELP_GROUPS`), `/bin` and autocomplete automatically. Set `hidden: true` for an easter egg. To show it as a button, add it to `CHIPS` in `src/Terminal.tsx`.

### Add a file

Files in the virtual file system are generated in `src/fs.ts`. Add an entry to `home`, e.g. `'resume.txt': { file: '...' }`.

### Add a theme

Copy a `[data-theme='…']` block in `src/style.css`, rename it, and add the name to `THEMES` in `src/types.ts`.

## Deploy

The build output is a static `dist/` folder, so any static host works.

**Netlify** (configured): in Netlify, *Add new site → Import an existing project* and pick the repo. `netlify.toml` sets everything: build command (tests, then build), publish folder, Node version, long-term caching for hashed assets, and security headers. Every push to `main` deploys.

**GitHub Pages**: `.github/workflows/deploy.yml` is included but only runs when triggered by hand. See the comment at its top to deploy on every push.

**Vercel / Cloudflare Pages**: import the repo; build command `npm run build`, output directory `dist`.

## Scripts

| Command           | Does                           |
| ----------------- | ------------------------------ |
| `npm run dev`     | Dev server with hot reload     |
| `npm test`        | Run tests                      |
| `npm run build`   | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build     |

## License

MIT
