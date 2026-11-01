import type { BlockInput } from "@/lib/vineyard-block-schema"

export type BlockFieldKey = keyof BlockInput

export type BlockColumn = {
  key: BlockFieldKey
  label: string
  kind: "text" | "int" | "number"
  width: number
}

// The order and the names of the columns in the vineyard workbook, for export and for import.
export const BLOCK_COLUMNS: BlockColumn[] = [
  { key: "name", label: "שם הבלוק", kind: "text", width: 22 },
  { key: "variety", label: "זן", kind: "text", width: 18 },
  { key: "location", label: "מיקום", kind: "text", width: 24 },
  { key: "elevationMeters", label: "גובה מעל פני הים (מטר)", kind: "int", width: 22 },
  { key: "slopeDirection", label: "כיוון מדרון", kind: "text", width: 16 },
  { key: "slopeAngleDegrees", label: "זווית שיפוע (מעלות)", kind: "number", width: 18 },
  { key: "soilType", label: "סוג קרקע", kind: "text", width: 16 },
  { key: "rootstock", label: "כנה", kind: "text", width: 16 },
  { key: "plantingYear", label: "שנת נטיעה", kind: "int", width: 12 },
  { key: "plantingDensity", label: "צפיפות נטיעה", kind: "text", width: 16 },
  { key: "rowDirection", label: "כיוון שורות", kind: "text", width: 14 },
  { key: "trellisMethod", label: "שיטת גיזום או טרליס", kind: "text", width: 20 },
  { key: "irrigationType", label: "השקיה", kind: "text", width: 14 },
  { key: "estimatedYieldPerDunam", label: "יבול משוער לדונם", kind: "number", width: 18 },
  { key: "diseaseHistory", label: "היסטוריית מחלות ומזיקים", kind: "text", width: 30 },
]

export const GROWER_COLUMN_LABEL = "כורם"
export const PRICE_COLUMN_LABEL = 'מחיר לק"ג (₪)'

export const BLOCKS_SHEET_NAME = "בלוקים"
export const GROWERS_SHEET_NAME = "רשימת כורמים"

// Header cells are compared without spaces and quotation marks, so small typing differences still match.
export function normalizeHeader(text: string): string {
  return text.replace(/[\s"'״׳`]/g, "")
}

export function shekelsToAgorot(shekels: number): number {
  return Math.round(shekels * 100)
}

export function agorotToShekels(agorot: number): number {
  return agorot / 100
}
