import ExcelJS from "exceljs"
import { formatPercent } from "@/lib/barrel-wine"
import { partialNote } from "@/lib/blend-summary"
import type { WineSummary } from "@/lib/blend-summary"

const HEADER_FILL = "FFF5E6E8"

function addSheet(workbook: ExcelJS.Workbook, name: string, widths: number[], header: string[]): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet(name, { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] })
  sheet.columns = widths.map((width) => ({ width }))
  const row = sheet.addRow(header)
  row.font = { bold: true }
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } }
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
  })
  return sheet
}

function notesOf(wine: WineSummary): string {
  const values = [
    ["אלכוהול", partialNote(wine.lab.ethanol, wine.lab.totalBarrels)],
    ["pH", partialNote(wine.lab.ph, wine.lab.totalBarrels)],
    ["ביסולפיט", partialNote(wine.lab.freeBisulfite, wine.lab.totalBarrels)],
  ]
  return values.flatMap(([label, note]) => (note ? [`${label}: ${note}`] : [])).join(" · ")
}

// The blending summary of a year as a workbook: a row for each final wine, a sheet of the barrels of each wine, and a sheet of
// the composition by variety.
export async function buildSummaryWorkbook(year: number, wines: WineSummary[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const summary = addSheet(
    workbook,
    `סיכום ${year}`,
    [28, 60, 40, 12, 12, 10, 12, 10, 14, 30, 30, 30],
    ["שם היין", "תיאור היין", "הרכב זני", "ליטרים", "בקבוקים (הערכה)", "חביות", "אלכוהול %", "pH", "ביסולפיט חופשי", "כרמים", "מספרי החביות וליטרים", "הערות חישוב"],
  )
  for (const wine of wines) {
    const row = summary.addRow([
      wine.name,
      wine.description,
      wine.varieties.map((entry) => `${entry.variety} ${formatPercent(entry.percent)}`).join(", "),
      wine.totalLiters,
      wine.bottles,
      wine.barrels.length,
      wine.lab.ethanol.value,
      wine.lab.ph.value,
      wine.lab.freeBisulfite.value,
      wine.blocks.join(", "),
      wine.barrels.map((barrel) => `${barrel.number} (${barrel.liters})`).join(", "),
      notesOf(wine),
    ])
    row.alignment = { vertical: "top", wrapText: true }
  }
  if (wines.length > 1) {
    const total = summary.addRow(["סך הכל", null, null, wines.reduce((sum, wine) => sum + wine.totalLiters, 0), wines.reduce((sum, wine) => sum + wine.bottles, 0)])
    total.font = { bold: true }
  }
  summary.getColumn(4).numFmt = "#,##0.0"
  summary.getColumn(5).numFmt = "#,##0"
  summary.getColumn(7).numFmt = "0.0"
  summary.getColumn(8).numFmt = "0.00"

  const barrels = addSheet(workbook, "חביות לפי יין", [28, 12, 14, 50], ["יין", "מספר חבית", "ליטרים שנלקחו", "זן"])
  const varieties = addSheet(workbook, "הרכב לפי זן", [28, 24, 14, 12], ["יין", "זן", "ליטרים", "אחוז"])
  for (const wine of wines) {
    for (const barrel of wine.barrels) barrels.addRow([wine.name, barrel.number, barrel.liters, barrel.varieties])
    for (const entry of wine.varieties) varieties.addRow([wine.name, entry.variety, entry.liters, entry.percent / 100])
  }
  barrels.getColumn(2).numFmt = "@"
  barrels.getColumn(3).numFmt = "#,##0.0"
  varieties.getColumn(3).numFmt = "#,##0.0"
  varieties.getColumn(4).numFmt = "0.0%"

  workbook.creator = `מערכת הניהול של יקב מוניץ, סיכום בלנדינג ${year}`
  return Buffer.from(await workbook.xlsx.writeBuffer())
}
