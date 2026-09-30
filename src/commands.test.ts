import { describe, expect, it, vi } from 'vitest'
import { completions, run, type Ctx } from './commands.tsx'
import { completePath, HOME } from './fs.ts'

const ctx = (): Ctx => {
  const c: Ctx = { history: [], cwd: HOME, cd: (s) => (c.cwd = s), clear: vi.fn(), power: vi.fn() }
  return c
}

describe('run', () => {
  it('shutdown and reboot ask the terminal to power off', () => {
    const c = ctx()
    run('shutdown && reboot', c)
    expect(c.power).toHaveBeenNthCalledWith(1, 'off')
    expect(c.power).toHaveBeenNthCalledWith(2, 'reboot')
  })

  it('clear calls ctx.clear', () => {
    const c = ctx()
    expect(run('clear', c)).toEqual([null])
    expect(c.clear).toHaveBeenCalled()
  })

  it('cd changes cwd, && chains with the new cwd', () => {
    const c = ctx()
    run('cd projects && cd ..', c)
    expect(c.cwd).toEqual(HOME)
    run('cd about.txt', c)
    expect(c.cwd).toEqual(HOME)
    run('cd /home', c)
    expect(c.cwd).toEqual(['home'])
    run('cd', c)
    expect(c.cwd).toEqual(HOME)
  })

  it('unknown commands (including prototype keys) are rejected', () => {
    for (const cmd of ['nope', 'constructor']) {
      expect(JSON.stringify(run(cmd, ctx()))).toContain('command not found')
    }
  })

  it('greps files', () => {
    expect(run('grep -i OFFLINE', ctx())[0]).toHaveLength(1)
    expect(run('grep zzz-none', ctx())[0]).toEqual([])
  })
})

describe('command list', () => {
  it('offers visible commands and theme names to Tab, but not easter eggs', () => {
    expect(completions).toContain('projects')
    expect(completions).toContain('theme dracula')
    expect(completions).not.toContain('sudo')
  })

  it('puts visible commands in /bin', () => {
    expect(completePath(HOME, '/bin/gr')).toEqual(['/bin/grep'])
    expect(completePath(HOME, '/bin/su')).toEqual([])
  })
})
