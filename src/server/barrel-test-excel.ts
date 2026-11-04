import ExcelJS from "exceljs"
import { normalizeText } from "@/lib/barrel-room"
import type { BarrelYearRow } from "@/lib/barrel-room"
import { parseDayKey, toDayKey } from "@/lib/calendar-events"
import type { DayKey } from "@/lib/calendar-events"
import { normalizeHeader } from "@/lib/vineyard-excel"

export const TESTS_SHEET = "בדיקות מעבדה"

export const NUMBER_HEADER = "מספר חבית"
export const DATE_HEADER = "תאריך"
export const LAB_HEADER = "מעבדה"
export const NOTES_HEADER = "הערות"
export const ACTIONS_HEADER = "פעולות לביצוע"

export const MEASURES = [
  { key: "density", header: "Density", aliases: [] },
  { key: "ethanol", header: "Ethanol", aliases: [] },
  { key: "ph", header: "pH", aliases: [] },
  { key: "totalAcid", header: "Total Acid", aliases: [] },
  { key: "volatile", header: "Volatile", aliases: [] },
  { key: "rsBx", header: "RS/Bx", aliases: [] },
  { key: "co2", header: "CO2", aliases: [] },
  { key: "malicAcid", header: "Malic Acid", aliases: [] },
  { key: "freeBisulfite", header: "ביסולפיט חופשי", aliases: ["Free Bisulfite", "Free SO2"] },
] as const

export type MeasureKey = (typeof MEASURES)[number]["key"]

const HEADER_FILL = "FFF5E6E8"
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30)
const MS_PER_DAY = 86_400_000

function styleHeader(row: ExcelJS.Row): void {
  row.font = { bold: true }
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } }
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
  })
}

// One sheet in the format the import reads. For a year's tests the rows are the tests taken; for a template there is a
// row for each barrel of the year, with its number filled in, to write the date and the results next to.
export async function buildBarrelTestsWorkbook(rows: BarrelYearRow[], template: boolean): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(TESTS_SHEET, { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] })
  sheet.columns = [14, 14, 18, 10, 10, 8, 10, 10, 10, 8, 10, 14, 32, 32].map((width) => ({ width }))
  styleHeader(sheet.addRow([NUMBER_HEADER, DATE_HEADER, LAB_HEADER, ...MEASURES.map((measure) => measure.header), NOTES_HEADER, ACTIONS_HEADER]))

  for (const row of rows) {
    if (template) {
      sheet.addRow([row.number])
      continue
    }
    for (const test of row.tests) {
      sheet.addRow([
        row.number,
        parseDayKey(test.testDate),
        test.lab,
        test.density,
        test.ethanol,
        test.ph,
        test.totalAcid,
        test.volatile,
        test.rsBx,
        test.co2,
        test.malicAcid,
        test.freeBisulfite,
        test.notes,
        test.actionItems,
      ])
    }
  }
  sheet.getColumn(1).numFmt = "@"
  sheet.getColumn(2).numFmt = "dd/mm/yyyy"
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

export type ParsedTestRow = {
  row: number
  number: string
  // "invalid" when the cell holds something that is not a date.
  date: DayKey | "invalid" | null
  lab: string | null
  // The measurements that are written; "invalid" marks a cell that is not a number.
  values: Partial<Record<MeasureKey, number | "invalid">>
  notes: string | null
  actionItems: string | null
}

function textOf(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "object" && "richText" in value) return normalizeText(value.richText.map((part) => part.text).join(""))
  if (typeof value === "object" && "text" in value) return normalizeText(String(value.text))
  if (typeof value === "object" && "result" in value) return normalizeText(String(value.result ?? ""))
  if (value instanceof Date) return toDayKey(value)
  return normalizeText(String(value))
}

function dayOf(value: ExcelJS.CellValue): DayKey | "invalid" | null {
  if (value === null || value === undefined || textOf(value) === "") return null
  if (value instanceof Date) return toDayKey(value)
  if (typeof value === "number") return toDayKey(new Date(EXCEL_EPOCH_MS + Math.floor(value) * MS_PER_DAY))

  const text = textOf(value)
  if (parseDayKey(text)) return text
  const match = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(text)
  if (!match) return "invalid"
  const key = `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`
  return parseDayKey(key) ? key : "invalid"
}

function numberOf(value: ExcelJS.CellValue): number | "invalid" | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : "invalid"
  const text = textOf(value)
  if (text === "") return null
  const parsed = Number(text.replace(",", "."))
  return Number.isFinite(parsed) ? parsed : "invalid"
}

function optionalText(value: ExcelJS.CellValue): string | null {
  const text = typeof value === "string" ? value.trim() : textOf(value)
  return text === "" ? null : text
}

// Reads the sheet of tests: the sheet called "בדיקות מעבדה", the one the workbook of the year's wine has, or the first
// sheet. The columns are found by their headers. A row with nothing in it but the barrel number is a blank row of the
// template and is left out.
export async function parseBarrelTestsWorkbook(buffer: ArrayBuffer): Promise<ParsedTestRow[] | null> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.getWorksheet(TESTS_SHEET) ?? workbook.worksheets[0]
  if (!sheet) return null

  const columns = new Map<string, number>()
  sheet.getRow(1).eachCell((cell, column) => columns.set(normalizeHeader(textOf(cell.value)).toLowerCase(), column))
  const column = (header: string): number | undefined => columns.get(normalizeHeader(header).toLowerCase())
  const numberColumn = column(NUMBER_HEADER)
  const dateColumn = column(DATE_HEADER)
  if (!numberColumn || !dateColumn) return null

  const rows: ParsedTestRow[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const cell = (header: string): ExcelJS.CellValue => {
      const index = column(header)
      return index ? row.getCell(index).value : null
    }

    const values: ParsedTestRow["values"] = {}
    for (const measure of MEASURES) {
      const headers: readonly string[] = [measure.header, ...measure.aliases]
      const value = numberOf(cell(headers.find((header) => column(header)) ?? measure.header))
      if (value !== null) values[measure.key] = value
    }
    const parsed: ParsedTestRow = {
      row: rowNumber,
      number: textOf(row.getCell(numberColumn).value),
      date: dayOf(row.getCell(dateColumn).value),
      lab: optionalText(cell(LAB_HEADER)),
      values,
      notes: optionalText(cell(NOTES_HEADER)),
      actionItems: optionalText(cell(ACTIONS_HEADER)),
    }
    const hasData = parsed.date !== null || parsed.lab !== null || Object.keys(values).length > 0 || parsed.notes !== null || parsed.actionItems !== null
    if (!hasData) return
    rows.push(parsed)
  })
  return rows
}
