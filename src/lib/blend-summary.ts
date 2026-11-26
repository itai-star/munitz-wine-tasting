import { formatPercent } from "@/lib/barrel-wine"
import { compositionOf, roundLiters, wineLabOf } from "@/lib/blending"
import type { BlendWineView, WineDraw, WineLab } from "@/lib/blending"

export const BOTTLE_LITERS = 0.75

export type SummaryBarrel = { number: string; liters: number; varieties: string }

// A wine whose composition is final, with everything the summary of the blending shows about it.
export type WineSummary = {
  id: string
  name: string
  description: string | null
  totalLiters: number
  // An estimate from the volume alone: what is lost in bottling is not taken off.
  bottles: number
  varieties: { variety: string; percent: number; liters: number }[]
  blocks: string[]
  barrels: SummaryBarrel[]
  lab: WineLab
}

// The varieties of one barrel: the name alone when it holds one, otherwise each with its share.
function varietiesOf(draw: WineDraw): string {
  const shares = new Map<string, number>()
  for (const part of draw.parts) shares.set(part.variety, (shares.get(part.variety) ?? 0) + part.percent)
  const entries = Array.from(shares).sort(([, a], [, b]) => b - a)
  return entries.length === 1 ? entries[0][0] : entries.map(([variety, percent]) => `${variety} ${formatPercent(percent)}`).join(", ")
}

export function bottlesFrom(liters: number): number {
  return Math.floor(liters / BOTTLE_LITERS)
}

// The wines marked as having a final composition, in the order of the blending screen.
export function summarizeBlend(wines: BlendWineView[]): WineSummary[] {
  return wines
    .filter((wine) => wine.finalized)
    .map((wine) => {
      const composition = compositionOf(wine.draws)
      const totalLiters = roundLiters(composition.totalLiters)
      return {
        id: wine.id,
        name: wine.name,
        description: wine.description,
        totalLiters,
        bottles: bottlesFrom(totalLiters),
        varieties: composition.byVariety.map((share) => ({ variety: share.variety, percent: share.percent, liters: share.liters })),
        blocks: Array.from(new Set(composition.byVariety.flatMap((share) => share.blocks.map((block) => block.blockName)))).sort((a, b) => a.localeCompare(b, "he")),
        barrels: wine.draws.map((draw) => ({ number: draw.number, liters: draw.liters, varieties: varietiesOf(draw) })),
        lab: wineLabOf(wine.draws),
      }
    })
}

// Says which barrels a value was worked out from, when some of them have no lab test.
export function partialNote(value: { barrels: number }, total: number): string | null {
  if (value.barrels === 0 || value.barrels >= total) return null
  return `מחושב ${value.barrels === 1 ? "מחבית אחת" : `מ-${value.barrels} חביות`} מתוך ${total}`
}
