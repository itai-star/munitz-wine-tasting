import ExcelJS from "exceljs"
import { monthOfSheetName } from "@/lib/sales-summary"
import type { CustomerTypeKey } from "@/lib/sales-summary"

const HEADER_SEARCH_ROWS = 15
const TOTAL_LABEL = /^סה["'״׳]?כ/

// Columns that describe the sale rather than count bottles; wine columns sit between these and the notes.
const LEADING_HEADERS = ["חשבונית", "סטטוס חשבונית", "סוג לקוח", "שם", "כתובת", "קטגוריה", "עיר", "טלפון", "מייל"]
const TRAILING_HEADERS = ["הערות", "סטטוס תשלום", "עלות", "סטטוס"]

const TYPE_BY_LABEL: Record<string, CustomerTypeKey> = { פרטי: "PRIVATE", סיטונאי: "WHOLESALE" }
// Older sheets have a free "category" column instead of the customer type; only clear cases are used.
const TYPE_BY_CATEGORY: Record<string, CustomerTypeKey> = { פרטי: "PRIVATE", חנויות: "WHOLESALE", "ברי יין": "WHOLESALE" }

export type ParsedSale = {
  name: string
  customerType: CustomerTypeKey | null
  bottles: number
  revenueAgorot: number
  items: { wine: string; bottles: number }[]
}

export type ParsedMonth = { month: number; sales: ParsedSale[] }

export type ParsedWorkbook = {
  months: ParsedMonth[]
  warnings: string[]
  ignoredSheets: string[]
}

export function normalizeCustomerName(name: string): string {
  return name.replace(/\s+/g, " ").trim()
}

function rawValue(cell: ExcelJS.Cell): unknown {
  const value = cell.value
  if (value && typeof value === "object" && !(value instanceof Date)) {
    if ("result" in value) return value.result
    if ("richText" in value) return value.richText.map((part) => part.text).join("")
    if ("text" in value) return value.text
  }
  return value
}

function textOf(cell: ExcelJS.Cell): string {
  const value = rawValue(cell)
  return value === null || value === undefined ? "" : String(value).trim()
}

function numberOf(cell: ExcelJS.Cell): number | null {
  const value = rawValue(cell)
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(/[,\s₪]/g, ""))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function toAgorot(shekels: number): number {
  return Math.round(shekels * 100)
}

type MonthSheetLayout = {
  headerRow: number
  nameColumn: number
  revenueColumn: number
  typeColumn: number | null
  categoryColumn: number | null
  wineColumns: { column: number; wine: string }[]
}

function findLayout(sheet: ExcelJS.Worksheet): MonthSheetLayout | null {
  for (let rowNumber = 1; rowNumber <= Math.min(HEADER_SEARCH_ROWS, sheet.rowCount); rowNumber++) {
    const headers = new Map<string, number>()
    sheet.getRow(rowNumber).eachCell({ includeEmpty: false }, (cell, column) => {
      const text = textOf(cell)
      if (text && !headers.has(text)) headers.set(text, column)
    })

    const nameColumn = headers.get("שם")
    const revenueColumn = headers.get("עלות")
    if (nameColumn === undefined || revenueColumn === undefined) continue

    const leadingEnd = Math.max(...LEADING_HEADERS.map((header) => headers.get(header) ?? 0))
    const trailingStart = Math.min(...TRAILING_HEADERS.map((header) => headers.get(header) ?? Infinity))

    const wineColumns: MonthSheetLayout["wineColumns"] = []
    sheet.getRow(rowNumber).eachCell({ includeEmpty: false }, (cell, column) => {
      const wine = textOf(cell)
      if (wine && column > leadingEnd && column < trailingStart) wineColumns.push({ column, wine })
    })

    return {
      headerRow: rowNumber,
      nameColumn,
      revenueColumn,
      typeColumn: headers.get("סוג לקוח") ?? null,
      categoryColumn: headers.get("קטגוריה") ?? null,
      wineColumns,
    }
  }
  return null
}

function customerTypeOf(row: ExcelJS.Row, layout: MonthSheetLayout): CustomerTypeKey | null {
  const label = layout.typeColumn ? textOf(row.getCell(layout.typeColumn)) : ""
  if (TYPE_BY_LABEL[label]) return TYPE_BY_LABEL[label]
  const category = layout.categoryColumn ? textOf(row.getCell(layout.categoryColumn)) : ""
  return TYPE_BY_CATEGORY[category] ?? null
}

function parseMonthSheet(sheet: ExcelJS.Worksheet, month: number, warnings: string[]): ParsedMonth | null {
  const layout = findLayout(sheet)
  if (!layout) {
    warnings.push(`בגיליון "${sheet.name}" לא נמצאה שורת כותרות עם העמודות "שם" ו"עלות", ולכן הוא דולג`)
    return null
  }

  const sales: ParsedSale[] = []
  const namelessRows: { sale: ParsedSale; revenue: number }[] = []

  for (let rowNumber = layout.headerRow + 1; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber)
    const nameCell = row.getCell(layout.nameColumn)
    const name = normalizeCustomerName(textOf(nameCell))
    const revenue = numberOf(row.getCell(layout.revenueColumn))

    if (name && (TOTAL_LABEL.test(name) || typeof rawValue(nameCell) !== "string")) continue
    if (!name && (revenue === null || revenue <= 0)) continue

    const items: ParsedSale["items"] = []
    for (const { column, wine } of layout.wineColumns) {
      const count = numberOf(row.getCell(column))
      if (count !== null && count > 0) items.push({ wine, bottles: count })
    }
    const bottles = items.reduce((sum, item) => sum + item.bottles, 0)
    if (bottles === 0 && (revenue === null || revenue === 0)) continue

    const sale: ParsedSale = {
      name: name || "ללא שם",
      customerType: customerTypeOf(row, layout),
      bottles,
      revenueAgorot: toAgorot(revenue ?? 0),
      items,
    }
    // A row without a customer name is either a sale nobody named or the sheet's own totals row.
    if (name) sales.push(sale)
    else namelessRows.push({ sale, revenue: revenue ?? 0 })
  }

  // The totals row is the nameless row that is about as large as all the other rows together.
  const largest = namelessRows.reduce((best, row) => (row.revenue > (best?.revenue ?? 0) ? row : best), null as (typeof namelessRows)[number] | null)
  const otherRevenue =
    sales.reduce((sum, sale) => sum + sale.revenueAgorot, 0) +
    namelessRows.filter((row) => row !== largest).reduce((sum, row) => sum + row.sale.revenueAgorot, 0)
  const otherBottles =
    sales.reduce((sum, sale) => sum + sale.bottles, 0) +
    namelessRows.filter((row) => row !== largest).reduce((sum, row) => sum + row.sale.bottles, 0)
  const looksLikeTotals =
    largest !== null && (toAgorot(largest.revenue) >= otherRevenue * 0.9 || (otherBottles > 0 && largest.sale.bottles >= otherBottles * 0.9))
  const totalsRow = looksLikeTotals ? largest : null
  for (const row of namelessRows) if (row !== totalsRow) sales.push(row.sale)

  if (sales.length === 0) return null

  const computedRevenue = sales.reduce((sum, sale) => sum + sale.revenueAgorot, 0)
  if (totalsRow && Math.abs(computedRevenue - toAgorot(totalsRow.revenue)) > 100) {
    warnings.push(
      `בגיליון "${sheet.name}" סכום השורות (${(computedRevenue / 100).toLocaleString("he-IL")}) שונה מסכום הסיכום שבגיליון (${totalsRow.revenue.toLocaleString("he-IL")}). נשמר סכום השורות. כדאי לבדוק אם נוסחת הסיכום בגיליון כוללת את כל השורות`
    )
  }
  return { month, sales }
}

// Reads a workbook with one tab per month, or a single tab named after one month.
export async function parseSalesWorkbook(buffer: ArrayBuffer): Promise<ParsedWorkbook> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const warnings: string[] = []
  const months: ParsedMonth[] = []
  const ignoredSheets: string[] = []

  for (const sheet of workbook.worksheets) {
    const name = sheet.name.trim()
    const month = monthOfSheetName(name)
    const parsed = month === null ? null : parseMonthSheet(sheet, month, warnings)
    if (parsed) months.push(parsed)
    else ignoredSheets.push(name)
  }

  return { months, warnings, ignoredSheets }
}
