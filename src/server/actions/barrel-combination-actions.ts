"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/server/auth/guards"
import { ok, err } from "@/types"
import type { Result } from "@/types"

const PAGE = "/admin/finished-wine"
const MIN_VARIETIES = 2
const ALREADY_IN_COMBINATION = "הזן כבר נמצא בשילוב הזה"

const VarietySchema = z.string().transform((value) => value.replace(/\s+/g, " ").trim()).pipe(z.string().min(1).max(60))

const CreateSchema = z.object({
  varieties: z.array(VarietySchema).min(MIN_VARIETIES, "שילוב חייב לכלול לפחות שני זנים"),
})

const AddSchema = z.object({ combinationId: z.string().min(1), variety: VarietySchema })

function isDuplicate(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
}

export async function createBarrelCombination(input: z.input<typeof CreateSchema>): Promise<Result<{ id: string }>> {
  await requirePermission("HARVEST")
  const parsed = CreateSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.errors[0].message })

  const varieties = Array.from(new Set(parsed.data.varieties))
  if (varieties.length < MIN_VARIETIES) return err({ code: "VALIDATION", message: "שילוב חייב לכלול לפחות שני זנים" })

  try {
    const combination = await prisma.barrelCombination.create({
      data: { varieties: { create: varieties.map((variety) => ({ variety })) } },
    })
    revalidatePath(PAGE)
    return ok({ id: combination.id })
  } catch (error) {
    if (isDuplicate(error)) return err({ code: "DUPLICATE", message: ALREADY_IN_COMBINATION })
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת השילוב" })
  }
}

export async function addVarietyToCombination(input: z.input<typeof AddSchema>): Promise<Result<void>> {
  await requirePermission("HARVEST")
  const parsed = AddSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: "יש לבחור זן" })

  try {
    await prisma.barrelCombinationVariety.create({
      data: { combinationId: parsed.data.combinationId, variety: parsed.data.variety },
    })
    revalidatePath(PAGE)
    return ok(undefined)
  } catch (error) {
    if (isDuplicate(error)) return err({ code: "DUPLICATE", message: ALREADY_IN_COMBINATION })
    return err({ code: "SERVER_ERROR", message: "שגיאה בהוספת הזן לשילוב" })
  }
}

// A combination left with a single variety means nothing, so it is removed with its last pair.
export async function removeVarietyFromCombination(input: z.input<typeof AddSchema>): Promise<Result<void>> {
  await requirePermission("HARVEST")
  const parsed = AddSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: "יש לבחור זן" })

  const { combinationId, variety } = parsed.data
  try {
    await prisma.$transaction(async (tx) => {
      await tx.barrelCombinationVariety.deleteMany({ where: { combinationId, variety } })
      const remaining = await tx.barrelCombinationVariety.count({ where: { combinationId } })
      if (remaining < MIN_VARIETIES) await tx.barrelCombination.deleteMany({ where: { id: combinationId } })
    })
    revalidatePath(PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בהסרת הזן מהשילוב" })
  }
}

export async function deleteBarrelCombination(id: string): Promise<Result<void>> {
  await requirePermission("HARVEST")
  if (id.length === 0) return err({ code: "VALIDATION", message: "השילוב לא נמצא" })

  try {
    await prisma.barrelCombination.deleteMany({ where: { id } })
    revalidatePath(PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה במחיקת השילוב" })
  }
}
