import { prisma } from "@/lib/prisma"
import { LITERS_PER_BARREL_WITH_TOPPING, forecastFinalLiters } from "@/lib/barrel-plan"
import { compareBarrels, stateInYear } from "@/lib/barrel-room"
import type { BarrelRow, BarrelYearRow, BlockOption, BlockSupply } from "@/lib/barrel-room"

export async function loadBarrels(): Promise<BarrelRow[]> {
  const barrels = await prisma.barrel.findMany()
  return barrels
    .map(
      (barrel): BarrelRow => ({
        id: barrel.id,
        number: barrel.number,
        type: barrel.type,
        year: barrel.year,
        removed: barrel.removedAt !== null,
        removedOn: barrel.removedAt ? barrel.removedAt.toISOString().slice(0, 10) : null,
        removalNote: barrel.removalNote,
      }),
    )
    .sort(compareBarrels)
}

// The barrels as they were in a year: those in use then, with the wine they held and their lab tests that year.
export async function loadBarrelYear(year: number, barrels?: BarrelRow[]): Promise<BarrelYearRow[]> {
  const all = barrels ?? (await loadBarrels())
  const inYear = all.flatMap((barrel) => {
    const state = stateInYear(barrel, year)
    return state ? [{ barrel, state }] : []
  })

  const fills = await prisma.barrelFill.findMany({
    where: { year, barrelId: { in: inYear.map((entry) => entry.barrel.id) } },
    include: {
      components: { include: { block: { select: { name: true, variety: true } } } },
      tests: { orderBy: { testDate: "asc" } },
    },
  })
  const fillOf = new Map(fills.map((fill) => [fill.barrelId, fill]))
  const flags = await prisma.barrelYearFlag.findMany({ where: { year, barrelId: { in: inYear.map((entry) => entry.barrel.id) } } })
  const flagsOf = new Map(flags.map((flag) => [flag.barrelId, flag]))

  return inYear.map(({ barrel, state }): BarrelYearRow => {
    const fill = fillOf.get(barrel.id)
    const flag = flagsOf.get(barrel.id)
    return {
      ...barrel,
      state,
      includeInBottling: flag?.includeInBottling ?? true,
      lastRound: flag?.lastRound ?? false,
      parts: (fill?.components ?? [])
        .map((part) => ({ blockId: part.blockId, blockName: part.block.name, variety: part.block.variety, percent: part.percent }))
        .sort((a, b) => b.percent - a.percent || a.blockName.localeCompare(b.blockName, "he")),
      tests: (fill?.tests ?? []).map((test) => ({
        id: test.id,
        testDate: test.testDate.toISOString().slice(0, 10),
        lab: test.lab,
        density: test.density,
        ethanol: test.ethanol,
        ph: test.ph,
        totalAcid: test.totalAcid,
        volatile: test.volatile,
        rsBx: test.rsBx,
        co2: test.co2,
        malicAcid: test.malicAcid,
        freeBisulfite: test.freeBisulfite,
        notes: test.notes,
        actionItems: test.actionItems,
      })),
    }
  })
}

export async function loadBlockOptions(): Promise<BlockOption[]> {
  return prisma.vineyardBlock.findMany({ select: { id: true, name: true, variety: true }, orderBy: { name: "asc" } })
}

// Every year from the oldest barrel to the current one, newest first, so a year in which a barrel was used can be chosen.
export async function loadBarrelYears(currentYear: number): Promise<number[]> {
  const [oldest, latestFill] = await Promise.all([
    prisma.barrel.aggregate({ _min: { year: true } }),
    prisma.barrelFill.aggregate({ _max: { year: true } }),
  ])
  const first = Math.min(oldest._min.year ?? currentYear, currentYear)
  const last = Math.max(latestFill._max.year ?? currentYear, currentYear)
  return Array.from({ length: last - first + 1 }, (_, index) => last - index)
}

// How much wine a filled barrel takes from the finished wine: what it holds and what is kept aside to top it up.
function litersOfShare(percent: number): number {
  return (percent / 100) * LITERS_PER_BARREL_WITH_TOPPING
}

// The finished wine of the year, by block, and what the barrels of that year already took from it. Fresh wine is left
// out, since it is not kept in barrels. A year with no finished wine has no supply.
export async function loadBlockSupply(year: number): Promise<BlockSupply[]> {
  const vintage = await prisma.vintage.findUnique({ where: { year } })
  if (!vintage) return []

  const [wines, taken] = await Promise.all([
    prisma.finishedWine.findMany({
      where: { vintageId: vintage.id, blockId: { not: null }, OR: [{ wineType: null }, { wineType: { not: "FRESH" } }] },
      include: { block: { select: { id: true, name: true, variety: true } } },
    }),
    prisma.barrelFillBlock.findMany({ where: { fill: { year } }, select: { blockId: true, percent: true } }),
  ])

  const supply = new Map<string, BlockSupply>()
  for (const wine of wines) {
    if (!wine.block) continue
    const liters = forecastFinalLiters({
      variety: wine.block.variety,
      wineType: wine.wineType,
      litersAfterPressing: wine.litersAfterPressing,
      litersAfterFirstRacking: wine.litersAfterFirstRacking,
      litersAfterSecondRacking: wine.litersAfterSecondRacking,
    })
    const entry = supply.get(wine.block.id) ?? { ...wine.block, forecastLiters: 0, usedLiters: 0 }
    entry.forecastLiters += liters ?? 0
    supply.set(wine.block.id, entry)
  }
  for (const part of taken) {
    const entry = supply.get(part.blockId)
    if (entry) entry.usedLiters += litersOfShare(part.percent)
  }
  return Array.from(supply.values())
    .map((entry) => ({ ...entry, usedLiters: Math.round(entry.usedLiters * 10) / 10 }))
    .sort((a, b) => a.name.localeCompare(b.name, "he"))
}

// The wine of the year already in barrels, by variety, for the barrel plan.
export async function loadInBarrelsByVariety(year: number): Promise<Map<string, number>> {
  const parts = await prisma.barrelFillBlock.findMany({ where: { fill: { year } }, select: { percent: true, block: { select: { variety: true } } } })
  const byVariety = new Map<string, number>()
  for (const part of parts) byVariety.set(part.block.variety, (byVariety.get(part.block.variety) ?? 0) + litersOfShare(part.percent))
  return byVariety
}
