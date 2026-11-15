import { prisma } from "@/lib/prisma"
import { RATING_KEYS, decisionOf, summarizeRatings } from "@/lib/barrel-rating"
import type { ActiveTasting, BarrelTastingView, Rater, RatingKey, RatingLevels } from "@/lib/barrel-rating"
import type { SessionUser } from "@/lib/permissions"

export type MyRating = { levels: RatingLevels; paramNotes: Partial<Record<RatingKey, string>>; notes: string | null }

function levelsOf(row: Record<RatingKey, number>): RatingLevels {
  return Object.fromEntries(RATING_KEYS.map((key) => [key, row[key]])) as RatingLevels
}

// A note per parameter is kept as an object; anything in it that is not a note of a known parameter is left out.
export function paramNotesOf(value: unknown): Partial<Record<RatingKey, string>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return {}
  const notes: Partial<Record<RatingKey, string>> = {}
  for (const key of RATING_KEYS) {
    const note = (value as Record<string, unknown>)[key]
    if (typeof note === "string" && note.trim() !== "") notes[key] = note
  }
  return notes
}

// The tasters chosen for a year, by name.
export async function loadTasters(year: number): Promise<Rater[]> {
  const rows = await prisma.blendTaster.findMany({ where: { year }, include: { user: { select: { id: true, username: true } } } })
  return rows.map((row) => ({ userId: row.user.id, username: row.user.username })).sort((a, b) => a.username.localeCompare(b.username, "he"))
}

// Everyone who can be chosen as a taster: the active users who can open the blending, administrators included.
export async function loadTasterCandidates(): Promise<Rater[]> {
  const users = await prisma.appUser.findMany({
    where: { isActive: true, OR: [{ role: "ADMIN" }, { permissions: { has: "BARRELS" } }] },
    select: { id: true, username: true },
  })
  return users.map((user) => ({ userId: user.id, username: user.username })).sort((a, b) => a.username.localeCompare(b.username, "he"))
}

// The tasting of the barrels of a year as one viewer may see it, as a lookup by the barrel's record of the year.
export async function loadTastingViews(year: number, viewer: SessionUser): Promise<(fillId: string) => BarrelTastingView> {
  const [ratings, tasters, decisions] = await Promise.all([
    prisma.barrelRating.findMany({ where: { fill: { year } }, include: { user: { select: { id: true, username: true } } } }),
    loadTasters(year),
    prisma.barrelRatingDecision.findMany({ where: { fill: { year } } }),
  ])
  const decisionOfFill = new Map(decisions.map((decision) => [decision.fillId, decisionOf(decision.levels)]))
  const byFill = new Map<string, typeof ratings>()
  for (const rating of ratings) byFill.set(rating.fillId, [...(byFill.get(rating.fillId) ?? []), rating])
  const isAdmin = viewer.role === "ADMIN"

  return (fillId) => {
    const rows = byFill.get(fillId) ?? []
    const ratedByMe = rows.some((row) => row.userId === viewer.id)
    const visible = isAdmin || ratedByMe
    if (!visible) return { visible, ratedByMe, summary: null, raters: [], pending: [] }
    return {
      visible,
      ratedByMe,
      summary: summarizeRatings(
        rows.map((row) => ({ rater: { userId: row.user.id, username: row.user.username }, levels: levelsOf(row) })),
        decisionOfFill.get(fillId),
      ),
      raters: rows.map((row) => ({ userId: row.user.id, username: row.user.username })).sort((x, y) => x.username.localeCompare(y.username, "he")),
      pending: tasters.filter((taster) => !rows.some((row) => row.userId === taster.userId)),
    }
  }
}

// The viewer's own forms for the barrels of a year, to fill the tasting screen with what they already chose.
export async function loadMyRatings(year: number, userId: string): Promise<Map<string, MyRating>> {
  const rows = await prisma.barrelRating.findMany({ where: { userId, fill: { year } } })
  return new Map(rows.map((row) => [row.fillId, { levels: levelsOf(row), paramNotes: paramNotesOf(row.paramNotes), notes: row.notes }]))
}

export type RatingBarrel = {
  fillId: string
  number: string
  type: string
  parts: { blockName: string; variety: string; percent: number }[]
  variety: string
}

// The barrels of a year that hold wine, in the order of their numbers, for the tasting screen.
export async function loadRatingBarrels(year: number): Promise<RatingBarrel[]> {
  const fills = await prisma.barrelFill.findMany({
    where: { year, components: { some: {} } },
    include: { barrel: { select: { number: true, type: true } }, components: { include: { block: { select: { name: true, variety: true } } } } },
  })
  return fills
    .map((fill) => {
      const parts = fill.components
        .map((part) => ({ blockName: part.block.name, variety: part.block.variety, percent: part.percent }))
        .sort((a, b) => b.percent - a.percent || a.blockName.localeCompare(b.blockName, "he"))
      return { fillId: fill.id, number: fill.barrel.number, type: fill.barrel.type, parts, variety: parts[0]?.variety ?? "" }
    })
    .sort((a, b) => a.number.localeCompare(b.number, "he", { numeric: true }))
}

// The barrel being tasted in a year and who saved a form for it. Only the tasters of the year count.
export async function loadActiveTasting(year: number): Promise<ActiveTasting> {
  const [state, tasters] = await Promise.all([prisma.blendTastingState.findUnique({ where: { year } }), loadTasters(year)])
  const activeFillId = state?.activeFillId ?? null
  if (!activeFillId) return { activeFillId: null, saved: [], waiting: [] }

  const rated = new Set((await prisma.barrelRating.findMany({ where: { fillId: activeFillId }, select: { userId: true } })).map((row) => row.userId))
  return {
    activeFillId,
    saved: tasters.filter((taster) => rated.has(taster.userId)),
    waiting: tasters.filter((taster) => !rated.has(taster.userId)),
  }
}

// How many forms every barrel of a year has, so an administrator sees which barrels were tasted already.
export async function loadFormCounts(year: number): Promise<Map<string, number>> {
  const rows = await prisma.barrelRating.groupBy({ by: ["fillId"], where: { fill: { year } }, _count: { _all: true } })
  return new Map(rows.map((row) => [row.fillId, row._count._all]))
}
