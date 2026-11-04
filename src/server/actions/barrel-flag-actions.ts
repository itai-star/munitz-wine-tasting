"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { MAX_BARREL_YEAR, MIN_BARREL_YEAR } from "@/lib/barrel-room"
import { requirePermission } from "@/server/auth/guards"
import { ok, err } from "@/types"
import type { Result } from "@/types"

const FlagSchema = z.object({
  barrelId: z.string().min(1),
  year: z.number().int().min(MIN_BARREL_YEAR).max(MAX_BARREL_YEAR),
  includeInBottling: z.boolean().optional(),
  lastRound: z.boolean().optional(),
})

// Sets one or both marks of a barrel for a year. The row is created on the first change, and a mark that is not sent keeps
// its value, which is the default for a barrel that never had a row.
export async function setBarrelYearFlag(input: z.input<typeof FlagSchema>): Promise<Result<void>> {
  await requirePermission("BARRELS")
  const parsed = FlagSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.errors[0].message })

  const { barrelId, year, includeInBottling, lastRound } = parsed.data
  try {
    const barrel = await prisma.barrel.findUnique({ where: { id: barrelId }, select: { id: true } })
    if (!barrel) return err({ code: "NOT_FOUND", message: "החבית לא נמצאה" })

    await prisma.barrelYearFlag.upsert({
      where: { barrelId_year: { barrelId, year } },
      create: { barrelId, year, ...(includeInBottling === undefined ? {} : { includeInBottling }), ...(lastRound === undefined ? {} : { lastRound }) },
      update: { ...(includeInBottling === undefined ? {} : { includeInBottling }), ...(lastRound === undefined ? {} : { lastRound }) },
    })
    revalidatePath("/admin/barrels")
    revalidatePath("/admin/procurement")
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת הסימון" })
  }
}
