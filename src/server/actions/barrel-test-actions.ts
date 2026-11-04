"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { MAX_BARREL_YEAR, MIN_BARREL_YEAR, stateInYear } from "@/lib/barrel-room"
import { BarrelLabFieldsSchema } from "@/lib/lab-test-schema"
import { requirePermission } from "@/server/auth/guards"
import { ok, err } from "@/types"
import type { Result } from "@/types"

const PAGE = "/admin/barrels"

const CreateBarrelTestSchema = BarrelLabFieldsSchema.extend({
  barrelId: z.string().min(1),
  year: z.number().int().min(MIN_BARREL_YEAR).max(MAX_BARREL_YEAR),
})

const UpdateBarrelTestSchema = BarrelLabFieldsSchema.extend({ id: z.string().min(1) })

// A test is kept with the barrel's record of the year it was taken for. The record is created when the first test
// is added to a barrel that has no wine set for that year yet.
export async function createBarrelTest(input: z.input<typeof CreateBarrelTestSchema>): Promise<Result<{ id: string }>> {
  await requirePermission("BARRELS")
  const parsed = CreateBarrelTestSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.errors[0].message })

  const { barrelId, year, ...fields } = parsed.data
  try {
    const barrel = await prisma.barrel.findUnique({ where: { id: barrelId } })
    if (!barrel) return err({ code: "NOT_FOUND", message: "החבית לא נמצאה" })
    if (stateInYear({ year: barrel.year, removedOn: barrel.removedAt?.toISOString().slice(0, 10) ?? null }, year) === null) {
      return err({ code: "VALIDATION", message: "החבית לא הייתה בשימוש בשנה הזו" })
    }

    const test = await prisma.$transaction(async (tx) => {
      const fill = await tx.barrelFill.upsert({ where: { barrelId_year: { barrelId, year } }, create: { barrelId, year }, update: {} })
      return tx.barrelLabTest.create({ data: { fillId: fill.id, ...fields } })
    })
    revalidatePath(PAGE)
    return ok({ id: test.id })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת בדיקת המעבדה" })
  }
}

export async function updateBarrelTest(input: z.input<typeof UpdateBarrelTestSchema>): Promise<Result<void>> {
  await requirePermission("BARRELS")
  const parsed = UpdateBarrelTestSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.errors[0].message })

  const { id, ...data } = parsed.data
  try {
    await prisma.barrelLabTest.update({ where: { id }, data })
    revalidatePath(PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בעדכון בדיקת המעבדה" })
  }
}

export async function deleteBarrelTest(id: string): Promise<Result<void>> {
  await requirePermission("BARRELS")
  if (id.length === 0) return err({ code: "VALIDATION", message: "הבדיקה לא נמצאה" })

  try {
    await prisma.barrelLabTest.deleteMany({ where: { id } })
    revalidatePath(PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה במחיקת בדיקת המעבדה" })
  }
}
