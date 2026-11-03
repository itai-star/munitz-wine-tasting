import { mixLeftovers } from "@/lib/barrel-mixing"
import type { MixedBarrelDraw } from "@/lib/barrel-mixing"

export const BARREL_LITERS = 225
// Every barrel needs this much wine kept outside the barrels, to top it up while it ages.
export const TOPPING_LITERS_PER_BARREL = 15
export const LITERS_PER_BARREL_WITH_TOPPING = BARREL_LITERS + TOPPING_LITERS_PER_BARREL
// From the liters after pressing to the final liters, the winery expects to lose this share.
export const EXPECTED_LOSS_PERCENT = 12

export type BarrelRecord = {
  variety: string | null
  wineType: string | null
  litersAfterPressing: number | null
  litersAfterFirstRacking: number | null
  litersAfterSecondRacking: number | null
}

export type VarietyBarrels = {
  variety: string
  // The forecast of all the variety's red wine, fresh liters included.
  liters: number
  // Liters set aside by hand as fresh wine, which need no barrel, and what was asked for before it was limited to the forecast.
  freshLiters: number
  freshRequestedLiters: number
  // Wine of the variety that is already in barrels this year. It is taken off before the barrels still needed are worked
  // out, and it is capped at what is left of the forecast after the fresh liters.
  inBarrelsLiters: number
  tanks: number
  // Tanks with a measurement after the second racking: their figure is the real final one, not an estimate.
  tanksAtLastStage: number
  isFinal: boolean
  barrels: number
  toppingLiters: number
  // What is left of the variety after its whole barrels and their topping wine, before any mixing.
  leftoverLiters: number
  // The part of the leftover that goes into mixed barrels, and what stays without a barrel after them.
  mixedLiters: number
  remainingLiters: number
  inMixedPool: boolean
}

export type MixedBarrels = {
  combinationId: string
  barrels: number
  toppingLiters: number
  // What each variety gave to this combination's mixed barrels.
  drawn: { variety: string; liters: number }[]
  // What the combination's varieties still have after all mixed barrels, enough or not for another one of its own.
  available: { variety: string; liters: number }[]
  availableLiters: number
}

export type BarrelPlan = {
  varieties: VarietyBarrels[]
  mixed: MixedBarrels[]
  // Every mixed barrel on its own, for the workbook.
  mixedBarrelList: MixedBarrelDraw[]
  // Fresh wine: the liters of tanks marked fresh, and the liters set aside by hand out of the red varieties.
  freshTankLiters: number
  freshManualLiters: number
  inBarrelsLiters: number
  pureBarrels: number
  mixedBarrels: number
  totalBarrels: number
  toppingLiters: number
  // Wine that stays out of barrels: leftovers too small for a barrel, whole or mixed.
  remainderLiters: number
  tanks: number
  tanksAtLastStage: number
  isFinal: boolean
  tanksWithoutVariety: number
}

export type BarrelCombination = { id: string; varieties: string[] }

// What a tank will hold when it goes into barrels. After the second racking this is the measurement itself.
// Before that it is the liters after pressing less the expected loss, and never more than an earlier racking
// already measured, since wine only gets less as it is racked.
export function forecastFinalLiters(record: BarrelRecord): number | null {
  if (record.litersAfterSecondRacking != null) return record.litersAfterSecondRacking
  if (record.litersAfterPressing == null) return record.litersAfterFirstRacking

  const estimate = Math.round(record.litersAfterPressing * (1 - EXPECTED_LOSS_PERCENT / 100))
  return Math.min(record.litersAfterFirstRacking ?? record.litersAfterPressing, estimate)
}

export type ForecastBasis = "SECOND_RACKING" | "FIRST_RACKING" | "PRESSING_LESS_LOSS" | "NONE"

// Where a tank's forecast comes from, so a reader can tell a real final figure from an estimate.
export function forecastBasis(record: BarrelRecord): ForecastBasis {
  if (record.litersAfterSecondRacking != null) return "SECOND_RACKING"
  if (record.litersAfterPressing == null) return record.litersAfterFirstRacking != null ? "FIRST_RACKING" : "NONE"

  const estimate = Math.round(record.litersAfterPressing * (1 - EXPECTED_LOSS_PERCENT / 100))
  return record.litersAfterFirstRacking != null && record.litersAfterFirstRacking < estimate ? "FIRST_RACKING" : "PRESSING_LESS_LOSS"
}

function barrelsFor(liters: number): { barrels: number; leftover: number } {
  const barrels = Math.floor(liters / LITERS_PER_BARREL_WITH_TOPPING)
  return { barrels, leftover: liters - barrels * LITERS_PER_BARREL_WITH_TOPPING }
}

type VarietyTotals = { liters: number; tanks: number; tanksAtLastStage: number }

function totalsByVariety(records: BarrelRecord[]): { totals: Map<string, VarietyTotals>; withoutVariety: number } {
  const totals = new Map<string, VarietyTotals>()
  let withoutVariety = 0
  for (const record of records) {
    if (!record.variety) {
      withoutVariety += 1
      continue
    }
    const entry = totals.get(record.variety) ?? { liters: 0, tanks: 0, tanksAtLastStage: 0 }
    entry.liters += forecastFinalLiters(record) ?? 0
    entry.tanks += 1
    if (record.litersAfterSecondRacking != null) entry.tanksAtLastStage += 1
    totals.set(record.variety, entry)
  }
  return { totals, withoutVariety }
}

// Each variety fills whole barrels on its own. Only what is left over, too little for another barrel,
// is pooled with the other varieties of the same approved combination, so mixed barrels are as few as possible.
export function planBarrels(
  records: BarrelRecord[],
  combinations: BarrelCombination[],
  freshByVariety: ReadonlyMap<string, number> = new Map(),
  inBarrelsByVariety: ReadonlyMap<string, number> = new Map(),
): BarrelPlan {
  const red = records.filter((record) => record.wineType === "RED")
  const { totals, withoutVariety } = totalsByVariety(red)
  const freshTankLiters = records
    .filter((record) => record.wineType === "FRESH")
    .reduce((sum, record) => sum + (forecastFinalLiters(record) ?? 0), 0)

  const varieties: VarietyBarrels[] = Array.from(totals, ([variety, entry]) => {
    const freshRequestedLiters = freshByVariety.get(variety) ?? 0
    const freshLiters = Math.min(freshRequestedLiters, entry.liters)
    const inBarrelsLiters = Math.min(inBarrelsByVariety.get(variety) ?? 0, entry.liters - freshLiters)
    const { barrels, leftover } = barrelsFor(entry.liters - freshLiters - inBarrelsLiters)
    return {
      variety,
      liters: entry.liters,
      freshLiters,
      freshRequestedLiters,
      inBarrelsLiters,
      tanks: entry.tanks,
      tanksAtLastStage: entry.tanksAtLastStage,
      isFinal: entry.tanksAtLastStage === entry.tanks,
      barrels,
      toppingLiters: barrels * TOPPING_LITERS_PER_BARREL,
      leftoverLiters: leftover,
      mixedLiters: 0,
      remainingLiters: leftover,
      inMixedPool: false,
    }
  })

  const leftovers = new Map(varieties.filter((entry) => entry.leftoverLiters > 0).map((entry) => [entry.variety, entry.leftoverLiters]))
  const mixing = mixLeftovers(leftovers, combinations, LITERS_PER_BARREL_WITH_TOPPING)
  const byVariety = new Map(varieties.map((entry) => [entry.variety, entry]))
  for (const entry of varieties) {
    entry.remainingLiters = mixing.remaining.get(entry.variety) ?? entry.leftoverLiters
    entry.mixedLiters = entry.leftoverLiters - entry.remainingLiters
    entry.inMixedPool = entry.mixedLiters > 0
  }

  const mixed: MixedBarrels[] = []
  for (const combination of combinations) {
    const members = combination.varieties.filter((variety) => (byVariety.get(variety)?.leftoverLiters ?? 0) > 0)
    if (members.length < 2) continue

    const barrels = mixing.barrels.get(combination.id) ?? 0
    const given = mixing.drawn.get(combination.id) ?? new Map<string, number>()
    const available = members
      .map((variety) => ({ variety, liters: byVariety.get(variety)?.remainingLiters ?? 0 }))
      .filter((part) => part.liters > 0)
    mixed.push({
      combinationId: combination.id,
      barrels,
      toppingLiters: barrels * TOPPING_LITERS_PER_BARREL,
      drawn: Array.from(given, ([variety, liters]) => ({ variety, liters })),
      available,
      availableLiters: available.reduce((sum, part) => sum + part.liters, 0),
    })
  }

  varieties.sort((a, b) => b.barrels - a.barrels || b.liters - a.liters || a.variety.localeCompare(b.variety, "he"))
  mixed.sort((a, b) => b.barrels - a.barrels || b.availableLiters - a.availableLiters)

  const pureBarrels = varieties.reduce((sum, entry) => sum + entry.barrels, 0)
  const mixedBarrels = mixed.reduce((sum, entry) => sum + entry.barrels, 0)
  const tanks = varieties.reduce((sum, entry) => sum + entry.tanks, 0)
  const tanksAtLastStage = varieties.reduce((sum, entry) => sum + entry.tanksAtLastStage, 0)

  return {
    varieties,
    mixed,
    mixedBarrelList: mixing.barrelList,
    freshTankLiters,
    freshManualLiters: varieties.reduce((sum, entry) => sum + entry.freshLiters, 0),
    inBarrelsLiters: varieties.reduce((sum, entry) => sum + entry.inBarrelsLiters, 0),
    pureBarrels,
    mixedBarrels,
    totalBarrels: pureBarrels + mixedBarrels,
    toppingLiters: (pureBarrels + mixedBarrels) * TOPPING_LITERS_PER_BARREL,
    remainderLiters: varieties.reduce((sum, entry) => sum + entry.remainingLiters, 0),
    tanks,
    tanksAtLastStage,
    isFinal: tanks > 0 && tanksAtLastStage === tanks,
    tanksWithoutVariety: withoutVariety,
  }
}
