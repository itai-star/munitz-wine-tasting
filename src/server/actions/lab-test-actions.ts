"use server"

import ExcelJS from "exceljs"
import { prisma } from "@/lib/prisma"
import { ok, err } from "@/types"
import type { Result } from "@/types"
import { z } from "zod"

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

const roundedNumber = z
  .number()
  .nullable()
  .transform((value) => (value == null ? null : round2(value)))

const LabTestSchema = z.object({
  finishedWineId: z.string().min(1),
  testDate: z.coerce.date(),
  lab: z.string().trim().min(1).nullable(),
  density: roundedNumber,
  ethanol: roundedNumber,
  ph: roundedNumber,
  totalAcid: roundedNumber,
  volatile: roundedNumber,
  rsBx: roundedNumber,
  co2: roundedNumber,
  malicAcid: roundedNumber,
  notes: z.string().trim().min(1).nullable(),
})

export async function createLabTest(
  input: z.infer<typeof LabTestSchema>
): Promise<Result<{ id: string }>> {
  const parsed = LabTestSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  try {
    const test = await prisma.labTest.create({ data: parsed.data })
    return ok({ id: test.id })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת בדיקת המעבדה" })
  }
}

export async function listLabTests(
  finishedWineId: string
): Promise<Result<Awaited<ReturnType<typeof prisma.labTest.findMany>>>> {
  try {
    const tests = await prisma.labTest.findMany({
      where: { finishedWineId },
      orderBy: { testDate: "asc" },
    })
    return ok(tests)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת בדיקות המעבדה" })
  }
}

export async function deleteLabTest(id: string): Promise<Result<void>> {
  try {
    await prisma.labTest.delete({ where: { id } })
    return ok(undefined)
  } catch {
    return err({ code: "NOT_FOUND", message: "הבדיקה לא נמצאה" })
  }
}

const EXPECTED_HEADERS = [
  "תאריך",
  "מעבדה",
  "Density",
  "Ethanol",
  "pH",
  "Total Acid",
  "Volatile",
  "RS/Bx",
  "CO2",
  "Malic Acid",
  "הערות",
] as const

type ImportRowError = { row: number; message: string }

export async function importLabTestsFromExcel(
  finishedWineId: string,
  formData: FormData
): Promise<Result<{ imported: number; errors: ImportRowError[] }>> {
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return err({ code: "VALIDATION", message: "לא נבחר קובץ" })
  }

  const existing = await prisma.labTest.findMany({
    where: { finishedWineId },
    select: { testDate: true },
  })
  const seenDates = new Set(existing.map((t) => t.testDate.toISOString().slice(0, 10)))

  let workbook: ExcelJS.Workbook
  try {
    const buffer = await file.arrayBuffer()
    workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
  } catch {
    return err({ code: "VALIDATION", message: "לא ניתן לקרוא את הקובץ — ודא שזהו קובץ xlsx תקין" })
  }

  const sheet = workbook.worksheets[0]
  if (!sheet) {
    return err({ code: "VALIDATION", message: "הקובץ ריק" })
  }

  const headerRow = sheet.getRow(1)
  const columnIndexByHeader = new Map<string, number>()
  headerRow.eachCell((cell, colNumber) => {
    columnIndexByHeader.set(normalizeHeader(cell.text), colNumber)
  })

  const missingHeaders = EXPECTED_HEADERS.filter(
    (h) => !columnIndexByHeader.has(normalizeHeader(h))
  )
  if (missingHeaders.length > 0) {
    return err({
      code: "VALIDATION",
      message: `חסרות עמודות בקובץ: ${missingHeaders.join(", ")}`,
    })
  }

  const rowsToInsert: z.infer<typeof LabTestSchema>[] = []
  const errors: ImportRowError[] = []

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber)
    if (row.cellCount === 0) continue

    const getCell = (header: string): ExcelJS.Cell | null => {
      const colIndex = columnIndexByHeader.get(normalizeHeader(header))
      return colIndex ? row.getCell(colIndex) : null
    }

    const testDate = parseExcelDate(getCell("תאריך"))
    if (!testDate) {
      if (cellText(getCell("תאריך")).length === 0 && !hasAnyValue(row)) continue
      errors.push({ row: rowNumber, message: "תאריך חסר או לא תקין" })
      continue
    }

    const dateKey = testDate.toISOString().slice(0, 10)
    if (seenDates.has(dateKey)) {
      errors.push({ row: rowNumber, message: "כבר קיימת בדיקה לתאריך הזה — דולגה (כפילות)" })
      continue
    }
    seenDates.add(dateKey)

    const parsed = LabTestSchema.safeParse({
      finishedWineId,
      testDate,
      lab: parseTextCell(getCell("מעבדה")),
      density: parseNumericCell(getCell("Density")),
      ethanol: parseNumericCell(getCell("Ethanol")),
      ph: parseNumericCell(getCell("pH")),
      totalAcid: parseNumericCell(getCell("Total Acid")),
      volatile: parseNumericCell(getCell("Volatile")),
      rsBx: parseNumericCell(getCell("RS/Bx")),
      co2: parseNumericCell(getCell("CO2")),
      malicAcid: parseNumericCell(getCell("Malic Acid")),
      notes: parseTextCell(getCell("הערות")),
    })

    if (!parsed.success) {
      errors.push({ row: rowNumber, message: parsed.error.errors[0].message })
      continue
    }

    rowsToInsert.push(parsed.data)
  }

  if (rowsToInsert.length === 0) {
    return ok({ imported: 0, errors })
  }

  try {
    await prisma.labTest.createMany({ data: rowsToInsert })
    return ok({ imported: rowsToInsert.length, errors })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת הבדיקות שיובאו" })
  }
}

function hasAnyValue(row: ExcelJS.Row): boolean {
  let found = false
  row.eachCell((cell) => {
    if (cellText(cell).length > 0) found = true
  })
  return found
}

const INVISIBLE_CHARS = new RegExp("[\\u200B-\\u200F\\u202A-\\u202E\\uFEFF]", "g")

function normalizeHeader(value: string): string {
  return value.replace(INVISIBLE_CHARS, "").trim().toLowerCase()
}

function cellText(cell: ExcelJS.Cell | null): string {
  if (!cell) return ""
  return String(cell.text ?? "")
    .replace(INVISIBLE_CHARS, "")
    .trim()
}

function parseNumericCell(cell: ExcelJS.Cell | null): number | null {
  if (!cell) return null
  if (typeof cell.value === "number") return cell.value
  const text = cellText(cell)
  if (text.length === 0) return null
  const num = Number(text.replace(",", "."))
  return Number.isFinite(num) ? num : null
}

function parseTextCell(cell: ExcelJS.Cell | null): string | null {
  const text = cellText(cell)
  return text.length > 0 ? text : null
}

function parseExcelDate(cell: ExcelJS.Cell | null): Date | null {
  if (!cell) return null
  if (cell.value instanceof Date) return cell.value
  const text = cellText(cell)
  if (text.length === 0) return null
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
