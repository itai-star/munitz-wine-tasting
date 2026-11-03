"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/server/auth/guards"
import { ok, err } from "@/types"
import type { Result } from "@/types"

const PAGE = "/admin/finished-wine"
const MAX_LITERS = 1_000_000

const FreshAllocationSchema = z.object({
  vintageId: z.string().min(1),
  variety: z
    .string()
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .pipe(z.string().min(1, "יש לבחור זן").max(60)),
  liters: z.number().int("הכמות צריכה להיות מספר שלם").min(1, "הכמות צריכה להיות גדולה מאפס").max(MAX_LITERS, "הכמות גבוהה מדי"),
})

// One entry per variety and vintage: setting a variety again replaces its liters.
export async function setFreshAllocation(input: z.input<typeof FreshAllocationSchema>): Promise<Result<void>> {
  await requirePermission("HARVEST")
  const parsed = FreshAllocationSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.errors[0].message })

  const { vintageId, variety, liters } = parsed.data
  try {
    await prisma.freshAllocation.upsert({
      where: { vintageId_variety: { vintageId, variety } },
      create: { vintageId, variety, liters },
      update: { liters },
    })
    revalidatePath(PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת כמות הרענן" })
  }
}

export async function deleteFreshAllocation(id: string): Promise<Result<void>> {
  await requirePermission("HARVEST")
  if (id.length === 0) return err({ code: "VALIDATION", message: "הרשומה לא נמצאה" })

  try {
    await prisma.freshAllocation.deleteMany({ where: { id } })
    revalidatePath(PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה במחיקת כמות הרענן" })
  }
}
