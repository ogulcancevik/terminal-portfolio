// Fun stuff: Matrix rain, tic-tac-toe, rock-paper-scissors, dice.
import { useEffect, useRef, useState } from 'preact/hooks'

// Matrix

const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン0123456789'
const CELL = 16

/** Full-page digital rain in the theme's accent colour. Any key or click exits. */
export function Matrix() {
  const ref = useRef<HTMLCanvasElement>(null)
  const [on, setOn] = useState(true)

  useEffect(() => {
    if (!on) return
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    canvas.width = innerWidth
    canvas.height = innerHeight
    const color = getComputedStyle(canvas).getPropertyValue('--accent').trim() || '#0f0'
    // One drop per column, starting above the screen at staggered heights.
    const drops = Array.from({ length: Math.ceil(canvas.width / CELL) }, () => -Math.floor(Math.random() * 40))

    const id = setInterval(() => {
      ctx.fillStyle = 'rgb(0 0 0 / 0.08)' // fade previous frames into trails
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = color
      ctx.font = `${CELL}px monospace`
      drops.forEach((y, x) => {
        ctx.fillText(GLYPHS[Math.floor(Math.random() * GLYPHS.length)], x * CELL, y * CELL)
        drops[x] = y * CELL > canvas.height && Math.random() > 0.975 ? 0 : y + 1
      })
    }, 50)

    const stop = (e: Event) => {
      // Swallow the key or click so it doesn't type into the prompt or hit a button underneath.
      e.preventDefault()
      e.stopPropagation()
      setOn(false)
    }
    addEventListener('keydown', stop, { capture: true })
    addEventListener('click', stop, { capture: true })
    return () => {
      clearInterval(id)
      removeEventListener('keydown', stop, { capture: true })
      removeEventListener('click', stop, { capture: true })
    }
  }, [on])

  if (!on) return <p class="muted">Wake up, Neo...</p>
  return (
    <>
      <canvas ref={ref} class="matrix" aria-hidden="true" />
      <p class="matrix-hint">Press any key to exit</p>
    </>
  )
}

// Tic-tac-toe

type Cell = 'X' | 'O' | null
const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export function winner(b: Cell[]): 'X' | 'O' | 'draw' | null {
  for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a]
  return b.every(Boolean) ? 'draw' : null
}

/** Computer (O): win if it can, else block X, else centre, else random. Beatable on purpose. */
export function aiMove(b: Cell[], random = Math.random): number {
  const free = b.flatMap((c, i) => (c ? [] : [i]))
  for (const p of ['O', 'X'] as const) {
    const hit = free.find((i) => winner(b.map((c, j) => (j === i ? p : c))) === p)
    if (hit !== undefined) return hit
  }
  if (free.includes(4)) return 4
  return free[Math.floor(random() * free.length)]
}

export function TicTacToe() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null))
  const result = winner(board)

  const play = (i: number) => {
    const next = board.map((c, j) => (j === i ? 'X' : c))
    if (!winner(next)) next[aiMove(next)] = 'O'
    setBoard(next)
  }

  return (
    <div class="ttt">
      <div class="ttt-board">
        {board.map((c, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Square ${i + 1}: ${c ?? 'empty'}`}
            disabled={!!c || !!result}
            class={c === 'O' ? 'o' : ''}
            onClick={() => play(i)}
          >
            {c ?? ''}
          </button>
        ))}
      </div>
      <p>
        {!result && 'You are X. Pick a square.'}
        {result === 'X' && <span class="accent">You win!</span>}
        {result === 'O' && <span class="error">Computer wins.</span>}
        {result === 'draw' && "It's a draw."}{' '}
        {result && (
          <button type="button" class="cmd" data-cmd="tictactoe">
            play again
          </button>
        )}
      </p>
    </div>
  )
}

// Rock, paper, scissors

export const RPS = ['rock', 'paper', 'scissors'] as const
export type Rps = (typeof RPS)[number]
const BEATS: Record<Rps, Rps> = { rock: 'scissors', paper: 'rock', scissors: 'paper' }

export const rpsResult = (me: Rps, them: Rps) => (me === them ? 'draw' : BEATS[me] === them ? 'win' : 'lose')

// Dice

const PIPS = [[4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]]

/** ASCII die face for 1–6. */
export const dieFace = (n: number) =>
  [
    '┌───────┐',
    ...[0, 1, 2].map((r) => `│ ${[0, 1, 2].map((c) => (PIPS[n - 1].includes(r * 3 + c) ? '●' : ' ')).join(' ')} │`),
    '└───────┘',
  ].join('\n')
