"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { canUse } from "@/lib/permissions"
import { BlockSchema } from "@/lib/vineyard-block-schema"
import type { BlockInput } from "@/lib/vineyard-block-schema"
import { PRICE_COLUMN_LABEL, normalizeHeader, shekelsToAgorot } from "@/lib/vineyard-excel"
import { requirePermission } from "@/server/auth/guards"
import { parseBlocksWorkbook } from "@/server/vineyard-excel"
import type { ParsedBlockRow } from "@/server/vineyard-excel"
import { ok, err } from "@/types"
import type { Result } from "@/types"

const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_PRICE_SHEKELS = 1000

export type BlocksImportSummary = {
  created: number
  updated: number
  unchanged: number
  errors: { row: number; message: string }[]
  warnings: string[]
}

type Finance = { growerId?: string | null; pricePerKgAgorot?: number | null }

type WriteOperation =
  | { kind: "create"; data: BlockInput & Finance }
  | { kind: "update"; id: string; data: Partial<BlockInput> & Finance }

const EMPTY_OPTIONAL_FIELDS = {
  location: null,
  elevationMeters: null,
  slopeDirection: null,
  slopeAngleDegrees: null,
  soilType: null,
  rootstock: null,
  plantingYear: null,
  plantingDensity: null,
  rowDirection: null,
  trellisMethod: null,
  irrigationType: null,
  estimatedYieldPerDunam: null,
  diseaseHistory: null,
}

// True when the file would change at least one stored value, so an unchanged file writes nothing.
function changesAnything(existing: object, incoming: object): boolean {
  const stored: Record<string, unknown> = { ...existing }
  return Object.entries(incoming).some(([key, value]) => stored[key] !== value)
}

// The grower and price a row asks for, or the reason it cannot have them.
function financeOf(row: ParsedBlockRow, growerIdByName: Map<string, string>): Finance | string {
  const finance: Finance = {}
  if (row.grower !== undefined) {
    if (row.grower === null) finance.growerId = null
    else {
      const growerId = growerIdByName.get(normalizeHeader(row.grower))
      if (!growerId) return `הכורם "${row.grower}" לא קיים ברשימה. כורמים חדשים מוסיפים במסך "כורמים"`
      finance.growerId = growerId
    }
  }
  if (row.priceShekels !== undefined) {
    if (row.priceShekels === null) finance.pricePerKgAgorot = null
    else if (row.priceShekels < 0 || row.priceShekels > MAX_PRICE_SHEKELS) {
      return `הערך בעמודה "${PRICE_COLUMN_LABEL}" חייב להיות בין 0 ל-${MAX_PRICE_SHEKELS}`
    } else finance.pricePerKgAgorot = shekelsToAgorot(row.priceShekels)
  }
  return finance
}

// Reads the vineyard workbook back. A block is matched by its name: an existing name is updated with the
// columns the file has, a new name is created. Grower and price columns count only for someone who may
// see them, and a grower must already be on the list.
export async function importBlocksFromExcel(formData: FormData): Promise<Result<BlocksImportSummary>> {
  const user = await requirePermission("HARVEST")
  const canFinance = canUse(user, "GROWERS")

  const file = formData.get("file")
  if (!(file instanceof File)) return err({ code: "VALIDATION", message: "לא נבחר קובץ" })
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return err({ code: "VALIDATION", message: "יש לבחור קובץ אקסל בפורמט xlsx" })
  }
  if (file.size > MAX_FILE_BYTES) return err({ code: "VALIDATION", message: "הקובץ גדול מדי (עד 10MB)" })

  let parsed
  try {
    parsed = await parseBlocksWorkbook(await file.arrayBuffer())
  } catch {
    return err({ code: "VALIDATION", message: "לא ניתן לקרוא את הקובץ, יש לוודא שזה קובץ xlsx תקין" })
  }
  if (parsed.missing.length > 0) {
    return err({ code: "VALIDATION", message: `חסרות עמודות חובה בקובץ: ${parsed.missing.join(", ")}` })
  }
  if (parsed.rows.length === 0) return err({ code: "VALIDATION", message: "לא נמצאו שורות בקובץ" })

  const warnings: string[] = []
  if (!canFinance && (parsed.hasGrowerColumn || parsed.hasPriceColumn)) {
    warnings.push("עמודות הכורם והמחיר לא נקלטו, כי אין לך הרשאה לתשלומי כורמים")
  }

  const [blocks, growers] = await Promise.all([
    prisma.vineyardBlock.findMany({ omit: { growerId: false, pricePerKgAgorot: false } }),
    canFinance ? prisma.grower.findMany({ select: { id: true, name: true } }) : Promise.resolve([]),
  ])
  const blockByName = new Map(blocks.map((block) => [normalizeHeader(block.name), block]))
  const growerIdByName = new Map(growers.map((grower) => [normalizeHeader(grower.name), grower.id]))

  const errors: BlocksImportSummary["errors"] = []
  const operations: WriteOperation[] = []
  const seen = new Set<string>()
  let unchanged = 0

  for (const row of parsed.rows) {
    const fail = (message: string) => errors.push({ row: row.rowNumber, message })
    if (row.invalid) {
      fail(row.invalid)
      continue
    }
    const name = typeof row.fields.name === "string" ? row.fields.name : ""
    if (!name) {
      fail("שם הבלוק חסר")
      continue
    }
    const key = normalizeHeader(name)
    if (seen.has(key)) {
      fail(`הבלוק "${name}" מופיע יותר מפעם אחת בקובץ`)
      continue
    }
    seen.add(key)

    const finance = canFinance ? financeOf(row, growerIdByName) : {}
    if (typeof finance === "string") {
      fail(finance)
      continue
    }

    // An empty required cell is reported with the field's own message instead of a type error.
    const fields = { ...row.fields, ...(row.fields.variety === null ? { variety: "" } : {}) }

    const existing = blockByName.get(key)
    if (existing) {
      const validated = BlockSchema.partial().safeParse(fields)
      if (!validated.success) fail(validated.error.errors[0].message)
      else if (changesAnything(existing, { ...validated.data, ...finance })) {
        operations.push({ kind: "update", id: existing.id, data: { ...validated.data, ...finance } })
      } else unchanged += 1
    } else {
      const validated = BlockSchema.safeParse({ ...EMPTY_OPTIONAL_FIELDS, ...fields })
      if (!validated.success) fail(validated.error.errors[0].message)
      else operations.push({ kind: "create", data: { ...validated.data, ...finance } })
    }
  }

  try {
    await prisma.$transaction(
      operations.map((operation) =>
        operation.kind === "update"
          ? prisma.vineyardBlock.update({ where: { id: operation.id }, data: operation.data })
          : prisma.vineyardBlock.create({ data: operation.data })
      )
    )
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת הנתונים, לא נשמר דבר" })
  }

  revalidatePath("/admin/vineyard")
  return ok({
    created: operations.filter((operation) => operation.kind === "create").length,
    updated: operations.filter((operation) => operation.kind === "update").length,
    unchanged,
    errors,
    warnings,
  })
}
