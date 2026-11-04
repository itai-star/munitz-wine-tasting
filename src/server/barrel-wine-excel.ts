import ExcelJS from "exceljs"
import { normalizeText } from "@/lib/barrel-room"
import type { BarrelYearRow, BlockOption } from "@/lib/barrel-room"
import { formatWine } from "@/lib/barrel-wine"
import { normalizeHeader } from "@/lib/vineyard-excel"

export const WINE_SHEET = "יין בחביות"
export const BLOCKS_SHEET = "כרמים"
export const TESTS_SHEET = "בדיקות מעבדה"

export const NUMBER_HEADER = "מספר חבית"
export const WINE_HEADER = "יין (שם כרם)"
export const VARIETY_HEADER = "זן"
export const TYPE_HEADER = "סוג חבית"
export const BARREL_YEAR_HEADER = "שנת חבית"
export const STATUS_HEADER = "סטטוס"

const HEADER_FILL = "FFF5E6E8"

function styleHeader(row: ExcelJS.Row): void {
  row.font = { bold: true }
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } }
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
  })
}

// Blocks of the same variety are one variety in the column that reads the wine by variety.
function varietyShares(row: BarrelYearRow): { name: string; percent: number }[] {
  const shares = new Map<string, number>()
  for (const part of row.parts) shares.set(part.variety, (shares.get(part.variety) ?? 0) + part.percent)
  return Array.from(shares, ([name, percent]) => ({ name, percent: Math.round(percent * 10) / 10 }))
}

function statusOf(row: BarrelYearRow): string {
  if (row.state === "IN_STOCK") return "בחדר"
  return row.state === "REMOVED_THIS_YEAR" ? "הוצאה בשנה זו" : "הוצאה מאוחר יותר"
}

// The wine is written as the names of the vineyard blocks with their shares, "SHCF (65%) + PKMR (35%)", or the name of
// the block alone when the whole wine comes from it. The list of blocks is in the second sheet. The other columns are
// there to read; only the barrel number and the wine are read back.
export async function buildBarrelWineWorkbook(rows: BarrelYearRow[], blocks: BlockOption[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(WINE_SHEET, { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] })
  sheet.columns = [{ width: 14 }, { width: 34 }, { width: 34 }, { width: 24 }, { width: 12 }, { width: 18 }]
  styleHeader(sheet.addRow([NUMBER_HEADER, WINE_HEADER, VARIETY_HEADER, TYPE_HEADER, BARREL_YEAR_HEADER, STATUS_HEADER]))
  for (const row of rows) {
    sheet.addRow([
      row.number,
      row.parts.length > 0 ? formatWine(row.parts.map((part) => ({ name: part.blockName, percent: part.percent }))) : null,
      row.parts.length > 0 ? formatWine(varietyShares(row)) : null,
      row.type,
      row.year,
      statusOf(row),
    ])
  }
  sheet.getColumn(1).numFmt = "@"

  const list = workbook.addWorksheet(BLOCKS_SHEET, { views: [{ rightToLeft: true }] })
  list.columns = [{ width: 24 }, { width: 22 }]
  styleHeader(list.addRow(["כרם (הרשימה מתעדכנת מהאפליקציה)", "זן"]))
  for (const block of blocks) list.addRow([block.name, block.variety])

  const tests = workbook.addWorksheet(TESTS_SHEET, { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] })
  tests.columns = [14, 14, 18, 10, 10, 8, 10, 10, 10, 8, 10, 14, 32, 32].map((width) => ({ width }))
  styleHeader(
    tests.addRow(["מספר חבית", "תאריך", "מעבדה", "Density", "Ethanol", "pH", "Total Acid", "Volatile", "RS/Bx", "CO2", "Malic Acid", "ביסולפיט חופשי", "הערות", "פעולות לביצוע"]),
  )
  for (const row of rows) {
    for (const test of row.tests) {
      tests.addRow([
        row.number,
        new Date(`${test.testDate}T00:00:00.000Z`),
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
  tests.getColumn(1).numFmt = "@"
  tests.getColumn(2).numFmt = "dd/mm/yyyy"
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

export type ParsedWineRow = { row: number; number: string; wine: string }

export type ParsedWineSheet = { rows: ParsedWineRow[]; column: string }

function textOf(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "object" && "richText" in value) return normalizeText(value.richText.map((part) => part.text).join(""))
  if (typeof value === "object" && "text" in value) return normalizeText(String(value.text))
  if (value instanceof Date) return ""
  return normalizeText(String(value))
}

// The wine column is the one headed "יין", or "יין (שם כרם)" as the export writes it. A workbook may also hold the wine of
// other years in columns such as "יין 2024"; those are read only when no plain wine column exists, and the column of the
// year being loaded comes before any other.
function pickWineColumn(headers: { column: number; text: string }[], year: number): { column: number; text: string } | undefined {
  const norm = (text: string): string => normalizeHeader(text).toLowerCase()
  return (
    headers.find((header) => [norm("יין"), norm(WINE_HEADER)].includes(norm(header.text))) ??
    headers.find((header) => norm(header.text) === norm(`יין ${year}`)) ??
    headers.find((header) => norm(header.text).startsWith(norm("יין")))
  )
}

export async function parseBarrelWineWorkbook(buffer: ArrayBuffer, year: number): Promise<ParsedWineSheet | null> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.getWorksheet(WINE_SHEET) ?? workbook.worksheets[0]
  if (!sheet) return null

  let numberColumn: number | undefined
  const headers: { column: number; text: string }[] = []
  sheet.getRow(1).eachCell((cell, column) => {
    const text = textOf(cell.value)
    if (normalizeHeader(text) === normalizeHeader(NUMBER_HEADER)) numberColumn = column
    else headers.push({ column, text })
  })
  const wine = pickWineColumn(headers, year)
  const wineColumn = wine?.column
  if (!numberColumn || !wineColumn) return null

  const rows: ParsedWineRow[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const number = textOf(row.getCell(numberColumn as number).value)
    if (!number) return
    rows.push({ row: rowNumber, number, wine: textOf(row.getCell(wineColumn as number).value) })
  })
  return { rows, column: wine?.text ?? "" }
}
