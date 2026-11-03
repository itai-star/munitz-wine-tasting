import { BARREL_LITERS } from "@/lib/barrel-plan"
import type { WinePart } from "@/lib/barrel-wine"

export const MIN_SCORE = 5
export const MAX_SCORE = 10

export function roundLiters(value: number): number {
  return Math.round(value * 10) / 10
}

// A score is kept to a tenth.
export function roundScore(score: number): number {
  return Math.round(score * 10) / 10
}

// What is left of a barrel after what was taken from it into wines. A barrel holds 225 liters at the start of the year.
export function remainingLiters(drawn: number): number {
  return Math.max(0, roundLiters(BARREL_LITERS - drawn))
}

// The variety that has the biggest share of the wine in a barrel, which decides the pile it is shown in.
export function dominantVariety(parts: WinePart[]): string | null {
  const shares = new Map<string, number>()
  for (const part of parts) shares.set(part.variety, (shares.get(part.variety) ?? 0) + part.percent)
  let best: string | null = null
  let bestShare = -1
  for (const [variety, share] of shares) {
    if (share > bestShare || (share === bestShare && best !== null && variety.localeCompare(best, "he") < 0)) {
      best = variety
      bestShare = share
    }
  }
  return best
}

export type PileBarrel = {
  fillId: string
  number: string
  type: string
  parts: WinePart[]
  variety: string
  remaining: number
  score: number | null
  tastingNotes: string | null
}

export type WineDraw = {
  fillId: string
  number: string
  type: string
  liters: number
  parts: WinePart[]
  score: number | null
}

export type BlendWineView = {
  id: string
  year: number
  name: string
  description: string | null
  finalized: boolean
  draws: WineDraw[]
}

export type VarietyShare = {
  variety: string
  liters: number
  percent: number
  // The barrels that gave wine of this variety, and how many liters of the variety each gave.
  barrels: { number: string; liters: number }[]
  blocks: { blockName: string; liters: number }[]
}

export type Composition = { totalLiters: number; byVariety: VarietyShare[] }

// The composition of a wine: every barrel gives the liters taken from it, divided between the blocks of the barrel by their
// shares, and the blocks are grouped by variety.
export function compositionOf(draws: WineDraw[]): Composition {
  const varieties = new Map<string, { liters: number; barrels: Map<string, number>; blocks: Map<string, number> }>()
  let total = 0
  for (const draw of draws) {
    total += draw.liters
    for (const part of draw.parts) {
      const liters = (draw.liters * part.percent) / 100
      const entry = varieties.get(part.variety) ?? { liters: 0, barrels: new Map<string, number>(), blocks: new Map<string, number>() }
      entry.liters += liters
      entry.barrels.set(draw.number, (entry.barrels.get(draw.number) ?? 0) + liters)
      entry.blocks.set(part.blockName, (entry.blocks.get(part.blockName) ?? 0) + liters)
      varieties.set(part.variety, entry)
    }
  }

  const byVariety = Array.from(varieties, ([variety, entry]): VarietyShare => ({
    variety,
    liters: roundLiters(entry.liters),
    percent: total > 0 ? Math.round((entry.liters / total) * 1000) / 10 : 0,
    barrels: Array.from(entry.barrels, ([number, liters]) => ({ number, liters: roundLiters(liters) })).sort((a, b) => a.number.localeCompare(b.number, "he", { numeric: true })),
    blocks: Array.from(entry.blocks, ([blockName, liters]) => ({ blockName, liters: roundLiters(liters) })).sort((a, b) => b.liters - a.liters),
  })).sort((a, b) => b.liters - a.liters || a.variety.localeCompare(b.variety, "he"))

  return { totalLiters: roundLiters(total), byVariety }
}

export function isValidScore(score: number): boolean {
  return Number.isFinite(score) && score >= MIN_SCORE && score <= MAX_SCORE
}
