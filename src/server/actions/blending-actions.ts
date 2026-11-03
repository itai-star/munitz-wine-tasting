"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { MAX_BARREL_YEAR, MIN_BARREL_YEAR, normalizeText } from "@/lib/barrel-room"
import { MAX_SCORE, MIN_SCORE, remainingLiters, roundLiters, roundScore } from "@/lib/blending"
import { requirePermission } from "@/server/auth/guards"
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
const TastingSchema = z.object({
  fillId: z.string().min(1),
  score: z.number().min(MIN_SCORE, `הציון צריך להיות בין ${MIN_SCORE} ל-${MAX_SCORE}`).max(MAX_SCORE, `הציון צריך להיות בין ${MIN_SCORE} ל-${MAX_SCORE}`).nullable(),
  notes: z
    .string()
    .trim()
    .max(MAX_NOTES, "הרשמים ארוכים מדי")
    .transform((value) => value || null),
})

export async function createBlendWine(input: z.input<typeof CreateWineSchema>): Promise<Result<{ id: string }>> {
  await requirePermission("BARRELS")
  const parsed = CreateWineSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.errors[0].message })

  try {
    const wine = await prisma.blendWine.create({ data: parsed.data })
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

// The barrels of a deleted wine go back to the pile, since only the draws are removed.
export async function deleteBlendWine(id: string): Promise<Result<void>> {
  await requirePermission("BARRELS")
  if (id.length === 0) return err({ code: "VALIDATION", message: "היין לא נמצא" })

  try {
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

// The tasting of a barrel in its year: a score from 5 to 10 and the impressions, kept with its record of that year.
export async function setBarrelTasting(input: z.input<typeof TastingSchema>): Promise<Result<void>> {
  await requirePermission("BARRELS")
  const parsed = TastingSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.errors[0].message })

  try {
    await prisma.barrelFill.update({
      where: { id: parsed.data.fillId },
      data: { score: parsed.data.score === null ? null : roundScore(parsed.data.score), tastingNotes: parsed.data.notes },
    })
    revalidatePath(PAGE)
    revalidatePath("/admin/barrels")
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת רשמי הטעימה" })
  }
}
