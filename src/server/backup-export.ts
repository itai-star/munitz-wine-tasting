import ExcelJS from "exceljs"
import { prisma } from "@/lib/prisma"

export type BackupTableCount = { sheet: string; rows: number }

export type BackupWorkbook = { buffer: Buffer; counts: BackupTableCount[] }

type Row = Record<string, unknown>

type BackupTable = { sheet: string; load: () => Promise<Row[]> }

// Sensor samples, bank data, accounts and sessions are left out on purpose: the file travels by mail,
// the sensor history is too large for it, and the rest is either secret or can be fetched again.
const TABLES: BackupTable[] = [
  { sheet: "בציר", load: () => prisma.vintage.findMany({ orderBy: { year: "asc" } }) },
  { sheet: "כורמים", load: () => prisma.grower.findMany({ orderBy: { name: "asc" } }) },
  {
    sheet: "בלוקים",
    load: () =>
      prisma.vineyardBlock.findMany({ omit: { growerId: false, pricePerKgAgorot: false }, orderBy: { name: "asc" } }),
  },
  { sheet: "מחירי בלוקים לבציר", load: () => prisma.blockVintagePrice.findMany() },
  { sheet: "קליטות ענבים", load: () => prisma.grapeIntake.findMany({ orderBy: { intakeDate: "asc" } }) },
  { sheet: "דגימות הבשלה", load: () => prisma.ripenessSample.findMany({ orderBy: { sampleDate: "asc" } }) },
  { sheet: "תסיסות", load: () => prisma.fermentationBatch.findMany({ orderBy: { startDate: "asc" } }) },
  { sheet: "בלוקים בתסיסה", load: () => prisma.fermentationBatchBlock.findMany() },
  { sheet: "מדידות תסיסה", load: () => prisma.fermentationReading.findMany({ orderBy: { readingDate: "asc" } }) },
  { sheet: "יין מוגמר", load: () => prisma.finishedWine.findMany() },
  { sheet: "בדיקות מעבדה", load: () => prisma.labTest.findMany({ orderBy: { testDate: "asc" } }) },
  { sheet: "תוכניות תשלום לכורמים", load: () => prisma.growerPaymentPlan.findMany() },
  { sheet: "תשלומים לכורמים", load: () => prisma.growerInstallment.findMany({ orderBy: [{ planId: "asc" }, { sequence: "asc" }] }) },
  { sheet: "יינות ומלאי", load: () => prisma.wine.findMany({ orderBy: { name: "asc" } }) },
  { sheet: "משיכות מהמלאי", load: () => prisma.wineWithdrawal.findMany({ orderBy: { createdAt: "asc" } }) },
  { sheet: "מכירות לפי חודש", load: () => prisma.salesMonth.findMany({ orderBy: [{ year: "asc" }, { month: "asc" }] }) },
  { sheet: "מכירות ללקוחות", load: () => prisma.salesSale.findMany() },
  { sheet: "פריטי מכירה", load: () => prisma.salesSaleItem.findMany() },
  { sheet: "סוגי לקוחות", load: () => prisma.salesCustomerRule.findMany({ orderBy: { name: "asc" } }) },
  { sheet: "טעימות", load: () => prisma.tastingSession.findMany({ orderBy: { date: "asc" } }) },
  { sheet: "יינות בטעימה", load: () => prisma.tastingSessionWine.findMany() },
  { sheet: "דירוגים", load: () => prisma.rating.findMany({ orderBy: { createdAt: "asc" } }) },
  { sheet: "התרשמויות", load: () => prisma.impression.findMany({ orderBy: { createdAt: "asc" } }) },
]

function cellValue(value: unknown): string | number | boolean | Date | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value
  if (typeof value === "bigint") return value.toString()
  return JSON.stringify(value)
}

function addSheet(workbook: ExcelJS.Workbook, sheet: string, rows: Row[]): void {
  const worksheet = workbook.addWorksheet(sheet, { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] })
  const columns = rows.length > 0 ? Object.keys(rows[0]) : ["(אין נתונים)"]
  worksheet.columns = columns.map((key) => ({ header: key, key, width: Math.min(Math.max(key.length + 2, 12), 40) }))
  worksheet.getRow(1).font = { bold: true }

  for (const row of rows) {
    const added = worksheet.addRow(Object.fromEntries(columns.map((key) => [key, cellValue(row[key])])))
    added.eachCell((cell) => {
      if (cell.value instanceof Date) cell.numFmt = "yyyy-mm-dd hh:mm"
    })
  }
}

export async function buildBackupWorkbook(): Promise<BackupWorkbook> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "מערכת הניהול של יקב מוניץ"
  workbook.created = new Date()

  const counts: BackupTableCount[] = []
  // One table at a time, so the backup never opens many database connections at once.
  for (const table of TABLES) {
    const rows = await table.load()
    addSheet(workbook, table.sheet, rows)
    counts.push({ sheet: table.sheet, rows: rows.length })
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer())
  return { buffer, counts }
}
