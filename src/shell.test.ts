import { describe, expect, it } from 'vitest'
import { closest, commonPrefix, complete, expandHistory, tokenize } from './shell.ts'

describe('complete', () => {
  const words = ['projects', 'pwd', 'theme', 'theme dracula', 'theme nord']

  it('matches by prefix, ignoring case and leading space', () => {
    expect(complete('  PRO', words)).toEqual(['projects'])
    expect(complete('xyz', words)).toEqual([])
  })

  it('extends ambiguous input to the shared prefix', () => {
    expect(commonPrefix(complete('th', words))).toBe('theme')
    expect(commonPrefix(complete('theme d', words))).toBe('theme dracula')
    expect(commonPrefix([])).toBe('')
  })
})

describe('parsing', () => {
  it('tokenizes quotes', () => {
    expect(tokenize(`echo "a  b" 'c d' e`)).toEqual(['echo', 'a  b', 'c d', 'e'])
  })

  it('expands !! and !n', () => {
    expect(expandHistory('!!', ['ls', 'pwd'])).toBe('pwd')
    expect(expandHistory('!1', ['ls', 'pwd'])).toBe('ls')
    expect(expandHistory('!9', ['ls'])).toBeNull()
    expect(expandHistory('!!', [])).toBeNull()
    expect(expandHistory('ls', [])).toBe('ls')
  })
})

describe('did you mean', () => {
  const names = ['ls', 'cat', 'clear', 'projects', 'neofetch', 'help']

  it('suggests close commands, including swapped letters', () => {
    expect(closest('sl', names)).toBe('ls')
    expect(closest('cta', names)).toBe('cat')
    expect(closest('clera', names)).toBe('clear')
    expect(closest('projcets', names)).toBe('projects')
    expect(closest('neofecth', names)).toBe('neofetch')
  })

  it('stays quiet for unrelated input', () => {
    expect(closest('xz', names)).toBeUndefined()
    expect(closest('banana', names)).toBeUndefined()
  })
})
