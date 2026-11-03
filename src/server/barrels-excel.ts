import ExcelJS from "exceljs"
import { normalizeText } from "@/lib/barrel-room"
import type { BarrelRow } from "@/lib/barrel-room"
import { normalizeHeader } from "@/lib/vineyard-excel"

export const BARRELS_SHEET = "חביות"

export const NUMBER_HEADER = "מספר חבית"
export const TYPE_HEADER = "סוג"
export const YEAR_HEADER = "שנה"
export const STATUS_HEADER = "סטטוס"
export const NOTE_HEADER = "הערת הוצאה"

export const IN_STOCK_LABEL = "בחדר"
export const REMOVED_LABEL = "הוצאה מהמלאי"

const HEADER_FILL = "FFF5E6E8"

function styleHeader(row: ExcelJS.Row): void {
  row.font = { bold: true }
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } }
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
  })
}

export async function buildBarrelsWorkbook(barrels: BarrelRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(BARRELS_SHEET, { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] })
  sheet.columns = [{ width: 14 }, { width: 28 }, { width: 10 }, { width: 18 }, { width: 32 }]
  styleHeader(sheet.addRow([NUMBER_HEADER, TYPE_HEADER, YEAR_HEADER, STATUS_HEADER, NOTE_HEADER]))

  for (const barrel of barrels) {
    sheet.addRow([barrel.number, barrel.type, barrel.year, barrel.removed ? REMOVED_LABEL : IN_STOCK_LABEL, barrel.removalNote])
  }
  // A number is written as text, so a number with letters or leading zeros comes back exactly as it was.
  sheet.getColumn(1).numFmt = "@"
  sheet.getColumn(4).alignment = { horizontal: "center" }
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

export type ParsedBarrelRow = {
  row: number
  number: string
  type: string
  year: number | null
  removed: boolean
}

function textOf(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "object" && "richText" in value) return normalizeText(value.richText.map((part) => part.text).join(""))
  if (typeof value === "object" && "text" in value) return normalizeText(String(value.text))
  if (value instanceof Date) return ""
  return normalizeText(String(value))
}

function yearOf(value: ExcelJS.CellValue): number | null {
  if (typeof value === "number") return Number.isInteger(value) ? value : null
  const text = textOf(value)
  return /^\d{4}$/.test(text) ? Number(text) : null
}

export async function parseBarrelsWorkbook(buffer: ArrayBuffer): Promise<ParsedBarrelRow[] | null> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.getWorksheet(BARRELS_SHEET) ?? workbook.worksheets[0]
  if (!sheet) return null

  const columns = new Map<string, number>()
  sheet.getRow(1).eachCell((cell, column) => columns.set(normalizeHeader(textOf(cell.value)), column))
  const numberColumn = columns.get(normalizeHeader(NUMBER_HEADER))
  const typeColumn = columns.get(normalizeHeader(TYPE_HEADER))
  const yearColumn = columns.get(normalizeHeader(YEAR_HEADER))
  const statusColumn = columns.get(normalizeHeader(STATUS_HEADER))
  if (!numberColumn || !typeColumn || !yearColumn) return null

  const rows: ParsedBarrelRow[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const number = textOf(row.getCell(numberColumn).value)
    const type = textOf(row.getCell(typeColumn).value)
    const yearValue = row.getCell(yearColumn).value
    if (!number && !type && textOf(yearValue) === "") return

    rows.push({
      row: rowNumber,
      number,
      type,
      year: yearOf(yearValue),
      removed: statusColumn !== undefined && normalizeHeader(textOf(row.getCell(statusColumn).value)) === normalizeHeader(REMOVED_LABEL),
    })
  })
  return rows
}
