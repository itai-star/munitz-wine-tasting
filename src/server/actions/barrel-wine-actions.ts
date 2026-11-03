"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { MAX_BARREL_YEAR, MIN_BARREL_YEAR, stateInYear } from "@/lib/barrel-room"
import { validateShares } from "@/lib/barrel-wine"
import { loadBlockSupply } from "@/server/barrels-data"
import { requirePermission } from "@/server/auth/guards"
import { ok, err } from "@/types"
import type { Result } from "@/types"

const PAGE = "/admin/barrels"

const WineSchema = z.object({
  barrelId: z.string().min(1),
  year: z.number().int().min(MIN_BARREL_YEAR).max(MAX_BARREL_YEAR),
  // The vineyard blocks the wine comes from, chosen from the list of blocks, each with its share in percent.
  // No blocks means the barrel is empty.
  parts: z.array(z.object({ blockId: z.string().min(1), percent: z.number() })).max(20),
})

function roundShare(percent: number): number {
  return Math.round(percent * 10) / 10
}

// Sets what a barrel holds in a year, replacing the blocks it had. The record of the barrel for that year is kept even
// when the wine is cleared, because the lab tests of the year hang on it.
export async function setBarrelWine(input: z.input<typeof WineSchema>): Promise<Result<void>> {
  await requirePermission("BARRELS")
  const parsed = WineSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: "הנתונים אינם תקינים" })

  const { barrelId, year } = parsed.data
  const parts = parsed.data.parts.map((part) => ({ blockId: part.blockId, percent: roundShare(part.percent) }))
  if (new Set(parts.map((part) => part.blockId)).size !== parts.length) return err({ code: "VALIDATION", message: "אותו כרם נבחר יותר מפעם אחת" })
  const problem = validateShares(parts.map((part) => part.percent))
  if (problem) return err({ code: "VALIDATION", message: problem })

  try {
    const barrel = await prisma.barrel.findUnique({ where: { id: barrelId } })
    if (!barrel) return err({ code: "NOT_FOUND", message: "החבית לא נמצאה" })
    if (stateInYear({ year: barrel.year, removedOn: barrel.removedAt?.toISOString().slice(0, 10) ?? null }, year) === null) {
      return err({ code: "VALIDATION", message: "החבית לא הייתה בשימוש בשנה הזו" })
    }
    const known = await prisma.vineyardBlock.count({ where: { id: { in: parts.map((part) => part.blockId) } } })
    if (known !== parts.length) return err({ code: "NOT_FOUND", message: "אחד הכרמים לא נמצא ברשימה" })

    // Wine is put in a barrel by hand only from the finished wine of the year. A block the barrel already holds, for
    // example from a workbook, may stay.
    const [supply, current] = await Promise.all([
      loadBlockSupply(year),
      prisma.barrelFillBlock.findMany({ where: { fill: { barrelId, year } }, select: { blockId: true } }),
    ])
    const allowed = new Set([...supply.map((block) => block.id), ...current.map((part) => part.blockId)])
    if (parts.some((part) => !allowed.has(part.blockId))) {
      return err({ code: "VALIDATION", message: `אפשר להזין לחבית רק יין מהיין המוכן של שנת ${year}` })
    }

    await prisma.$transaction(async (tx) => {
      const fill = await tx.barrelFill.upsert({ where: { barrelId_year: { barrelId, year } }, create: { barrelId, year }, update: {} })
      await tx.barrelFillBlock.deleteMany({ where: { fillId: fill.id } })
      if (parts.length > 0) await tx.barrelFillBlock.createMany({ data: parts.map((part) => ({ fillId: fill.id, ...part })) })
    })
    revalidatePath(PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בעדכון היין בחבית" })
  }
}
