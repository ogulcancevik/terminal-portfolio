import { describe, expect, it } from 'vitest'
import { completePath, display, HOME, lookup, resolve, tree } from './fs.ts'

describe('fs', () => {
  it('resolves paths like a shell', () => {
    expect(resolve(HOME, 'projects/../skills')).toEqual([...HOME, 'skills'])
    expect(resolve(['x'], '~/projects')).toEqual([...HOME, 'projects'])
    expect(resolve(HOME, '/')).toEqual([])
    expect(resolve([], '../..')).toEqual([])
  })

  it('looks up nodes and shows ~ for home', () => {
    expect(lookup([...HOME, 'about.txt'])).toHaveProperty('file')
    expect(lookup([...HOME, 'nope'])).toBeUndefined()
    expect(lookup([...HOME, 'experience', 'hubx.md'])).toEqual({
      file: expect.stringContaining('# Frontend Developer @ HubX'),
    })
    expect(lookup([...HOME, 'constructor'])).toBeUndefined()
    expect(display([...HOME, 'projects'])).toBe('~/projects')
    expect(display(['home'])).toBe('/home')
  })

  it('completes paths, hiding dotfiles unless asked', () => {
    expect(completePath(HOME, 'proj')).toEqual(['projects/'])
    expect(completePath(HOME, 'projects/ti')).toEqual(['projects/tic-tac-toe.md'])
    expect(completePath(HOME, 'exp')).toEqual(['experience/'])
    expect(completePath(HOME, '')).not.toContain('.secret')
    expect(completePath(HOME, '.')).toEqual(['.secret'])
  })

  it('draws a tree without hidden files', () => {
    const lines = tree(lookup(HOME)!)
    expect(lines).toContain('├── projects/')
    expect(lines.at(-1)).toMatch(/^    └── /) // last child of the last folder
    expect(lines.join('\n')).not.toContain('.secret')
  })
})
