"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { MAX_BARREL_YEAR, MIN_BARREL_YEAR, normalizeText } from "@/lib/barrel-room"
import { remainingLiters, roundLiters } from "@/lib/blending"
import { requireAdmin, requirePermission } from "@/server/auth/guards"
import { ok, err } from "@/types"
import type { Result } from "@/types"

const PAGE = "/admin/blending"
const MAX_NAME = 80
const MAX_DESCRIPTION = 2000
const MAX_NOTES = 2000

const WineFieldsSchema = z.object({
  name: z.string().transform(normalizeText).pipe(z.string().min(1, "יש להזין שם ליין").max(MAX_NAME, "השם ארוך מדי")),
  description: z
    .string()
    .trim()
    .max(MAX_DESCRIPTION, "התיאור ארוך מדי")
    .transform((value) => value || null),
})

const CreateWineSchema = WineFieldsSchema.extend({ year: z.number().int().min(MIN_BARREL_YEAR).max(MAX_BARREL_YEAR) })
const UpdateWineSchema = WineFieldsSchema.extend({ id: z.string().min(1), finalized: z.boolean() })
const MoveSchema = z.object({ wineId: z.string().min(1), fillId: z.string().min(1), liters: z.number().positive("הכמות צריכה להיות גדולה מאפס").optional() })
const NotesSchema = z.object({
  fillId: z.string().min(1),
  notes: z
    .string()
    .trim()
    .max(MAX_NOTES, "ההערה ארוכה מדי")
    .transform((value) => value || null),
})

export async function createBlendWine(input: z.input<typeof CreateWineSchema>): Promise<Result<{ id: string }>> {
  await requirePermission("BARRELS")
  const parsed = CreateWineSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.errors[0].message })

  try {
    // A new wine goes to the bottom of the year's wines.
    const last = await prisma.blendWine.aggregate({ where: { year: parsed.data.year }, _max: { position: true } })
    const wine = await prisma.blendWine.create({ data: { ...parsed.data, position: (last._max.position ?? -1) + 1 } })
    revalidatePath(PAGE)
    return ok({ id: wine.id })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת היין" })
  }
}

export async function updateBlendWine(input: z.input<typeof UpdateWineSchema>): Promise<Result<void>> {
  await requirePermission("BARRELS")
  const parsed = UpdateWineSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.errors[0].message })

  const { id, ...data } = parsed.data
  try {
    await prisma.blendWine.update({ where: { id }, data })
    revalidatePath(PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בעדכון היין" })
  }
}

// A wine is deleted only when it is empty, so no wine is lost by mistake. One that still holds barrels is emptied first.
export async function deleteBlendWine(id: string): Promise<Result<void>> {
  await requirePermission("BARRELS")
  if (id.length === 0) return err({ code: "VALIDATION", message: "היין לא נמצא" })

  try {
    const wine = await prisma.blendWine.findUnique({ where: { id }, select: { _count: { select: { draws: true } } } })
    if (!wine) return err({ code: "NOT_FOUND", message: "היין לא נמצא" })
    if (wine._count.draws > 0) return err({ code: "VALIDATION", message: "אי אפשר למחוק מיכל שיש בו יין. קודם מרוקנים אותו בלחיצה על איפוס היין" })
    await prisma.blendWine.deleteMany({ where: { id } })
    revalidatePath(PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה במחיקת היין" })
  }
}

// Pours a barrel, or part of it, into a wine. Without an amount the whole of what the barrel still holds is taken. The amount
// is checked against what is left in the barrel after all the wines it already fed, and it is added to what the barrel
// already gave this wine.
export async function addBarrelToWine(input: z.input<typeof MoveSchema>): Promise<Result<void>> {
  await requirePermission("BARRELS")
  const parsed = MoveSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.errors[0].message })

  const { wineId, fillId } = parsed.data
  try {
    const result = await prisma.$transaction(async (tx): Promise<Result<void>> => {
      const [wine, fill] = await Promise.all([
        tx.blendWine.findUnique({ where: { id: wineId } }),
        tx.barrelFill.findUnique({ where: { id: fillId }, include: { draws: true, components: { select: { id: true } } } }),
      ])
      if (!wine || !fill) return err({ code: "NOT_FOUND", message: "היין או החבית לא נמצאו" })
      if (wine.year !== fill.year) return err({ code: "VALIDATION", message: "החבית והיין צריכים להיות מאותה שנה" })
      if (fill.components.length === 0) return err({ code: "VALIDATION", message: "לחבית לא הוזן יין לשנה הזו" })

      const left = remainingLiters(fill.draws.reduce((sum, draw) => sum + draw.liters, 0))
      const liters = roundLiters(parsed.data.liters ?? left)
      if (left <= 0) return err({ code: "VALIDATION", message: "בחבית לא נשאר יין" })
      if (liters > left) return err({ code: "VALIDATION", message: `בחבית נשארו ${left} ליטר, ואי אפשר לקחת ${liters}` })

      const existing = fill.draws.find((draw) => draw.wineId === wineId)
      if (existing) await tx.blendDraw.update({ where: { id: existing.id }, data: { liters: roundLiters(existing.liters + liters) } })
      else await tx.blendDraw.create({ data: { wineId, fillId, liters } })
      return ok(undefined)
    })
    if (result.success) revalidatePath(PAGE)
    return result
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בהוספת החבית ליין" })
  }
}

export async function removeBarrelFromWine(input: { wineId: string; fillId: string }): Promise<Result<void>> {
  await requirePermission("BARRELS")
  try {
    await prisma.blendDraw.deleteMany({ where: { wineId: input.wineId, fillId: input.fillId } })
    revalidatePath(PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בהוצאת החבית מהיין" })
  }
}

// Puts back into the pile every barrel poured into the wine.
export async function clearBlendWine(wineId: string): Promise<Result<void>> {
  await requirePermission("BARRELS")
  if (wineId.length === 0) return err({ code: "VALIDATION", message: "היין לא נמצא" })

  try {
    await prisma.blendDraw.deleteMany({ where: { wineId } })
    revalidatePath(PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה באיפוס היין" })
  }
}

// The administrator's general note on a barrel in its year, kept with its record of that year.
export async function setBarrelNotes(input: z.input<typeof NotesSchema>): Promise<Result<void>> {
  await requireAdmin()
  const parsed = NotesSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.errors[0].message })

  try {
    await prisma.barrelFill.update({ where: { id: parsed.data.fillId }, data: { tastingNotes: parsed.data.notes } })
    revalidatePath(PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת ההערה" })
  }
}

const MoveWineSchema = z.object({ id: z.string().min(1), direction: z.enum(["up", "down"]) })

// Moves a wine one place up or down among the wines of its year. The places are numbered again from the top, so equal or missing
// numbers are put right on the way.
export async function moveBlendWine(input: z.input<typeof MoveWineSchema>): Promise<Result<void>> {
  await requirePermission("BARRELS")
  const parsed = MoveWineSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: "הבחירה אינה תקינה" })

  const { id, direction } = parsed.data
  try {
    const wine = await prisma.blendWine.findUnique({ where: { id }, select: { year: true } })
    if (!wine) return err({ code: "NOT_FOUND", message: "היין לא נמצא" })
    const wines = await prisma.blendWine.findMany({ where: { year: wine.year }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true } })
    const ids = wines.map((entry) => entry.id)
    const from = ids.indexOf(id)
    const to = direction === "up" ? from - 1 : from + 1
    if (to < 0 || to >= ids.length) return ok(undefined)
    ;[ids[from], ids[to]] = [ids[to], ids[from]]
    await prisma.$transaction(ids.map((wineId, position) => prisma.blendWine.update({ where: { id: wineId }, data: { position } })))
    revalidatePath(PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בהזזת המיכל" })
  }
}
