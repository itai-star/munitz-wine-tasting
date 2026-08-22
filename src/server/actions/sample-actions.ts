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

const DeleteSamplesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "לא נבחרו דגימות למחיקה"),
})

export async function deleteSamples(ids: string[]): Promise<Result<{ deleted: number }>> {
  const parsed = DeleteSamplesSchema.safeParse({ ids })
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  try {
    const result = await prisma.ripenessSample.deleteMany({
      where: { id: { in: parsed.data.ids } },
    })
    return ok({ deleted: result.count })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה במחיקת הדגימות" })
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

  const existingSamples = await prisma.ripenessSample.findMany({
    where: { vintageId },
    select: { blockId: true, sampleDate: true },
  })
  const seenKeys = new Set(
    existingSamples.map((s) => sampleKey(s.blockId, s.sampleDate))
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

  const rowsToInsert: z.infer<typeof SampleSchema>[] = []
  const errors: ImportRowError[] = []

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber)
    if (row.cellCount === 0) continue

    const getCell = (header: string): ExcelJS.Cell | null => {
      const colIndex = columnIndexByHeader.get(normalizeHeader(header))
      return colIndex ? row.getCell(colIndex) : null
    }

    const blockName = cellText(getCell("כרם"))
    if (!blockName) continue

    const blockId = blockByName.get(normalizeHeader(blockName))
    if (!blockId) {
      errors.push({ row: rowNumber, message: `הכרם "${blockName}" לא נמצא במערכת` })
      continue
    }

    const sampleDate = parseExcelDate(getCell("תאריך"))
    if (!sampleDate) {
      errors.push({ row: rowNumber, message: "תאריך חסר או לא תקין" })
      continue
    }

    const key = sampleKey(blockId, sampleDate)
    if (seenKeys.has(key)) {
      errors.push({
        row: rowNumber,
        message: `כבר קיימת דגימה לתאריך ולכרם הזה בעונה — דולגה (כפילות)`,
      })
      continue
    }
    seenKeys.add(key)

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

function sampleKey(blockId: string, sampleDate: Date): string {
  return `${blockId}|${sampleDate.toISOString().slice(0, 10)}`
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
