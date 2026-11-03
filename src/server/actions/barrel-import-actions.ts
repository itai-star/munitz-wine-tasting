"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { MAX_BARREL_NUMBER_LENGTH, MAX_BARREL_TYPE_LENGTH, isValidBarrelYear } from "@/lib/barrel-room"
import { requirePermission } from "@/server/auth/guards"
import { parseBarrelsWorkbook } from "@/server/barrels-excel"
import type { ParsedBarrelRow } from "@/server/barrels-excel"
import { ok, err } from "@/types"
import type { Result } from "@/types"

const MAX_FILE_BYTES = 5 * 1024 * 1024

export type BarrelsImportSummary = {
  created: number
  updated: number
  unchanged: number
  errors: { row: number; message: string }[]
}

// Only one barrel in stock can have a number, but several that left the stock can, so rows of barrels that left
// are told apart by their type and year as well.
function rowKey(row: ParsedBarrelRow): string {
  return row.removed ? `${row.number}|left|${row.type}|${row.year}` : `${row.number}|stock`
}

// Reads a list of barrels. A barrel in stock is matched by its number: a new number is added, and a number that
// is already in stock gets the type and year of the file when they differ. A number whose barrel left the stock
// may be used again, so a row for it adds a new barrel. A row marked as removed is matched with a barrel that
// already left with the same number, type and year, and otherwise is kept as a barrel that left. Loading a list
// never puts a barrel that was taken out back into stock. A row with a problem is reported while the other rows
// are still saved.
export async function importBarrelsFromExcel(formData: FormData): Promise<Result<BarrelsImportSummary>> {
  await requirePermission("BARRELS")

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return err({ code: "VALIDATION", message: "יש לבחור קובץ אקסל" })
  if (file.size > MAX_FILE_BYTES) return err({ code: "VALIDATION", message: "הקובץ גדול מדי" })

  let rows
  try {
    rows = await parseBarrelsWorkbook(await file.arrayBuffer())
  } catch {
    return err({ code: "VALIDATION", message: "לא ניתן לקרוא את הקובץ. יש להעלות קובץ אקסל בפורמט xlsx" })
  }
  if (!rows) return err({ code: "VALIDATION", message: "בקובץ חסרות העמודות מספר חבית, סוג ושנה" })

  const stored = await prisma.barrel.findMany({ select: { id: true, number: true, type: true, year: true, removedAt: true } })
  const inStock = new Map(stored.filter((barrel) => barrel.removedAt === null).map((barrel) => [barrel.number, barrel]))
  const left = stored.filter((barrel) => barrel.removedAt !== null)
  const errors: BarrelsImportSummary["errors"] = []
  const seen = new Set<string>()
  const creations: { number: string; type: string; year: number; removedAt: Date | null }[] = []
  const updates: { id: string; type: string; year: number }[] = []
  let unchanged = 0

  for (const row of rows) {
    if (!row.number) errors.push({ row: row.row, message: "חסר מספר חבית" })
    else if (row.number.length > MAX_BARREL_NUMBER_LENGTH) errors.push({ row: row.row, message: "מספר החבית ארוך מדי" })
    else if (!row.type) errors.push({ row: row.row, message: "חסר סוג" })
    else if (row.type.length > MAX_BARREL_TYPE_LENGTH) errors.push({ row: row.row, message: "הסוג ארוך מדי" })
    else if (row.year === null || !isValidBarrelYear(row.year)) errors.push({ row: row.row, message: "השנה חסרה או לא תקינה" })
    else if (seen.has(rowKey(row))) {
      errors.push({ row: row.row, message: row.removed ? "החבית הזו מופיעה בקובץ יותר מפעם אחת" : `המספר ${row.number} מופיע בקובץ יותר מפעם אחת` })
    } else {
      seen.add(rowKey(row))
      if (row.removed) {
        const known = left.some((barrel) => barrel.number === row.number && barrel.type === row.type && barrel.year === row.year)
        if (known) unchanged += 1
        else creations.push({ number: row.number, type: row.type, year: row.year, removedAt: new Date() })
      } else {
        const current = inStock.get(row.number)
        if (!current) creations.push({ number: row.number, type: row.type, year: row.year, removedAt: null })
        else if (current.type !== row.type || current.year !== row.year) updates.push({ id: current.id, type: row.type, year: row.year })
        else unchanged += 1
      }
    }
  }

  try {
    await prisma.$transaction([
      ...(creations.length > 0 ? [prisma.barrel.createMany({ data: creations })] : []),
      ...updates.map((update) => prisma.barrel.update({ where: { id: update.id }, data: { type: update.type, year: update.year } })),
    ])
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת החביות" })
  }
  revalidatePath("/admin/barrels")
  return ok({ created: creations.length, updated: updates.length, unchanged, errors })
}
