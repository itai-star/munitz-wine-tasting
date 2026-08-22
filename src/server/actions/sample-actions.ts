"use server"

import ExcelJS from "exceljs"
import { prisma } from "@/lib/prisma"
import { ok, err } from "@/types"
import type { Result } from "@/types"
import { z } from "zod"

const SampleSchema = z.object({
  vintageId: z.string().min(1),
  blockId: z.string().min(1),
  sampleDate: z.coerce.date(),
  brix: z.number().nullable(),
  ph: z.number().nullable(),
  titratableAcidity: z.number().nullable(),
  color: z.string().trim().min(1).nullable(),
})

export async function createSample(
  input: z.infer<typeof SampleSchema>
): Promise<Result<{ id: string }>> {
  const parsed = SampleSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  try {
    const sample = await prisma.ripenessSample.create({ data: parsed.data })
    return ok({ id: sample.id })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת הדגימה" })
  }
}

export async function listSamples(
  vintageId: string,
  blockId?: string
): Promise<Result<Awaited<ReturnType<typeof prisma.ripenessSample.findMany>>>> {
  try {
    const samples = await prisma.ripenessSample.findMany({
      where: { vintageId, ...(blockId ? { blockId } : {}) },
      orderBy: { sampleDate: "asc" },
    })
    return ok(samples)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת הדגימות" })
  }
}

const EXPECTED_HEADERS = ["תאריך", "כרם", "בומה", "PH", "חמיצות", "צבע"] as const

type ImportRowError = { row: number; message: string }

export async function importSamplesFromExcel(
  vintageId: string,
  formData: FormData
): Promise<Result<{ imported: number; errors: ImportRowError[] }>> {
  if (!vintageId) {
    return err({ code: "VALIDATION", message: "יש לבחור בציר/עונה לפני הייבוא" })
  }

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return err({ code: "VALIDATION", message: "לא נבחר קובץ" })
  }

  const blocks = await prisma.vineyardBlock.findMany({
    select: { id: true, name: true },
  })
  const blockByName = new Map(
    blocks.map((b) => [normalizeHeader(b.name), b.id])
  )

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
    columnIndexByHeader.set(normalizeHeader(String(cell.value ?? "")), colNumber)
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

  const rowsToInsert: z.infer<typeof SampleSchema>[] = []
  const errors: ImportRowError[] = []

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber)
    if (row.cellCount === 0) continue

    const getCell = (header: string) => {
      const colIndex = columnIndexByHeader.get(normalizeHeader(header))
      return colIndex ? row.getCell(colIndex).value : null
    }

    const blockNameRaw = getCell("כרם")
    const blockName = blockNameRaw != null ? String(blockNameRaw).trim() : ""
    if (!blockName) continue

    const blockId = blockByName.get(normalizeHeader(blockName))
    if (!blockId) {
      errors.push({ row: rowNumber, message: `הכרם "${blockName}" לא נמצא במערכת` })
      continue
    }

    const dateCell = getCell("תאריך")
    const sampleDate = parseExcelDate(dateCell)
    if (!sampleDate) {
      errors.push({ row: rowNumber, message: "תאריך חסר או לא תקין" })
      continue
    }

    const parsed = SampleSchema.safeParse({
      vintageId,
      blockId,
      sampleDate,
      brix: parseNumericCell(getCell("בומה")),
      ph: parseNumericCell(getCell("PH")),
      titratableAcidity: parseNumericCell(getCell("חמיצות")),
      color: parseTextCell(getCell("צבע")),
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
    await prisma.ripenessSample.createMany({ data: rowsToInsert })
    return ok({ imported: rowsToInsert.length, errors })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת הדגימות שיובאו" })
  }
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase()
}

function parseNumericCell(value: ExcelJS.CellValue): number | null {
  if (value === null || value === undefined || value === "") return null
  const num = typeof value === "number" ? value : Number(String(value).replace(",", "."))
  return Number.isFinite(num) ? num : null
}

function parseTextCell(value: ExcelJS.CellValue): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text.length > 0 ? text : null
}

function parseExcelDate(value: ExcelJS.CellValue): Date | null {
  if (value instanceof Date) return value
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}
