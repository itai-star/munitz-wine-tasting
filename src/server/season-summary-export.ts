import ExcelJS from "exceljs"
import type { SeasonSummaryData } from "@/server/season-summary-data"

const KG_FORMAT = "#,##0"
const PERCENT_FORMAT = "0.0%"
const DATE_FORMAT = "dd/mm/yyyy"
const HEADER_FILL = "FFF5E6E8"

function addSheet(workbook: ExcelJS.Workbook, name: string): ExcelJS.Worksheet {
  return workbook.addWorksheet(name, { views: [{ rightToLeft: true }] })
}

function styleHeader(row: ExcelJS.Row): void {
  row.font = { bold: true }
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } }
    cell.alignment = { horizontal: "center", vertical: "middle" }
  })
}

function styleTotal(row: ExcelJS.Row): void {
  row.font = { bold: true }
}

function addVarietyTotalsSheet(workbook: ExcelJS.Workbook, data: SeasonSummaryData): void {
  const sheet = addSheet(workbook, "קליטה לפי זן")
  sheet.columns = [{ width: 24 }, { width: 18 }]
  styleHeader(sheet.addRow(["זן", 'קליטה (ק"ג)']))

  for (const row of data.varietyTotals) {
    sheet.addRow([row.variety, row.totalWeightKg]).getCell(2).numFmt = KG_FORMAT
  }
  const total = data.varietyTotals.reduce((sum, row) => sum + row.totalWeightKg, 0)
  const totalRow = sheet.addRow(['סה"כ', total])
  totalRow.getCell(2).numFmt = KG_FORMAT
  styleTotal(totalRow)
}

function addWeeklySheet(workbook: ExcelJS.Workbook, data: SeasonSummaryData): void {
  const sheet = addSheet(workbook, "קליטה לפי שבוע")
  sheet.columns = [{ width: 18 }, ...data.varieties.map(() => ({ width: 16 })), { width: 16 }]
  styleHeader(sheet.addRow(["תחילת שבוע", ...data.varieties, 'סה"כ (ק"ג)']))

  for (const week of data.weeks) {
    const row = sheet.addRow([
      week.weekStart,
      ...data.varieties.map((variety) => week.byVariety[variety] ?? null),
      week.total,
    ])
    row.getCell(1).numFmt = DATE_FORMAT
    row.eachCell((cell, colNumber) => {
      if (colNumber > 1) cell.numFmt = KG_FORMAT
    })
  }

  const columnTotals = data.varieties.map((variety) =>
    data.weeks.reduce((sum, week) => sum + (week.byVariety[variety] ?? 0), 0)
  )
  const grandTotal = data.weeks.reduce((sum, week) => sum + week.total, 0)
  const totalRow = sheet.addRow(['סה"כ', ...columnTotals, grandTotal])
  totalRow.eachCell((cell, colNumber) => {
    if (colNumber > 1) cell.numFmt = KG_FORMAT
  })
  styleTotal(totalRow)
}

function addExtractionSheet(workbook: ExcelJS.Workbook, data: SeasonSummaryData): void {
  const sheet = addSheet(workbook, "מיצוי לפי זן")
  sheet.columns = [{ width: 24 }, { width: 16 }, { width: 16 }, { width: 20 }, { width: 20 }]
  styleHeader(sheet.addRow(["זן", 'נבצר (ק"ג)', "אחרי פראס", "אחרי שפייה ראשונה", "אחרי שפייה שנייה"]))

  for (const row of data.extractionRows) {
    const added = sheet.addRow([
      row.variety,
      row.harvestedWeightKg,
      toFraction(row.afterPressingPercent),
      toFraction(row.afterFirstRackingPercent),
      toFraction(row.afterSecondRackingPercent),
    ])
    added.getCell(2).numFmt = KG_FORMAT
    for (const column of [3, 4, 5]) added.getCell(column).numFmt = PERCENT_FORMAT
  }
}

function toFraction(percent: number | null): number | null {
  return percent == null ? null : percent / 100
}

export async function buildSeasonSummaryWorkbook(data: SeasonSummaryData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  addVarietyTotalsSheet(workbook, data)
  addWeeklySheet(workbook, data)
  addExtractionSheet(workbook, data)
  return Buffer.from(await workbook.xlsx.writeBuffer())
}
