import ExcelJS from "exceljs"
import { formatMonthKey, parseMonthInput } from "@/lib/grower-payments"
import { normalizeHeader } from "@/lib/vineyard-excel"
import type { PaymentsOverview } from "@/server/grower-payments-data"

export const SUMMARY_SHEET = "ריכוז לפי כורם וזן"
export const SETTINGS_SHEET = "הגדרות כורמים"
export const PRICES_SHEET = "מחירים לבציר"
export const PAYMENTS_SHEET = "תשלומים"
export const FORECAST_SHEET = "צפי חודשי"

export const PAID_LABEL = "שולם"
export const OPEN_LABEL = "פתוח"

const HEADER_FILL = "FFF5E6E8"
const SUBTOTAL_FILL = "FFFAF5F5"
const MONEY_FORMAT = "#,##0.00"
const KG_FORMAT = "#,##0"
const MONTH_FORMAT = "mm/yyyy"
const EDIT_ROWS_PADDING = 40

function sheetOf(workbook: ExcelJS.Workbook, name: string, widths: number[]): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet(name, { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] })
  sheet.columns = widths.map((width) => ({ width }))
  return sheet
}

function styleHeader(row: ExcelJS.Row): void {
  row.font = { bold: true }
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } }
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
  })
}

function shekels(agorot: number): number {
  return agorot / 100
}

function monthDate(monthKey: string): Date {
  const [year, month] = monthKey.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, 1))
}

export async function buildGrowerPaymentsWorkbook(overview: PaymentsOverview): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()

  // 1. A readable summary: every grower, then the varieties under them.
  const summary = sheetOf(workbook, SUMMARY_SHEET, [26, 22, 14, 18, 18])
  styleHeader(summary.addRow(["כורם", "זן", 'כמות (ק"ג)', 'מחיר ממוצע לק"ג (₪)', "סכום לתשלום (₪)"]))
  for (const grower of overview.growers) {
    const header = summary.addRow([grower.name, "", grower.kg, grower.kg > 0 ? shekels(grower.amountAgorot) / grower.kg : null, shekels(grower.amountAgorot)])
    header.font = { bold: true }
    header.eachCell((cell) => (cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBTOTAL_FILL } }))
    for (const variety of grower.varieties) {
      summary.addRow(["", variety.variety, variety.kg, shekels(variety.avgPriceAgorot), shekels(variety.amountAgorot)])
    }
  }
  const total = summary.addRow(['סה"כ', "", overview.totals.kg, null, shekels(overview.totals.amountAgorot)])
  total.font = { bold: true }
  summary.eachRow((row, number) => {
    if (number === 1) return
    row.getCell(3).numFmt = KG_FORMAT
    row.getCell(4).numFmt = MONEY_FORMAT
    row.getCell(5).numFmt = MONEY_FORMAT
  })

  // 2. Per grower: when the payments start and how many there are. These two columns are read back.
  const settings = sheetOf(workbook, SETTINGS_SHEET, [26, 14, 18, 20, 18, 16, 16, 12])
  styleHeader(settings.addRow(["כורם", 'כמות (ק"ג)', "סה\"כ לתשלום (₪)", "חודש תשלום ראשון", "מספר תשלומים", "שולם (₪)", "פתוח (₪)", "% שולם"]))
  for (const grower of overview.growers) {
    const row = settings.addRow([
      grower.name,
      grower.kg,
      shekels(grower.amountAgorot),
      grower.plan ? monthDate(grower.plan.firstMonth) : null,
      grower.plan?.count ?? null,
      shekels(grower.paidAgorot),
      shekels(grower.openAgorot),
      grower.paidPercent / 100,
    ])
    row.getCell(2).numFmt = KG_FORMAT
    for (const column of [3, 6, 7]) row.getCell(column).numFmt = MONEY_FORMAT
    row.getCell(4).numFmt = MONTH_FORMAT
    row.getCell(8).numFmt = "0%"
  }

  // 3. A price for this vintage per block; an empty cell means the block's default price.
  const prices = sheetOf(workbook, PRICES_SHEET, [22, 20, 22, 14, 18, 22])
  styleHeader(prices.addRow(["בלוק", "זן", "כורם", 'כמות (ק"ג)', 'מחיר ברירת מחדל (₪ לק"ג)', 'מחיר לבציר (₪ לק"ג)']))
  for (const grower of overview.growers) {
    for (const line of grower.lines) {
      const row = prices.addRow([
        line.blockName,
        line.variety,
        grower.name,
        line.kg,
        line.defaultPriceAgorot === null ? null : shekels(line.defaultPriceAgorot),
        line.priceSource === "vintage" && line.priceAgorot !== null ? shekels(line.priceAgorot) : null,
      ])
      row.getCell(4).numFmt = KG_FORMAT
      row.getCell(5).numFmt = MONEY_FORMAT
      row.getCell(6).numFmt = MONEY_FORMAT
    }
  }

  // 4. The monthly payments of every grower with a plan, each with its status.
  const payments = sheetOf(workbook, PAYMENTS_SHEET, [26, 14, 16, 18, 14])
  styleHeader(payments.addRow(["כורם", "מספר תשלום", "חודש", "סכום (₪)", "סטטוס"]))
  for (const grower of overview.growers) {
    for (const row of grower.installments) {
      const line = payments.addRow([grower.name, row.sequence, monthDate(row.dueMonth), shekels(row.amountAgorot), row.paid ? PAID_LABEL : OPEN_LABEL])
      line.getCell(3).numFmt = MONTH_FORMAT
      line.getCell(4).numFmt = MONEY_FORMAT
    }
  }
  const lastPaymentRow = payments.rowCount + EDIT_ROWS_PADDING
  for (let rowNumber = 2; rowNumber <= lastPaymentRow; rowNumber++) {
    payments.getCell(rowNumber, 5).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${PAID_LABEL},${OPEN_LABEL}"`],
      showErrorMessage: true,
      errorTitle: "סטטוס לא תקין",
      error: `יש לבחור ${PAID_LABEL} או ${OPEN_LABEL}`,
    }
  }

  // 5. The monthly forecast, for reading only.
  const forecast = sheetOf(workbook, FORECAST_SHEET, [18, 18, 18, 18, 12])
  styleHeader(forecast.addRow(["חודש", "צפוי לתשלום (₪)", "שולם (₪)", "פתוח (₪)", "% שולם"]))
  for (const month of overview.months) {
    const row = forecast.addRow([formatMonthKey(month.month), shekels(month.expectedAgorot), shekels(month.paidAgorot), shekels(month.openAgorot), month.paidPercent / 100])
    for (const column of [2, 3, 4]) row.getCell(column).numFmt = MONEY_FORMAT
    row.getCell(5).numFmt = "0%"
  }

  return Buffer.from(await workbook.xlsx.writeBuffer())
}

export type ParsedPayments = {
  prices: { row: number; block: string; priceShekels: number | null; invalid?: string }[]
  settings: { row: number; grower: string; firstMonth: string | null; count: number | null; invalid?: string }[]
  statuses: { row: number; grower: string; sequence: number; paid: boolean | null; raw: string }[]
  foundSheets: string[]
}

function cellValue(cell: ExcelJS.Cell): unknown {
  const value = cell.value
  if (value && typeof value === "object" && !(value instanceof Date)) {
    if ("result" in value) return value.result
    if ("richText" in value) return value.richText.map((part) => part.text).join("")
    if ("text" in value) return value.text
  }
  return value
}

function textOf(cell: ExcelJS.Cell): string {
  const value = cellValue(cell)
  return value === null || value === undefined ? "" : String(value).trim()
}

// null for an empty cell, NaN for something that is not a number.
function numberOf(cell: ExcelJS.Cell): number | null {
  const text = textOf(cell)
  if (text === "") return null
  const parsed = Number(text.replace(/[,\s₪]/g, ""))
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function sheetByName(workbook: ExcelJS.Workbook, name: string): ExcelJS.Worksheet | undefined {
  return workbook.worksheets.find((sheet) => normalizeHeader(sheet.name) === normalizeHeader(name))
}

export async function parseGrowerPaymentsWorkbook(buffer: ArrayBuffer): Promise<ParsedPayments> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const result: ParsedPayments = { prices: [], settings: [], statuses: [], foundSheets: [] }

  const prices = sheetByName(workbook, PRICES_SHEET)
  if (prices) {
    result.foundSheets.push(PRICES_SHEET)
    for (let number = 2; number <= prices.rowCount; number++) {
      const row = prices.getRow(number)
      const block = textOf(row.getCell(1))
      if (!block) continue
      const price = numberOf(row.getCell(6))
      result.prices.push({
        row: number,
        block,
        priceShekels: price !== null && Number.isNaN(price) ? null : price,
        invalid: price !== null && Number.isNaN(price) ? `המחיר "${textOf(row.getCell(6))}" אינו מספר` : undefined,
      })
    }
  }

  const settings = sheetByName(workbook, SETTINGS_SHEET)
  if (settings) {
    result.foundSheets.push(SETTINGS_SHEET)
    for (let number = 2; number <= settings.rowCount; number++) {
      const row = settings.getRow(number)
      const grower = textOf(row.getCell(1))
      if (!grower) continue
      const monthCell = cellValue(row.getCell(4))
      const firstMonth = monthCell === null || monthCell === undefined || textOf(row.getCell(4)) === "" ? null : parseMonthInput(monthCell)
      const count = numberOf(row.getCell(5))
      const invalid =
        textOf(row.getCell(4)) !== "" && firstMonth === null
          ? `חודש התשלום הראשון "${textOf(row.getCell(4))}" אינו תקין (למשל 12/2026)`
          : count !== null && (Number.isNaN(count) || !Number.isInteger(count))
            ? `מספר התשלומים "${textOf(row.getCell(5))}" אינו מספר שלם`
            : undefined
      result.settings.push({ row: number, grower, firstMonth, count: count === null || Number.isNaN(count) ? null : count, invalid })
    }
  }

  const payments = sheetByName(workbook, PAYMENTS_SHEET)
  if (payments) {
    result.foundSheets.push(PAYMENTS_SHEET)
    for (let number = 2; number <= payments.rowCount; number++) {
      const row = payments.getRow(number)
      const grower = textOf(row.getCell(1))
      const sequence = numberOf(row.getCell(2))
      if (!grower || sequence === null || Number.isNaN(sequence)) continue
      const status = textOf(row.getCell(5))
      result.statuses.push({
        row: number,
        grower,
        sequence,
        paid: status === PAID_LABEL ? true : status === OPEN_LABEL ? false : null,
        raw: status,
      })
    }
  }

  return result
}
