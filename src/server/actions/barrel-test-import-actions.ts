"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { MAX_BARREL_YEAR, MIN_BARREL_YEAR } from "@/lib/barrel-room"
import { parseDayKey } from "@/lib/calendar-events"
import { requirePermission } from "@/server/auth/guards"
import { MEASURES, parseBarrelTestsWorkbook } from "@/server/barrel-test-excel"
import type { MeasureKey, ParsedTestRow } from "@/server/barrel-test-excel"
import { barrelsInYear, matchBarrel } from "@/server/barrel-year-match"
import { ok, err } from "@/types"
import type { Result } from "@/types"

const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_TEXT = 500

export type BarrelTestsImportSummary = {
  created: number
  updated: number
  unchanged: number
  errors: { row: number; message: string }[]
}

type Fields = {
  lab: string | null
  notes: string | null
  actionItems: string | null
} & Record<MeasureKey, number | null>

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function appendIfNew(existing: string | null, imported: string | null): string | null | undefined {
  if (imported === null) return undefined
  if (existing === null) return imported
  return existing.includes(imported) ? undefined : [existing, imported].join("\n")
}

// What a row changes in a test that is already there: a value that is written replaces the one before, an empty cell
// never erases, and a note is added below the earlier one unless it is already in it.
function changesTo(existing: Fields, imported: Fields): Partial<Fields> {
  const changes: Partial<Fields> = {}
  if (imported.lab !== null && imported.lab !== existing.lab) changes.lab = imported.lab
  for (const measure of MEASURES) {
    const value = imported[measure.key]
    if (value !== null && value !== existing[measure.key]) changes[measure.key] = value
  }
  const notes = appendIfNew(existing.notes, imported.notes)
  if (notes !== undefined) changes.notes = notes
  const actionItems = appendIfNew(existing.actionItems, imported.actionItems)
  if (actionItems !== undefined) changes.actionItems = actionItems
  return changes
}

function fieldsOf(row: ParsedTestRow): Fields | string {
  const values = {} as Record<MeasureKey, number | null>
  for (const measure of MEASURES) {
    const value = row.values[measure.key]
    if (value === "invalid") return `הערך בעמודה ${measure.header} אינו מספר`
    values[measure.key] = value === undefined ? null : round2(value)
  }
  return { lab: row.lab, notes: row.notes, actionItems: row.actionItems, ...values }
}

// Loads the lab tests of many barrels for one year from a workbook. A row belongs to the barrel whose number it carries,
// among the barrels in use that year, and to a test of the day: a day the barrel already has a test for is updated with
// what the row writes, and a new day adds a test. So the same file can be loaded again without doubling the tests.
// A row with a problem is reported while the other rows are still saved.
export async function importBarrelTestsFromExcel(formData: FormData): Promise<Result<BarrelTestsImportSummary>> {
  await requirePermission("BARRELS")

  const year = Number(formData.get("year"))
  if (!Number.isInteger(year) || year < MIN_BARREL_YEAR || year > MAX_BARREL_YEAR) return err({ code: "VALIDATION", message: "השנה אינה תקינה" })
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return err({ code: "VALIDATION", message: "יש לבחור קובץ אקסל" })
  if (file.size > MAX_FILE_BYTES) return err({ code: "VALIDATION", message: "הקובץ גדול מדי" })

  let rows
  try {
    rows = await parseBarrelTestsWorkbook(await file.arrayBuffer())
  } catch {
    return err({ code: "VALIDATION", message: "לא ניתן לקרוא את הקובץ. יש להעלות קובץ אקסל בפורמט xlsx" })
  }
  if (!rows) return err({ code: "VALIDATION", message: "בקובץ חסרות העמודות מספר חבית ותאריך" })

  const [barrels, fills] = await Promise.all([
    prisma.barrel.findMany(),
    prisma.barrelFill.findMany({ where: { year }, include: { tests: true } }),
  ])
  const inYear = barrelsInYear(barrels, year)
  const fillOf = new Map(fills.map((fill) => [fill.barrelId, fill]))

  const errors: BarrelTestsImportSummary["errors"] = []
  const seen = new Set<string>()
  const newTests: { barrelId: string; date: Date; fields: Fields }[] = []
  const updates: { id: string; changes: Partial<Fields> }[] = []
  let unchanged = 0

  for (const row of rows) {
    if (row.number === "") {
      errors.push({ row: row.row, message: "חסר מספר חבית" })
      continue
    }
    const match = matchBarrel(inYear, row.number, year)
    if ("error" in match) {
      errors.push({ row: row.row, message: match.error })
      continue
    }
    if (row.date === null || row.date === "invalid") {
      errors.push({ row: row.row, message: "התאריך חסר או לא תקין" })
      continue
    }
    const fields = fieldsOf(row)
    if (typeof fields === "string") {
      errors.push({ row: row.row, message: fields })
      continue
    }
    if ([fields.lab, fields.notes, fields.actionItems].some((text) => text !== null && text.length > MAX_TEXT)) {
      errors.push({ row: row.row, message: "אחד הטקסטים ארוך מדי" })
      continue
    }
    const key = `${match.barrel.id}|${row.date}`
    if (seen.has(key)) {
      errors.push({ row: row.row, message: `לחבית ${row.number} יש בקובץ כמה בדיקות באותו תאריך` })
      continue
    }
    seen.add(key)

    const existing = fillOf.get(match.barrel.id)?.tests.find((test) => test.testDate.toISOString().slice(0, 10) === row.date)
    if (!existing) {
      newTests.push({ barrelId: match.barrel.id, date: parseDayKey(row.date) as Date, fields })
      continue
    }
    const changes = changesTo(existing, fields)
    if (Object.keys(changes).length === 0) unchanged += 1
    else updates.push({ id: existing.id, changes })
  }

  try {
    await prisma.$transaction(async (tx) => {
      const needFill = Array.from(new Set(newTests.map((test) => test.barrelId))).filter((barrelId) => !fillOf.has(barrelId))
      if (needFill.length > 0) await tx.barrelFill.createMany({ data: needFill.map((barrelId) => ({ barrelId, year })) })
      const fillIds = new Map((await tx.barrelFill.findMany({ where: { year, barrelId: { in: newTests.map((test) => test.barrelId) } }, select: { id: true, barrelId: true } })).map((fill) => [fill.barrelId, fill.id]))

      if (newTests.length > 0) {
        await tx.barrelLabTest.createMany({
          data: newTests.map((test) => ({ fillId: fillIds.get(test.barrelId) as string, testDate: test.date, ...test.fields })),
        })
      }
      for (const update of updates) await tx.barrelLabTest.update({ where: { id: update.id }, data: update.changes })
    })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת הבדיקות" })
  }
  revalidatePath("/admin/barrels")
  return ok({ created: newTests.length, updated: updates.length, unchanged, errors })
}
