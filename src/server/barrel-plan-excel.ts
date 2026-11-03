import ExcelJS from "exceljs"
import {
  BARREL_LITERS,
  EXPECTED_LOSS_PERCENT,
  LITERS_PER_BARREL_WITH_TOPPING,
  TOPPING_LITERS_PER_BARREL,
  forecastBasis,
  forecastFinalLiters,
} from "@/lib/barrel-plan"
import type { BarrelCombination, BarrelPlan, BarrelRecord, ForecastBasis } from "@/lib/barrel-plan"

export type BarrelTank = BarrelRecord & { tank: string }

const HEADER_FILL = "FFF5E6E8"
const TOTAL_FILL = "FFFAF5F5"
const LITERS_FORMAT = "#,##0"

const BASIS_LABELS: Record<ForecastBasis, string> = {
  SECOND_RACKING: "מדידה אחרי שפייה שנייה",
  FIRST_RACKING: "מדידה אחרי שפייה ראשונה, נמוכה מההערכה",
  PRESSING_LESS_LOSS: `הערכה: הכמות אחרי פראס פחות ${EXPECTED_LOSS_PERCENT}%`,
  NONE: "אין מדידה",
}

function addSheet(workbook: ExcelJS.Workbook, name: string, widths: number[]): ExcelJS.Worksheet {
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

function styleTotal(row: ExcelJS.Row): void {
  row.font = { bold: true }
  row.eachCell((cell) => (cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_FILL } }))
}

function formatLiters(sheet: ExcelJS.Worksheet, from: number, to: number): void {
  for (let column = from; column <= to; column += 1) sheet.getColumn(column).numFmt = LITERS_FORMAT
}

function addSummary(workbook: ExcelJS.Workbook, vintageLabel: string, plan: BarrelPlan): void {
  const sheet = addSheet(workbook, "סיכום", [44, 22])
  styleHeader(sheet.addRow(["נושא", "ערך"]))
  const rows: [string, string | number][] = [
    ["בציר", vintageLabel],
    ["יין אדום בלבד", "רק מכלי יין אדום נכנסים לחביות"],
    ["נפח חבית (ליטר)", BARREL_LITERS],
    ["יין למילוי לכל חבית (ליטר)", TOPPING_LITERS_PER_BARREL],
    ["יין נדרש לכל חבית כולל מילוי (ליטר)", LITERS_PER_BARREL_WITH_TOPPING],
    ["פחת צפוי מהכמות אחרי פראס", `${EXPECTED_LOSS_PERCENT}%`],
    ["סך החביות לתכנון", plan.totalBarrels],
    ["חביות של זן אחד", plan.pureBarrels],
    ["חביות מעורבות", plan.mixedBarrels],
    ["יין למילוי (ליטר)", plan.toppingLiters],
    ["יין שנשאר בלי חבית (ליטר)", plan.remainderLiters],
    ["רענן ממכלים שסומנו רענן (ליטר)", plan.freshTankLiters],
    ["רענן שהוגדר ידנית, ללא חבית (ליטר)", plan.freshManualLiters],
    ["מכלי יין אדום", plan.tanks],
    ["מכלים שנמדדו אחרי שפייה שנייה", plan.tanksAtLastStage],
    ["מצב הנתונים", plan.isFinal ? "סופי" : "חלקי, חלק מהכמויות בהערכה"],
    ["בגיליון חלוקה לחביות", "כל תא הוא ליטרים של הזן בחבית, כולל חלקו ביין למילוי"],
  ]
  for (const row of rows) sheet.addRow(row)
  sheet.getColumn(2).alignment = { horizontal: "right" }
}

function addVarieties(workbook: ExcelJS.Workbook, plan: BarrelPlan): void {
  const sheet = addSheet(workbook, "כמות לפי זן", [22, 12, 16, 14, 24, 18, 14, 14, 16, 16, 16, 18])
  styleHeader(
    sheet.addRow([
      "זן",
      "מכלים",
      "נמדדו אחרי שפייה שנייה",
      "מצב",
      "כמות אחרי שפייה שנייה, אמיתית או מוערכת (ליטר)",
      "מתוכה רענן, ללא חבית (ליטר)",
      "חביות של זן אחד",
      "יין למילוי (ליטר)",
      "שארית לפני שילובים (ליטר)",
      "נכנס לחביות מעורבות (ליטר)",
      "נשאר בלי חבית (ליטר)",
      "חסרים לחבית נוספת (ליטר)",
    ]),
  )
  for (const entry of plan.varieties) {
    sheet.addRow([
      entry.variety,
      entry.tanks,
      entry.tanksAtLastStage,
      entry.isFinal ? "סופי" : "חלקי",
      entry.liters,
      entry.freshLiters,
      entry.barrels,
      entry.toppingLiters,
      entry.leftoverLiters,
      entry.mixedLiters,
      entry.remainingLiters,
      entry.remainingLiters > 0 ? LITERS_PER_BARREL_WITH_TOPPING - entry.remainingLiters : 0,
    ])
  }
  const total = sheet.addRow([
    'סה"כ',
    plan.tanks,
    plan.tanksAtLastStage,
    plan.isFinal ? "סופי" : "חלקי",
    plan.varieties.reduce((sum, entry) => sum + entry.liters, 0),
    plan.freshManualLiters,
    plan.pureBarrels,
    plan.varieties.reduce((sum, entry) => sum + entry.barrels * TOPPING_LITERS_PER_BARREL, 0),
    plan.varieties.reduce((sum, entry) => sum + entry.leftoverLiters, 0),
    plan.varieties.reduce((sum, entry) => sum + entry.mixedLiters, 0),
    plan.remainderLiters,
    null,
  ])
  styleTotal(total)
  formatLiters(sheet, 5, 12)
}

function addTanks(workbook: ExcelJS.Workbook, tanks: BarrelTank[]): void {
  const sheet = addSheet(workbook, "פירוט מכלים", [18, 22, 16, 16, 16, 22, 40])
  styleHeader(sheet.addRow(["מכל", "זן", "אחרי פראס (ליטר)", "אחרי שפייה ראשונה (ליטר)", "אחרי שפייה שנייה (ליטר)", "כמות צפויה (ליטר)", "מקור הכמות הצפויה"]))
  const sorted = [...tanks].sort((a, b) => (a.variety ?? "").localeCompare(b.variety ?? "", "he") || a.tank.localeCompare(b.tank, "he", { numeric: true }))
  for (const tank of sorted) {
    sheet.addRow([
      tank.tank,
      tank.variety ?? "ללא כרם או זן",
      tank.litersAfterPressing,
      tank.litersAfterFirstRacking,
      tank.litersAfterSecondRacking,
      forecastFinalLiters(tank),
      BASIS_LABELS[forecastBasis(tank)],
    ])
  }
  formatLiters(sheet, 3, 6)
}

// One row per barrel, one column per variety, each cell holding the wine of that variety in the barrel,
// including its share of the topping wine. A row therefore always adds up to the liters a barrel needs.
function addBarrels(workbook: ExcelJS.Workbook, plan: BarrelPlan): void {
  const varieties = plan.varieties.map((entry) => entry.variety)
  const sheet = addSheet(workbook, "חלוקה לחביות", [10, 14, 34, 16, 16, ...varieties.map(() => 14)])
  styleHeader(sheet.addRow(["חבית", "סוג", "תוכן", "בחבית (ליטר)", "מילוי בצד (ליטר)", ...varieties]))

  let number = 0
  for (const entry of plan.varieties) {
    for (let index = 0; index < entry.barrels; index += 1) {
      number += 1
      sheet.addRow([
        number,
        "זן אחד",
        entry.variety,
        BARREL_LITERS,
        TOPPING_LITERS_PER_BARREL,
        ...varieties.map((variety) => (variety === entry.variety ? LITERS_PER_BARREL_WITH_TOPPING : null)),
      ])
    }
  }
  for (const barrel of plan.mixedBarrelList) {
    number += 1
    sheet.addRow([
      number,
      "מעורבת",
      barrel.draws.map((draw) => `${draw.variety} ${draw.liters}`).join(" + "),
      BARREL_LITERS,
      TOPPING_LITERS_PER_BARREL,
      ...varieties.map((variety) => barrel.draws.find((draw) => draw.variety === variety)?.liters ?? null),
    ])
  }

  const total = sheet.addRow([
    "סה\"כ",
    "",
    "",
    number * BARREL_LITERS,
    number * TOPPING_LITERS_PER_BARREL,
    ...varieties.map((variety) => {
      const pure = (plan.varieties.find((entry) => entry.variety === variety)?.barrels ?? 0) * LITERS_PER_BARREL_WITH_TOPPING
      const mixed = plan.mixedBarrelList.reduce((sum, barrel) => sum + (barrel.draws.find((draw) => draw.variety === variety)?.liters ?? 0), 0)
      return pure + mixed
    }),
  ])
  styleTotal(total)
  formatLiters(sheet, 4, 5 + varieties.length)
}

function addCombinations(workbook: ExcelJS.Workbook, plan: BarrelPlan, combinations: BarrelCombination[]): void {
  const sheet = addSheet(workbook, "שילובים מאושרים", [8, 52, 18])
  styleHeader(sheet.addRow(["שילוב", "זנים", "חביות מעורבות שנוצרו"]))
  combinations.forEach((combination, index) => {
    const formed = plan.mixed.find((entry) => entry.combinationId === combination.id)?.barrels ?? 0
    sheet.addRow([index + 1, combination.varieties.join(" + "), formed])
  })
}

export async function buildBarrelPlanWorkbook(input: {
  vintageLabel: string
  tanks: BarrelTank[]
  combinations: BarrelCombination[]
  plan: BarrelPlan
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "מערכת הניהול של יקב מוניץ"

  addSummary(workbook, input.vintageLabel, input.plan)
  addVarieties(workbook, input.plan)
  addBarrels(workbook, input.plan)
  addTanks(workbook, input.tanks.filter((tank) => tank.wineType === "RED"))
  addCombinations(workbook, input.plan, input.combinations)

  return Buffer.from(await workbook.xlsx.writeBuffer())
}
