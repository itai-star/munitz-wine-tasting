export const BARREL_LITERS = 225
// Every barrel needs this much wine kept outside the barrels, to top it up while it ages.
export const TOPPING_LITERS_PER_BARREL = 15
export const LITERS_PER_BARREL_WITH_TOPPING = BARREL_LITERS + TOPPING_LITERS_PER_BARREL
// From the liters after pressing to the final liters, the winery expects to lose this share.
export const EXPECTED_LOSS_PERCENT = 10

export type BarrelRecord = {
  variety: string | null
  wineType: string | null
  litersAfterPressing: number | null
  litersAfterFirstRacking: number | null
  litersAfterSecondRacking: number | null
}

export type VarietyBarrels = {
  variety: string
  liters: number
  tanks: number
  // Tanks with a measurement after the second racking: their figure is the real final one, not an estimate.
  tanksAtLastStage: number
  isFinal: boolean
  barrels: number
  toppingLiters: number
  leftoverLiters: number
  // True when the leftover goes into a mixed barrel pool instead of staying on its own.
  inMixedPool: boolean
}

export type MixedBarrels = {
  combinationId: string
  contributions: { variety: string; liters: number }[]
  poolLiters: number
  barrels: number
  toppingLiters: number
  remainderLiters: number
}

export type BarrelPlan = {
  varieties: VarietyBarrels[]
  mixed: MixedBarrels[]
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
export function planBarrels(records: BarrelRecord[], combinations: BarrelCombination[]): BarrelPlan {
  const red = records.filter((record) => record.wineType === "RED")
  const { totals, withoutVariety } = totalsByVariety(red)

  const varieties: VarietyBarrels[] = Array.from(totals, ([variety, entry]) => {
    const { barrels, leftover } = barrelsFor(entry.liters)
    return {
      variety,
      liters: entry.liters,
      tanks: entry.tanks,
      tanksAtLastStage: entry.tanksAtLastStage,
      isFinal: entry.tanksAtLastStage === entry.tanks,
      barrels,
      toppingLiters: barrels * TOPPING_LITERS_PER_BARREL,
      leftoverLiters: leftover,
      inMixedPool: false,
    }
  })

  const mixed: MixedBarrels[] = []
  for (const combination of combinations) {
    const members = varieties.filter((entry) => combination.varieties.includes(entry.variety) && entry.leftoverLiters > 0)
    if (members.length < 2) continue

    const poolLiters = members.reduce((sum, entry) => sum + entry.leftoverLiters, 0)
    const { barrels, leftover } = barrelsFor(poolLiters)
    for (const entry of members) entry.inMixedPool = true
    mixed.push({
      combinationId: combination.id,
      contributions: members.map((entry) => ({ variety: entry.variety, liters: entry.leftoverLiters })),
      poolLiters,
      barrels,
      toppingLiters: barrels * TOPPING_LITERS_PER_BARREL,
      remainderLiters: leftover,
    })
  }

  varieties.sort((a, b) => b.barrels - a.barrels || b.liters - a.liters || a.variety.localeCompare(b.variety, "he"))
  mixed.sort((a, b) => b.barrels - a.barrels || b.poolLiters - a.poolLiters)

  const pureBarrels = varieties.reduce((sum, entry) => sum + entry.barrels, 0)
  const mixedBarrels = mixed.reduce((sum, entry) => sum + entry.barrels, 0)
  const standaloneLeftover = varieties.filter((entry) => !entry.inMixedPool).reduce((sum, entry) => sum + entry.leftoverLiters, 0)
  const tanks = varieties.reduce((sum, entry) => sum + entry.tanks, 0)
  const tanksAtLastStage = varieties.reduce((sum, entry) => sum + entry.tanksAtLastStage, 0)

  return {
    varieties,
    mixed,
    pureBarrels,
    mixedBarrels,
    totalBarrels: pureBarrels + mixedBarrels,
    toppingLiters: (pureBarrels + mixedBarrels) * TOPPING_LITERS_PER_BARREL,
    remainderLiters: standaloneLeftover + mixed.reduce((sum, entry) => sum + entry.remainderLiters, 0),
    tanks,
    tanksAtLastStage,
    isFinal: tanks > 0 && tanksAtLastStage === tanks,
    tanksWithoutVariety: withoutVariety,
  }
}
