import ExcelJS from "exceljs"
import { isTimeOfDay, parseDayKey, toDayKey } from "@/lib/calendar-events"
import type { CategoryRow, DayKey, EventRow } from "@/lib/calendar-events"
import { normalizeHeader } from "@/lib/vineyard-excel"

export const EVENTS_SHEET = "אירועים"
export const CATEGORIES_SHEET = "קטגוריות"

export const CATEGORY_HEADER = "קטגוריה"
export const DETAILS_HEADER = "פרטי האירוע"
export const DATE_HEADER = "תאריך"
export const START_HEADER = "שעת התחלה"
export const END_HEADER = "שעת סיום"
export const CITY_HEADER = "עיר"
export const STREET_HEADER = "רחוב"
export const STATUS_HEADER = "סטטוס"

export const ACTIVE_LABEL = "פעיל"
export const CANCELLED_LABEL = "בוטל"

const HEADER_FILL = "FFF5E6E8"
const DATE_FORMAT = "dd/mm/yyyy"
const EDIT_ROWS = 300
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30)
const MS_PER_DAY = 86_400_000
const MINUTES_PER_DAY = 1440
const COLUMN_WIDTHS = [22, 56, 14, 12, 12, 18, 24, 12]
const STATUS_COLUMN = 8

function styleHeader(row: ExcelJS.Row): void {
  row.font = { bold: true }
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } }
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
  })
}

// The category and status columns are dropdowns, so a name cannot be typed in a way the app does not know.
export async function buildEventsWorkbook(events: EventRow[], categories: CategoryRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(EVENTS_SHEET, { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] })
  sheet.columns = COLUMN_WIDTHS.map((width) => ({ width }))
  styleHeader(sheet.addRow([CATEGORY_HEADER, DETAILS_HEADER, DATE_HEADER, START_HEADER, END_HEADER, CITY_HEADER, STREET_HEADER, STATUS_HEADER]))

  for (const event of events) {
    sheet.addRow([
      event.categoryName,
      event.details,
      parseDayKey(event.date),
      event.startTime,
      event.endTime,
      event.city,
      event.street,
      event.cancelled ? CANCELLED_LABEL : ACTIVE_LABEL,
    ])
  }
  sheet.getColumn(3).numFmt = DATE_FORMAT
  // Times are written as text, "18:00", so that Excel shows them exactly as the app does.
  sheet.getColumn(4).numFmt = "@"
  sheet.getColumn(5).numFmt = "@"
  sheet.getColumn(2).alignment = { wrapText: true, vertical: "top" }

  const list = workbook.addWorksheet(CATEGORIES_SHEET, { views: [{ rightToLeft: true }] })
  list.columns = [{ width: 28 }]
  styleHeader(list.addRow(["קטגוריות (הרשימה מתעדכנת מהאפליקציה)"]))
  for (const category of categories) list.addRow([category.name])

  const lastRow = Math.max(events.length, EDIT_ROWS) + 1
  const categoryRange = `'${CATEGORIES_SHEET}'!$A$2:$A$${Math.max(categories.length, 1) + 1}`
  for (let row = 2; row <= lastRow; row += 1) {
    sheet.getCell(row, 1).dataValidation = { type: "list", allowBlank: true, formulae: [categoryRange] }
    sheet.getCell(row, STATUS_COLUMN).dataValidation = { type: "list", allowBlank: true, formulae: [`"${ACTIVE_LABEL},${CANCELLED_LABEL}"`] }
    sheet.getCell(row, 3).numFmt = DATE_FORMAT
    sheet.getCell(row, 4).numFmt = "@"
    sheet.getCell(row, 5).numFmt = "@"
  }

  return Buffer.from(await workbook.xlsx.writeBuffer())
}

export type ParsedEventRow = {
  row: number
  category: string
  details: string
  date: DayKey | null
  // Empty when the cell is empty; "invalid" when something is there that is not a time of day.
  startTime: string | "invalid" | null
  endTime: string | "invalid" | null
  city: string
  street: string
  cancelled: boolean
}

function textOf(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "object" && "richText" in value) return value.richText.map((part) => part.text).join("").trim()
  if (typeof value === "object" && "text" in value) return String(value.text).trim()
  if (value instanceof Date) return toDayKey(value)
  return String(value).trim()
}

// A date cell may hold a real date, a day written as text (day/month/year or year-month-day), or an Excel serial number.
function dayOf(value: ExcelJS.CellValue): DayKey | null {
  if (value instanceof Date) return toDayKey(value)
  if (typeof value === "number") return toDayKey(new Date(EXCEL_EPOCH_MS + Math.floor(value) * MS_PER_DAY))

  const text = textOf(value)
  if (parseDayKey(text)) return text
  const match = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(text)
  if (!match) return null
  const key = `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`
  return parseDayKey(key) ? key : null
}

// A time cell may hold a real time (a fraction of a day), a time written as text such as 18:00 or 8:30, or nothing.
function timeOf(value: ExcelJS.CellValue): string | "invalid" | null {
  if (value === null || value === undefined || textOf(value) === "") return null

  let minutes: number | null = null
  if (value instanceof Date) minutes = value.getUTCHours() * 60 + value.getUTCMinutes()
  else if (typeof value === "number") minutes = Math.round((value % 1) * MINUTES_PER_DAY)
  else {
    const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(textOf(value))
    if (match) minutes = Number(match[1]) * 60 + Number(match[2])
  }
  if (minutes === null || minutes >= MINUTES_PER_DAY) return "invalid"

  const text = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
  return isTimeOfDay(text) ? text : "invalid"
}

export async function parseEventsWorkbook(buffer: ArrayBuffer): Promise<ParsedEventRow[] | null> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.getWorksheet(EVENTS_SHEET) ?? workbook.worksheets[0]
  if (!sheet) return null

  const columns = new Map<string, number>()
  sheet.getRow(1).eachCell((cell, column) => columns.set(normalizeHeader(textOf(cell.value)), column))
  const categoryColumn = columns.get(normalizeHeader(CATEGORY_HEADER))
  const detailsColumn = columns.get(normalizeHeader(DETAILS_HEADER))
  const dateColumn = columns.get(normalizeHeader(DATE_HEADER))
  const startColumn = columns.get(normalizeHeader(START_HEADER))
  const endColumn = columns.get(normalizeHeader(END_HEADER))
  const cityColumn = columns.get(normalizeHeader(CITY_HEADER))
  const streetColumn = columns.get(normalizeHeader(STREET_HEADER))
  const statusColumn = columns.get(normalizeHeader(STATUS_HEADER))
  if (!categoryColumn || !detailsColumn || !dateColumn) return null

  const rows: ParsedEventRow[] = []
  sheet.eachRow((row, number) => {
    if (number === 1) return
    const category = textOf(row.getCell(categoryColumn).value)
    const details = textOf(row.getCell(detailsColumn).value)
    const dateValue = row.getCell(dateColumn).value
    if (!category && !details && textOf(dateValue) === "") return

    rows.push({
      row: number,
      category,
      details,
      date: dayOf(dateValue),
      startTime: startColumn ? timeOf(row.getCell(startColumn).value) : null,
      endTime: endColumn ? timeOf(row.getCell(endColumn).value) : null,
      city: cityColumn ? textOf(row.getCell(cityColumn).value) : "",
      street: streetColumn ? textOf(row.getCell(streetColumn).value) : "",
      cancelled: statusColumn !== undefined && normalizeHeader(textOf(row.getCell(statusColumn).value)) === normalizeHeader(CANCELLED_LABEL),
    })
  })
  return rows
}
