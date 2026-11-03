"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  MAX_BARREL_NUMBER_LENGTH,
  MAX_BARREL_TYPE_LENGTH,
  MAX_BARREL_YEAR,
  MIN_BARREL_YEAR,
  normalizeText,
} from "@/lib/barrel-room"
import { requirePermission } from "@/server/auth/guards"
import { ok, err } from "@/types"
import type { Result } from "@/types"

const PAGE = "/admin/barrels"
const MAX_NOTE = 200
const NUMBER_TAKEN = "מספר החבית כבר קיים בחדר החביות, גם אם היא הוצאה מהמלאי"

const BarrelFieldsSchema = z.object({
  number: z
    .string()
    .transform(normalizeText)
    .pipe(z.string().min(1, "יש להזין מספר חבית").max(MAX_BARREL_NUMBER_LENGTH, "מספר החבית ארוך מדי")),
  type: z
    .string()
    .transform(normalizeText)
    .pipe(z.string().min(1, "יש להזין סוג חבית").max(MAX_BARREL_TYPE_LENGTH, "הסוג ארוך מדי")),
  year: z
    .number({ invalid_type_error: "יש להזין שנה" })
    .int("השנה צריכה להיות מספר שלם")
    .min(MIN_BARREL_YEAR, "השנה אינה תקינה")
    .max(MAX_BARREL_YEAR, "השנה אינה תקינה"),
})

const UpdateBarrelSchema = z.intersection(BarrelFieldsSchema, z.object({ id: z.string().min(1) }))

const RemoveSchema = z.object({
  id: z.string().min(1),
  note: z
    .string()
    .transform(normalizeText)
    .pipe(z.string().max(MAX_NOTE, "ההערה ארוכה מדי"))
    .transform((value) => value || null),
})

function isDuplicate(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
}

export async function createBarrel(input: z.input<typeof BarrelFieldsSchema>): Promise<Result<{ id: string }>> {
  await requirePermission("BARRELS")
  const parsed = BarrelFieldsSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.errors[0].message })

  try {
    const barrel = await prisma.barrel.create({ data: parsed.data })
    revalidatePath(PAGE)
    return ok({ id: barrel.id })
  } catch (error) {
    if (isDuplicate(error)) return err({ code: "DUPLICATE", message: NUMBER_TAKEN })
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת החבית" })
  }
}

export async function updateBarrel(input: z.input<typeof UpdateBarrelSchema>): Promise<Result<void>> {
  await requirePermission("BARRELS")
  const parsed = UpdateBarrelSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.errors[0].message })

  const { id, ...data } = parsed.data
  try {
    await prisma.barrel.update({ where: { id }, data })
    revalidatePath(PAGE)
    return ok(undefined)
  } catch (error) {
    if (isDuplicate(error)) return err({ code: "DUPLICATE", message: NUMBER_TAKEN })
    return err({ code: "SERVER_ERROR", message: "שגיאה בעדכון החבית" })
  }
}

// Taking a barrel out of stock keeps it with the date, and it can be put back.
export async function removeBarrelFromStock(input: z.input<typeof RemoveSchema>): Promise<Result<void>> {
  await requirePermission("BARRELS")
  const parsed = RemoveSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.errors[0].message })

  try {
    await prisma.barrel.update({ where: { id: parsed.data.id }, data: { removedAt: new Date(), removalNote: parsed.data.note } })
    revalidatePath(PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בהוצאת החבית מהמלאי" })
  }
}

export async function restoreBarrelToStock(id: string): Promise<Result<void>> {
  await requirePermission("BARRELS")
  if (id.length === 0) return err({ code: "VALIDATION", message: "החבית לא נמצאה" })

  try {
    await prisma.barrel.update({ where: { id }, data: { removedAt: null, removalNote: null } })
    revalidatePath(PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בהחזרת החבית למלאי" })
  }
}

// For a barrel added by mistake. A barrel that simply left the stock is better taken out, so it stays on record.
export async function deleteBarrel(id: string): Promise<Result<void>> {
  await requirePermission("BARRELS")
  if (id.length === 0) return err({ code: "VALIDATION", message: "החבית לא נמצאה" })

  try {
    await prisma.barrel.deleteMany({ where: { id } })
    revalidatePath(PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה במחיקת החבית" })
  }
}
