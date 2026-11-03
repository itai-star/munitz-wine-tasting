import ExcelJS from "exceljs"
import { formatPercent } from "@/lib/barrel-wine"
import { compositionOf, wineLabOf } from "@/lib/blending"
import type { BlendWineView, PileBarrel } from "@/lib/blending"

const HEADER_FILL = "FFF5E6E8"
const LITERS_FORMAT = "#,##0.0"

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

function partsText(parts: { blockName: string; variety: string; percent: number }[]): string {
  return parts.map((part) => `${part.blockName} (${part.variety}) ${formatPercent(part.percent)}`).join(" + ")
}

// Everything the blending of a year holds: the wines with their composition by variety and by block, the barrels in each,
// and the barrels that were not used.
export async function buildBlendingWorkbook(year: number, wines: BlendWineView[], pile: PileBarrel[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const compositions = wines.map((wine) => ({ wine, composition: compositionOf(wine.draws) }))

  const summary = addSheet(workbook, "יינות", [28, 50, 12, 10, 12, 12, 10, 60, 50], ["שם היין", "תיאור לתווית", "ליטרים", "חביות", "הרכב סופי", "אלכוהול %", "pH", "הרכב לפי זן", "מספרי החביות"])
  for (const { wine, composition } of compositions) {
    const lab = wineLabOf(wine.draws)
    summary.addRow([
      wine.name,
      wine.description,
      composition.totalLiters,
      wine.draws.length,
      wine.finalized ? "כן" : "לא",
      lab.ethanol.value,
      lab.ph.value,
      composition.byVariety.map((share) => `${share.variety} ${formatPercent(share.percent)} (${share.liters} ליטר)`).join(" + "),
      wine.draws.map((draw) => draw.number).join(", "),
    ])
  }
  summary.getColumn(2).alignment = { wrapText: true, vertical: "top" }
  summary.getColumn(3).numFmt = LITERS_FORMAT

  const byVariety = addSheet(workbook, "הרכב לפי זן", [28, 20, 12, 12, 50], ["יין", "זן", "ליטרים", "אחוז", "חביות (ליטרים מהזן)"])
  const byBlock = addSheet(workbook, "הרכב לפי כרם", [28, 20, 20, 12], ["יין", "כרם", "זן", "ליטרים"])
  for (const { wine, composition } of compositions) {
    for (const share of composition.byVariety) {
      byVariety.addRow([wine.name, share.variety, share.liters, share.percent / 100, share.barrels.map((barrel) => `${barrel.number} (${barrel.liters})`).join(", ")])
      for (const block of share.blocks) byBlock.addRow([wine.name, block.blockName, share.variety, block.liters])
    }
  }
  byVariety.getColumn(3).numFmt = LITERS_FORMAT
  byVariety.getColumn(4).numFmt = "0.0%"
  byBlock.getColumn(4).numFmt = LITERS_FORMAT

  const barrels = addSheet(workbook, "חביות ביינות", [28, 12, 22, 14, 60, 10, 12, 10, 10], ["יין", "מספר חבית", "סוג חבית", "ליטרים שנלקחו", "הרכב החבית", "ציון", "אלכוהול % (ממוצע)", "pH (ממוצע)", "מספר בדיקות"])
  for (const { wine } of compositions) {
    for (const draw of wine.draws) barrels.addRow([wine.name, draw.number, draw.type, draw.liters, partsText(draw.parts), draw.score, draw.lab.ethanol, draw.lab.ph, draw.lab.tests])
  }
  barrels.getColumn(2).numFmt = "@"
  barrels.getColumn(4).numFmt = LITERS_FORMAT

  const unused = addSheet(workbook, "חביות לא משובצות", [12, 22, 14, 14, 60, 10, 60, 12, 10, 10], ["מספר חבית", "סוג חבית", "נשארו ליטרים", "זן עיקרי", "הרכב החבית", "ציון", "רשמי טעימה", "אלכוהול % (ממוצע)", "pH (ממוצע)", "מספר בדיקות"])
  for (const barrel of pile) unused.addRow([barrel.number, barrel.type, barrel.remaining, barrel.variety, partsText(barrel.parts), barrel.score, barrel.tastingNotes, barrel.lab.ethanol, barrel.lab.ph, barrel.lab.tests])
  unused.getColumn(1).numFmt = "@"
  unused.getColumn(3).numFmt = LITERS_FORMAT
  unused.getColumn(7).alignment = { wrapText: true, vertical: "top" }

  workbook.creator = `מערכת הניהול של יקב מוניץ, בלנדינג ${year}`
  return Buffer.from(await workbook.xlsx.writeBuffer())
}
