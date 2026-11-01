export type MixCombination = { id: string; varieties: string[] }

export type MixResult = {
  // Whole mixed barrels filled for each combination, and the liters each variety gave to them.
  barrels: Map<string, number>
  drawn: Map<string, Map<string, number>>
  // What every variety still has after the mixed barrels.
  remaining: Map<string, number>
}

type Draw = { member: number; liters: number }

// A variety may sit in several combinations, so the same leftover could fill a barrel in more than one of them.
// The search tries every order of filling mixed barrels and keeps the one that fills the most; if the number of
// states grows too large it settles for the first workable choice at each step.
const NODE_LIMIT = 20000

export function mixLeftovers(leftovers: Map<string, number>, combinations: MixCombination[], barrelLiters: number): MixResult {
  const names = Array.from(leftovers.keys()).sort((a, b) => a.localeCompare(b, "he"))
  const indexOf = new Map(names.map((name, index) => [name, index]))
  const start = names.map((name) => leftovers.get(name) ?? 0)

  const eligible = combinations
    .map((combination) => ({
      id: combination.id,
      members: combination.varieties.map((variety) => indexOf.get(variety)).filter((index): index is number => index !== undefined && start[index] > 0),
    }))
    .filter((combination) => combination.members.length >= 2)

  // Wine of a variety that can go to few combinations is used first, so the flexible wine stays available.
  const reach = names.map((_, index) => eligible.filter((combination) => combination.members.includes(index)).length)

  function draw(members: number[], state: number[]): { next: number[]; draws: Draw[] } | null {
    const pool = members.reduce((sum, member) => sum + state[member], 0)
    if (pool < barrelLiters) return null

    const order = [...members].sort((a, b) => reach[a] - reach[b] || state[b] - state[a] || a - b)
    const next = [...state]
    const draws: Draw[] = []
    let needed = barrelLiters
    for (const member of order) {
      if (needed <= 0) break
      const liters = Math.min(next[member], needed)
      if (liters <= 0) continue
      next[member] -= liters
      needed -= liters
      draws.push({ member, liters })
    }
    return { next, draws }
  }

  const memo = new Map<string, { count: number; move: number }>()
  let nodes = 0

  function search(state: number[]): number {
    const key = state.join(",")
    const known = memo.get(key)
    if (known) return known.count

    nodes += 1
    let best = { count: 0, move: -1 }
    for (let move = 0; move < eligible.length; move += 1) {
      const attempt = draw(eligible[move].members, state)
      if (!attempt) continue
      const count = 1 + search(attempt.next)
      if (count > best.count) best = { count, move }
      if (nodes > NODE_LIMIT) break
    }
    memo.set(key, best)
    return best.count
  }

  search(start)

  const barrels = new Map<string, number>()
  const drawn = new Map<string, Map<string, number>>()
  let state = start
  for (;;) {
    const move = memo.get(state.join(","))?.move ?? -1
    if (move < 0) break
    const combination = eligible[move]
    const attempt = draw(combination.members, state)
    if (!attempt) break

    barrels.set(combination.id, (barrels.get(combination.id) ?? 0) + 1)
    const byVariety = drawn.get(combination.id) ?? new Map<string, number>()
    for (const { member, liters } of attempt.draws) {
      byVariety.set(names[member], (byVariety.get(names[member]) ?? 0) + liters)
    }
    drawn.set(combination.id, byVariety)
    state = attempt.next
  }

  return { barrels, drawn, remaining: new Map(names.map((name, index) => [name, state[index]])) }
}
