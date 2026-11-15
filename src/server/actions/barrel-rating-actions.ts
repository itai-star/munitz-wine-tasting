"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { MAX_BARREL_YEAR, MIN_BARREL_YEAR } from "@/lib/barrel-room"
import { LEVEL_COUNT, MAX_PARAM_NOTE, MAX_RATING_NOTES, RATING_KEYS, canMoveOn } from "@/lib/barrel-rating"
import type { RatingKey } from "@/lib/barrel-rating"
import { requireAdmin, requirePermission } from "@/server/auth/guards"
import { loadActiveTasting, loadTasterCandidates, loadTasters } from "@/server/barrel-rating-data"
import { ok, err } from "@/types"
import type { Result } from "@/types"

const PAGES = ["/admin/blending", "/admin/blending/tasting"]

function revalidate(): void {
  for (const page of PAGES) revalidatePath(page)
}

const level = z.number().int().min(1, "יש לבחור רמה בכל פרמטר").max(LEVEL_COUNT, "יש לבחור רמה בכל פרמטר")
const LevelsSchema = z.object(Object.fromEntries(RATING_KEYS.map((key) => [key, level])) as Record<RatingKey, typeof level>)
const ParamNotesSchema = z
  .record(z.string(), z.string().trim().max(MAX_PARAM_NOTE, "אחת ההערות ארוכה מדי"))
  .transform((notes) => Object.fromEntries(Object.entries(notes).filter(([key, note]) => note !== "" && (RATING_KEYS as string[]).includes(key))))

const RatingSchema = z.object({
  fillId: z.string().min(1),
  levels: LevelsSchema,
  paramNotes: ParamNotesSchema,
  notes: z
    .string()
    .trim()
    .max(MAX_RATING_NOTES, "ההערה הכללית ארוכה מדי")
    .transform((value) => value || null),
})

const TastersSchema = z.object({
  year: z.number().int().min(MIN_BARREL_YEAR).max(MAX_BARREL_YEAR),
  userIds: z.array(z.string().min(1)).max(100),
})

// The tasters of a year are set as a whole: whoever is not in the list stops being one, and whoever is added becomes one.
// The forms someone already filled are kept when they are taken off the list.
export async function setBlendTasters(input: z.input<typeof TastersSchema>): Promise<Result<void>> {
  await requireAdmin()
  const parsed = TastersSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: "הבחירה אינה תקינה" })

  const { year } = parsed.data
  const userIds = Array.from(new Set(parsed.data.userIds))
  try {
    const candidates = new Set((await loadTasterCandidates()).map((candidate) => candidate.userId))
    if (userIds.some((userId) => !candidates.has(userId))) return err({ code: "VALIDATION", message: "אפשר לבחור רק משתמשים עם גישה לבלנדינג" })

    await prisma.$transaction([
      prisma.blendTaster.deleteMany({ where: { year, userId: { notIn: userIds } } }),
      prisma.blendTaster.createMany({ data: userIds.map((userId) => ({ year, userId })), skipDuplicates: true }),
    ])
    revalidate()
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת המשתתפים" })
  }
}

// A taster's form for a barrel. Only a taster of the barrel's year may fill one, and a new form only for the barrel being tasted
// now. Every parameter has to be rated, and saving again replaces what the same taster saved before, so a form can be changed
// at any time.
export async function saveBarrelRating(input: z.input<typeof RatingSchema>): Promise<Result<void>> {
  const user = await requirePermission("BARRELS")
  const parsed = RatingSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.errors[0].message })

  const { fillId, levels, paramNotes, notes } = parsed.data
  try {
    const fill = await prisma.barrelFill.findUnique({ where: { id: fillId }, select: { year: true, _count: { select: { components: true } } } })
    if (!fill || fill._count.components === 0) return err({ code: "NOT_FOUND", message: "החבית לא נמצאה" })
    const taster = await prisma.blendTaster.findUnique({ where: { year_userId: { year: fill.year, userId: user.id } } })
    if (!taster) return err({ code: "VALIDATION", message: `אינך ברשימת המשתתפים בטעימה של ${fill.year}` })
    const [existing, state] = await Promise.all([
      prisma.barrelRating.findUnique({ where: { fillId_userId: { fillId, userId: user.id } }, select: { id: true } }),
      prisma.blendTastingState.findUnique({ where: { year: fill.year } }),
    ])
    if (!existing && state?.activeFillId !== fillId) return err({ code: "VALIDATION", message: "אפשר למלא טופס חדש רק לחבית שבטעימה כרגע" })

    const data = { ...levels, paramNotes, notes }
    await prisma.barrelRating.upsert({ where: { fillId_userId: { fillId, userId: user.id } }, create: { fillId, userId: user.id, ...data }, update: data })
    revalidate()
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת הטופס" })
  }
}

const DeleteSchema = z.object({ fillId: z.string().min(1), userId: z.string().min(1).optional() })

// Removes the forms of a barrel: one taster's when a taster is given, otherwise everyone's.
export async function deleteBarrelRatings(input: z.input<typeof DeleteSchema>): Promise<Result<void>> {
  await requireAdmin()
  const parsed = DeleteSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: "הבחירה אינה תקינה" })

  try {
    await prisma.barrelRating.deleteMany({ where: { fillId: parsed.data.fillId, ...(parsed.data.userId ? { userId: parsed.data.userId } : {}) } })
    revalidate()
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה במחיקת הדירוגים" })
  }
}

const ActiveSchema = z.object({ year: z.number().int().min(MIN_BARREL_YEAR).max(MAX_BARREL_YEAR), fillId: z.string().min(1) })

// Chooses the barrel the tasters of a year taste now. It is refused while some tasters have not saved a form for the barrel
// being tasted, unless nobody did yet.
export async function setActiveBarrel(input: z.input<typeof ActiveSchema>): Promise<Result<void>> {
  await requireAdmin()
  const parsed = ActiveSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: "הבחירה אינה תקינה" })

  const { year, fillId } = parsed.data
  try {
    const [fill, tasters, active] = await Promise.all([
      prisma.barrelFill.findUnique({ where: { id: fillId }, select: { year: true, _count: { select: { components: true } } } }),
      loadTasters(year),
      loadActiveTasting(year),
    ])
    if (!fill || fill.year !== year || fill._count.components === 0) return err({ code: "NOT_FOUND", message: "החבית לא נמצאה ביין של השנה הזו" })
    if (tasters.length === 0) return err({ code: "VALIDATION", message: "יש לבחור קודם את משתתפי הטעימה" })
    if (!canMoveOn(active)) {
      return err({ code: "VALIDATION", message: `עוד לא כל המשתתפים שמרו את הטופס: ${active.waiting.map((taster) => taster.username).join(", ")}` })
    }

    await prisma.blendTastingState.upsert({ where: { year }, create: { year, activeFillId: fillId, activatedAt: new Date() }, update: { activeFillId: fillId, activatedAt: new Date() } })
    revalidate()
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בבחירת החבית" })
  }
}
