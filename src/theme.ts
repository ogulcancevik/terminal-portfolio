// Colour theme: applied as <html data-theme>, remembered per visitor.
import config from '../portfolio.config.ts'
import { THEMES, type ThemeName } from './types.ts'

const THEME_KEY = 'theme'
export const isTheme = (t: unknown): t is ThemeName => THEMES.includes(t as ThemeName)

export function savedTheme(): ThemeName {
  try {
    const t = localStorage.getItem(THEME_KEY)
    if (isTheme(t)) return t
  } catch {}
  return config.theme
}

export function applyTheme(t: ThemeName) {
  document.documentElement.dataset.theme = t
  try {
    localStorage.setItem(THEME_KEY, t)
  } catch {}
}

export const currentTheme = () => document.documentElement.dataset.theme ?? config.theme
