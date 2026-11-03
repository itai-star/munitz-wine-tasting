import { stateInYear } from "@/lib/barrel-room"
import type { YearState } from "@/lib/barrel-room"

export type YearBarrel = { id: string; number: string; state: YearState }

const PREFERENCE: YearState[] = ["IN_STOCK", "REMOVED_LATER", "REMOVED_THIS_YEAR"]

export function barrelsInYear(barrels: { id: string; number: string; year: number; removedAt: Date | null }[], year: number): YearBarrel[] {
  return barrels.flatMap((barrel) => {
    const state = stateInYear({ year: barrel.year, removedOn: barrel.removedAt?.toISOString().slice(0, 10) ?? null }, year)
    return state ? [{ id: barrel.id, number: barrel.number, state }] : []
  })
}

// The barrel a number stands for in a year: the one in use then. When a number was used by two barrels in that year,
// the one still in stock is taken, and when that does not settle it, the row cannot be placed.
export function matchBarrel(inYear: YearBarrel[], number: string, year: number): { barrel: YearBarrel } | { error: string } {
  const candidates = inYear.filter((barrel) => barrel.number === number)
  if (candidates.length === 0) return { error: `חבית ${number} לא קיימת או לא הייתה בשימוש בשנה ${year}` }

  const best = PREFERENCE.find((state) => candidates.some((barrel) => barrel.state === state))
  const matching = candidates.filter((barrel) => barrel.state === best)
  if (matching.length > 1) return { error: `יש כמה חביות עם המספר ${number} בשנה ${year}` }
  return { barrel: matching[0] }
}
