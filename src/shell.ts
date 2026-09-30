// Pure shell logic: parsing, history expansion, Tab completion, typo suggestions. No DOM.

/** Splits a command line into words; "double" or 'single' quotes keep spaces. */
export const tokenize = (line: string) =>
  [...line.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((m) => m[1] ?? m[2] ?? m[3])

/** Bash-style history expansion: !! is the last command, !n the nth. Returns null if the event is missing. */
export function expandHistory(line: string, history: string[]): string | null {
  const n = line === '!!' ? history.length : /^!(\d+)$/.exec(line)?.[1]
  if (n === undefined) return line
  return history[Number(n) - 1] ?? null
}

/** Candidates starting with what the user typed (case-insensitive). */
export const complete = (input: string, candidates: string[]) => {
  const q = input.trimStart().toLowerCase()
  return candidates.filter((c) => c.startsWith(q))
}

/** Longest shared prefix, so Tab can extend the line even when ambiguous. */
export const commonPrefix = (words: string[]) =>
  words.reduce((p, w) => {
    let i = 0
    while (i < p.length && p[i] === w[i]) i++
    return p.slice(0, i)
  }, words[0] ?? '')

/** Edit distance where swapping two neighbours counts as one typo (sl -> ls). */
export function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[a.length][b.length]
}

/** Closest candidate for a typo, or undefined if nothing is close. Short words allow 1 typo, longer ones 2. */
export function closest(word: string, candidates: string[]): string | undefined {
  const max = word.length <= 3 ? 1 : 2
  let best: string | undefined
  let bestD = max + 1
  for (const c of candidates) {
    const d = distance(word, c)
    if (d < bestD) [best, bestD] = [c, d]
  }
  return best
}
