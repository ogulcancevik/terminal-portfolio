import { describe, expect, it } from 'vitest'
import { aiMove, dieFace, rpsResult, winner } from './games.tsx'

const board = (s: string) => [...s].map((c) => (c === '.' ? null : c)) as ('X' | 'O' | null)[]

describe('tic-tac-toe', () => {
  it('detects wins and draws', () => {
    expect(winner(board('XXX......'))).toBe('X')
    expect(winner(board('O...O...O'))).toBe('O')
    expect(winner(board('XOXXOOOXX'))).toBe('draw')
    expect(winner(board('X........'))).toBeNull()
  })

  it('computer wins first, then blocks, then takes the centre', () => {
    expect(aiMove(board('OO.XX....'))).toBe(2) // win beats block
    expect(aiMove(board('XX.......'))).toBe(2) // block
    expect(aiMove(board('X........'))).toBe(4) // centre
  })
})

describe('rps and dice', () => {
  it('scores rock-paper-scissors', () => {
    expect(rpsResult('rock', 'scissors')).toBe('win')
    expect(rpsResult('rock', 'paper')).toBe('lose')
    expect(rpsResult('paper', 'paper')).toBe('draw')
  })

  it('draws die faces', () => {
    expect(dieFace(5).split('\n')[2]).toBe('│   ●   │')
  })
})
