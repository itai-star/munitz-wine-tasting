import { prisma } from "@/lib/prisma"
import { planBarrels } from "@/lib/barrel-plan"
import type { BarrelYearRow } from "@/lib/barrel-room"
import { calculateBarrelPurchase } from "@/lib/procurement"
import type { BarrelPurchase } from "@/lib/procurement"
import { loadBarrelYear, loadInBarrelsByVariety } from "@/server/barrels-data"

export type Procurement = {
  purchase: BarrelPurchase
  // The barrels of the year before, each with the marks that decide whether it counts.
  previousYearBarrels: BarrelYearRow[]
}

// The barrels the plan still needs for the red wine of a vintage, worked out the same way as the barrel plan of the finished
// wine screen. A year without a vintage has no plan.
async function plannedBarrelsOf(year: number): Promise<{ barrels: number; isFinal: boolean; hasPlan: boolean }> {
  const vintage = await prisma.vintage.findUnique({ where: { year } })
  if (!vintage) return { barrels: 0, isFinal: false, hasPlan: false }

  const [wines, stored, fresh, inBarrels] = await Promise.all([
    prisma.finishedWine.findMany({ where: { vintageId: vintage.id }, include: { block: true } }),
    prisma.barrelCombination.findMany({ orderBy: { createdAt: "asc" }, include: { varieties: { orderBy: { variety: "asc" } } } }),
    prisma.freshAllocation.findMany({ where: { vintageId: vintage.id } }),
    loadInBarrelsByVariety(year),
  ])
  const tanks = wines.map((wine) => ({ ...wine, variety: wine.block?.variety ?? null }))
  const combinations = stored.map((combination) => ({ id: combination.id, varieties: combination.varieties.map((entry) => entry.variety) }))
  const plan = planBarrels(tanks, combinations, new Map(fresh.map((entry) => [entry.variety, entry.liters])), inBarrels)
  return { barrels: plan.totalBarrels, isFinal: plan.isFinal, hasPlan: true }
}

export async function loadProcurement(year: number): Promise<Procurement> {
  const [previousYearBarrels, filledBarrels, planned] = await Promise.all([
    loadBarrelYear(year - 1),
    prisma.barrelFill.count({ where: { year, components: { some: {} } } }),
    plannedBarrelsOf(year),
  ])
  return {
    previousYearBarrels,
    purchase: calculateBarrelPurchase({
      year,
      previousYearBarrels,
      filledBarrels,
      plannedBarrels: planned.barrels,
      hasPlan: planned.hasPlan,
      isPlanFinal: planned.isFinal,
    }),
  }
}
