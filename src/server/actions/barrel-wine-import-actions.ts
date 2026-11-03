"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { MAX_BARREL_YEAR, MIN_BARREL_YEAR } from "@/lib/barrel-room"
import { parseWine } from "@/lib/barrel-wine"
import { normalizeHeader } from "@/lib/vineyard-excel"
import { requirePermission } from "@/server/auth/guards"
import { parseBarrelWineWorkbook } from "@/server/barrel-wine-excel"
import { barrelsInYear, matchBarrel } from "@/server/barrel-year-match"
import { ok, err } from "@/types"
import type { Result } from "@/types"

const MAX_FILE_BYTES = 5 * 1024 * 1024

export type BarrelWineImportSummary = {
  // The header of the column the wine was read from, so a wrong column is easy to notice.
  column: string
  updated: number
  unchanged: number
  skippedEmpty: number
  errors: { row: number; message: string }[]
}

type Part = { blockId: string; percent: number }

function sameWine(current: Part[], next: Part[]): boolean {
  return current.length === next.length && next.every((part) => current.some((known) => known.blockId === part.blockId && known.percent === part.percent))
}

// Sets the wine of the barrels for one year from a workbook of barrel number and wine. The wine is written as the names of
// vineyard blocks with their shares, "SHCF (65%) + PKMR (35%)", or as the name of one block; every block must already be
// on the list. A barrel is the one in use in that year with the number; when a number was used by two barrels in that year,
// the one still in stock is taken. An empty wine cell leaves the barrel as it is. A row with a problem is reported while
// the other rows are still saved.
export async function importBarrelWineFromExcel(formData: FormData): Promise<Result<BarrelWineImportSummary>> {
  await requirePermission("BARRELS")

  const year = Number(formData.get("year"))
  if (!Number.isInteger(year) || year < MIN_BARREL_YEAR || year > MAX_BARREL_YEAR) return err({ code: "VALIDATION", message: "השנה אינה תקינה" })
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return err({ code: "VALIDATION", message: "יש לבחור קובץ אקסל" })
  if (file.size > MAX_FILE_BYTES) return err({ code: "VALIDATION", message: "הקובץ גדול מדי" })

  let sheet
  try {
    sheet = await parseBarrelWineWorkbook(await file.arrayBuffer(), year)
  } catch {
    return err({ code: "VALIDATION", message: "לא ניתן לקרוא את הקובץ. יש להעלות קובץ אקסל בפורמט xlsx" })
  }
  if (!sheet) return err({ code: "VALIDATION", message: "בקובץ חסרות העמודות מספר חבית ויין" })
  const { rows } = sheet

  const [barrels, blocks, fills] = await Promise.all([
    prisma.barrel.findMany(),
    prisma.vineyardBlock.findMany({ select: { id: true, name: true } }),
    prisma.barrelFill.findMany({ where: { year }, select: { barrelId: true, components: { select: { blockId: true, percent: true } } } }),
  ])
  const blockKey = (name: string): string => normalizeHeader(name).toLowerCase()
  const blockByName = new Map(blocks.map((block) => [blockKey(block.name), block.id]))
  const currentParts = new Map(fills.map((fill) => [fill.barrelId, fill.components]))
  const inYear = barrelsInYear(barrels, year)

  const errors: BarrelWineImportSummary["errors"] = []
  const seen = new Set<string>()
  const updates: { barrelId: string; parts: Part[] }[] = []
  let unchanged = 0
  let skippedEmpty = 0

  for (const row of rows) {
    const match = matchBarrel(inYear, row.number, year)
    if ("error" in match) {
      errors.push({ row: row.row, message: match.error })
      continue
    }
    if (seen.has(row.number)) {
      errors.push({ row: row.row, message: `חבית ${row.number} מופיעה בקובץ יותר מפעם אחת` })
      continue
    }
    seen.add(row.number)

    if (row.wine === "") {
      skippedEmpty += 1
      continue
    }
    const parsed = parseWine(row.wine)
    if ("error" in parsed) {
      errors.push({ row: row.row, message: parsed.error })
      continue
    }
    const unknown = parsed.parts.find((part) => !blockByName.has(blockKey(part.name)))
    if (unknown) {
      errors.push({ row: row.row, message: `הכרם "${unknown.name}" לא קיים ברשימת הכרמים` })
      continue
    }
    const parts = parsed.parts.map((part) => ({ blockId: blockByName.get(blockKey(part.name)) as string, percent: Math.round(part.percent * 10) / 10 }))
    if (new Set(parts.map((part) => part.blockId)).size !== parts.length) {
      errors.push({ row: row.row, message: "אותו כרם מופיע יותר מפעם אחת" })
      continue
    }

    if (sameWine(currentParts.get(match.barrel.id) ?? [], parts)) unchanged += 1
    else updates.push({ barrelId: match.barrel.id, parts })
  }

  try {
    await prisma.$transaction(
      updates.map((update) =>
        prisma.barrelFill.upsert({
          where: { barrelId_year: { barrelId: update.barrelId, year } },
          create: { barrelId: update.barrelId, year, components: { create: update.parts } },
          update: { components: { deleteMany: {}, create: update.parts } },
        }),
      ),
    )
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת היין בחביות" })
  }
  revalidatePath("/admin/barrels")
  return ok({ column: sheet.column, updated: updates.length, unchanged, skippedEmpty, errors })
}
