"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { shekelsToAgorot, normalizeHeader } from "@/lib/vineyard-excel"
import { requirePermission } from "@/server/auth/guards"
import { loadPaymentsOverviewById } from "@/server/grower-payments-data"
import { PAYMENTS_SHEET, parseGrowerPaymentsWorkbook } from "@/server/grower-payments-excel"
import { applyPaymentPlan } from "@/server/grower-payments-plan"
import { ok, err } from "@/types"
import type { Result } from "@/types"

const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_PRICE_SHEKELS = 1000

export type PaymentsImportSummary = {
  pricesChanged: number
  plansSaved: number
  statusesChanged: number
  errors: { sheet: string; row: number; message: string }[]
}

// Reads the payments workbook back: vintage prices, the first month and number of payments of each grower,
// and the paid or open status of each payment. They are applied in that order, because a price changes what
// is owed, and the amount owed is what the schedule divides.
export async function importGrowerPayments(vintageId: string, formData: FormData): Promise<Result<PaymentsImportSummary>> {
  await requirePermission("GROWERS")

  const file = formData.get("file")
  if (!(file instanceof File)) return err({ code: "VALIDATION", message: "לא נבחר קובץ" })
  if (!file.name.toLowerCase().endsWith(".xlsx")) return err({ code: "VALIDATION", message: "יש לבחור קובץ אקסל בפורמט xlsx" })
  if (file.size > MAX_FILE_BYTES) return err({ code: "VALIDATION", message: "הקובץ גדול מדי (עד 10MB)" })

  const vintage = await prisma.vintage.findUnique({ where: { id: vintageId }, select: { id: true } })
  if (!vintage) return err({ code: "NOT_FOUND", message: "הבציר לא נמצא" })

  let parsed
  try {
    parsed = await parseGrowerPaymentsWorkbook(await file.arrayBuffer())
  } catch {
    return err({ code: "VALIDATION", message: "לא ניתן לקרוא את הקובץ, יש לוודא שזה קובץ xlsx תקין" })
  }
  if (parsed.foundSheets.length === 0) {
    return err({ code: "VALIDATION", message: "לא נמצאו בקובץ גיליונות מוכרים. יש להשתמש בקובץ שיוצא מהמסך הזה" })
  }

  const errors: PaymentsImportSummary["errors"] = []
  const summary = { pricesChanged: 0, plansSaved: 0, statusesChanged: 0 }

  // Prices for this vintage.
  const [blocks, overrides] = await Promise.all([
    prisma.vineyardBlock.findMany({ select: { id: true, name: true } }),
    prisma.blockVintagePrice.findMany({ where: { vintageId } }),
  ])
  const blockByName = new Map(blocks.map((block) => [normalizeHeader(block.name), block.id]))
  const overrideByBlock = new Map(overrides.map((row) => [row.blockId, row.pricePerKgAgorot]))
  for (const row of parsed.prices) {
    const fail = (message: string) => errors.push({ sheet: "מחירים לבציר", row: row.row, message })
    const blockId = blockByName.get(normalizeHeader(row.block))
    if (row.invalid) fail(row.invalid)
    else if (!blockId) fail(`הבלוק "${row.block}" לא נמצא`)
    else if (row.priceShekels !== null && (row.priceShekels < 0 || row.priceShekels > MAX_PRICE_SHEKELS)) {
      fail(`המחיר חייב להיות בין 0 ל-${MAX_PRICE_SHEKELS}`)
    } else if (row.priceShekels === null) {
      if (overrideByBlock.has(blockId)) {
        await prisma.blockVintagePrice.deleteMany({ where: { vintageId, blockId } })
        summary.pricesChanged += 1
      }
    } else if (overrideByBlock.get(blockId) !== shekelsToAgorot(row.priceShekels)) {
      const pricePerKgAgorot = shekelsToAgorot(row.priceShekels)
      await prisma.blockVintagePrice.upsert({
        where: { blockId_vintageId: { blockId, vintageId } },
        create: { blockId, vintageId, pricePerKgAgorot },
        update: { pricePerKgAgorot },
      })
      summary.pricesChanged += 1
    }
  }

  // The first month and the number of payments of each grower.
  let overview = await loadPaymentsOverviewById(vintageId)
  for (const row of parsed.settings) {
    const fail = (message: string) => errors.push({ sheet: "הגדרות כורמים", row: row.row, message })
    const grower = overview.growers.find((candidate) => normalizeHeader(candidate.name) === normalizeHeader(row.grower))
    if (row.invalid) fail(row.invalid)
    else if (!grower) fail(`לכורם "${row.grower}" אין קליטות בבציר הזה`)
    else if (row.firstMonth === null && row.count === null) continue
    else if (row.firstMonth === null || row.count === null) fail("יש למלא גם חודש תשלום ראשון וגם מספר תשלומים")
    else if (grower.plan?.firstMonth === row.firstMonth && grower.plan.count === row.count && !grower.scheduleOutOfDate) continue
    else {
      const result = await applyPaymentPlan(vintageId, grower.id, row.firstMonth, row.count)
      if (result.success) summary.plansSaved += 1
      else fail(result.error.message)
    }
  }

  // The status of each payment.
  overview = await loadPaymentsOverviewById(vintageId)
  for (const row of parsed.statuses) {
    const fail = (message: string) => errors.push({ sheet: PAYMENTS_SHEET, row: row.row, message })
    const grower = overview.growers.find((candidate) => normalizeHeader(candidate.name) === normalizeHeader(row.grower))
    const installment = grower?.installments.find((candidate) => candidate.sequence === row.sequence)
    if (!grower) fail(`הכורם "${row.grower}" לא נמצא בבציר הזה`)
    else if (!installment) fail(`לכורם "${row.grower}" אין תשלום מספר ${row.sequence}. יש להגדיר קודם חודש ראשון ומספר תשלומים`)
    else if (row.paid === null) {
      if (row.raw !== "") fail(`הסטטוס "${row.raw}" אינו תקין. יש לבחור שולם או פתוח`)
    } else if (installment.paid !== row.paid) {
      await prisma.growerInstallment.update({ where: { id: installment.id }, data: { paidAt: row.paid ? new Date() : null } })
      summary.statusesChanged += 1
    }
  }

  revalidatePath("/admin/grower-payments")
  return ok({ ...summary, errors })
}
