import ExcelJS from "exceljs"
import {
  BLOCKS_SHEET_NAME,
  BLOCK_COLUMNS,
  GROWERS_SHEET_NAME,
  GROWER_COLUMN_LABEL,
  PRICE_COLUMN_LABEL,
  agorotToShekels,
  normalizeHeader,
} from "@/lib/vineyard-excel"
import type { BlockFieldKey } from "@/lib/vineyard-excel"

const HEADER_FILL = "FFF5E6E8"
const DROPDOWN_ROWS = 300

export type ExportBlock = {
  name: string
  variety: string
  location: string | null
  elevationMeters: number | null
  slopeDirection: string | null
  slopeAngleDegrees: number | null
  soilType: string | null
  rootstock: string | null
  plantingYear: number | null
  plantingDensity: string | null
  rowDirection: string | null
  trellisMethod: string | null
  irrigationType: string | null
  estimatedYieldPerDunam: number | null
  diseaseHistory: string | null
  growerName: string | null
  pricePerKgAgorot: number | null
}

function styleHeader(row: ExcelJS.Row): void {
  row.font = { bold: true }
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } }
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
  })
}

// The financial columns are written only for someone allowed to see them. The grower column is a dropdown
// of the grower list, so a name cannot be typed freely.
export async function buildBlocksWorkbook(
  blocks: ExportBlock[],
  growerNames: string[],
  includeFinance: boolean
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(BLOCKS_SHEET_NAME, { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] })

  const labels = [
    ...BLOCK_COLUMNS.map((column) => column.label),
    ...(includeFinance ? [GROWER_COLUMN_LABEL, PRICE_COLUMN_LABEL] : []),
  ]
  sheet.columns = [
    ...BLOCK_COLUMNS.map((column) => ({ width: column.width })),
    ...(includeFinance ? [{ width: 20 }, { width: 16 }] : []),
  ]
  styleHeader(sheet.addRow(labels))

  for (const block of blocks) {
    sheet.addRow([
      ...BLOCK_COLUMNS.map((column) => block[column.key as BlockFieldKey] ?? null),
      ...(includeFinance
        ? [block.growerName, block.pricePerKgAgorot === null ? null : agorotToShekels(block.pricePerKgAgorot)]
        : []),
    ])
  }

  if (includeFinance) {
    const growerColumn = BLOCK_COLUMNS.length + 1
    const priceColumn = growerColumn + 1
    const listSheet = workbook.addWorksheet(GROWERS_SHEET_NAME, { views: [{ rightToLeft: true }] })
    listSheet.columns = [{ width: 28 }]
    styleHeader(listSheet.addRow(["כורמים (הרשימה מתעדכנת מהאפליקציה)"]))
    for (const name of growerNames) listSheet.addRow([name])

    for (let rowNumber = 2; rowNumber <= blocks.length + 1 + DROPDOWN_ROWS; rowNumber++) {
      sheet.getCell(rowNumber, growerColumn).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`'${GROWERS_SHEET_NAME}'!$A$2:$A$${Math.max(growerNames.length + 1, 2)}`],
        showErrorMessage: true,
        errorTitle: "כורם לא ברשימה",
        error: "יש לבחור כורם מהרשימה. כורמים חדשים מוסיפים באפליקציה.",
      }
      sheet.getCell(rowNumber, priceColumn).numFmt = "#,##0.00"
    }
  }

  return Buffer.from(await workbook.xlsx.writeBuffer())
}

export type ParsedBlockRow = {
  rowNumber: number
  // Only the columns the file has; a missing column leaves the stored value as it is.
  fields: Partial<Record<BlockFieldKey, string | number | null>>
  grower?: string | null
  priceShekels?: number | null
  invalid?: string
}

export type ParsedBlocksFile = {
  rows: ParsedBlockRow[]
  hasGrowerColumn: boolean
  hasPriceColumn: boolean
  missing: string[]
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

function numberFrom(text: string): number | null {
  if (text === "") return null
  const parsed = Number(text.replace(/[,\s₪]/g, ""))
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export async function parseBlocksWorkbook(buffer: ArrayBuffer): Promise<ParsedBlocksFile> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.getWorksheet(BLOCKS_SHEET_NAME) ?? workbook.worksheets[0]
  if (!sheet) return { rows: [], hasGrowerColumn: false, hasPriceColumn: false, missing: [BLOCK_COLUMNS[0].label] }

  const columnOfLabel = new Map<string, number>()
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, column) => {
    columnOfLabel.set(normalizeHeader(textOf(cell)), column)
  })

  const blockColumns = BLOCK_COLUMNS.flatMap((column) => {
    const index = columnOfLabel.get(normalizeHeader(column.label))
    return index === undefined ? [] : [{ column, index }]
  })
  const growerIndex = columnOfLabel.get(normalizeHeader(GROWER_COLUMN_LABEL))
  const priceIndex = columnOfLabel.get(normalizeHeader(PRICE_COLUMN_LABEL))

  const missing = BLOCK_COLUMNS.filter((column) => column.key === "name" || column.key === "variety")
    .filter((column) => !blockColumns.some((found) => found.column.key === column.key))
    .map((column) => column.label)

  const rows: ParsedBlockRow[] = []
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber)
    const parsed: ParsedBlockRow = { rowNumber, fields: {} }
    let hasContent = false

    for (const { column, index } of blockColumns) {
      const text = textOf(row.getCell(index))
      if (text !== "") hasContent = true
      if (column.kind === "text") {
        parsed.fields[column.key] = text === "" ? null : text
        continue
      }
      const value = numberFrom(text)
      if (Number.isNaN(value)) parsed.invalid = `הערך "${text}" בעמודה "${column.label}" אינו מספר`
      else parsed.fields[column.key] = column.kind === "int" && value !== null ? Math.round(value) : value
    }

    if (growerIndex !== undefined) {
      const text = textOf(row.getCell(growerIndex))
      if (text !== "") hasContent = true
      parsed.grower = text === "" ? null : text
    }
    if (priceIndex !== undefined) {
      const text = textOf(row.getCell(priceIndex))
      if (text !== "") hasContent = true
      const value = numberFrom(text)
      if (Number.isNaN(value)) parsed.invalid ??= `הערך "${text}" בעמודה "${PRICE_COLUMN_LABEL}" אינו מספר`
      else parsed.priceShekels = value
    }

    if (hasContent) rows.push(parsed)
  }

  return { rows, hasGrowerColumn: growerIndex !== undefined, hasPriceColumn: priceIndex !== undefined, missing }
}
