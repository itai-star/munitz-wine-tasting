"use server"

import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { hebrewMonthName } from "@/lib/credit"
import { allocateRevenue, isCustomerType } from "@/lib/sales-summary"
import type { CustomerTypeKey } from "@/lib/sales-summary"
import { requirePermission } from "@/server/auth/guards"
import { normalizeCustomerName, parseSalesWorkbook } from "@/server/sales-import"
import { ok, err } from "@/types"
import type { Result } from "@/types"

const MAX_FILE_BYTES = 10 * 1024 * 1024
const MIN_YEAR = 2000
const MAX_YEAR = 2100
const PAGE = "/admin/monthly-summary"

export type SalesImportSummary = {
  months: { month: number; label: string; bottles: number; revenueAgorot: number }[]
  unclassifiedCustomers: number
  warnings: string[]
  ignoredSheets: string[]
}

function isValidYear(year: number): boolean {
  return Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR
}

// Importing a month again replaces what was stored for it, so the same file can be loaded repeatedly
// as the year fills in. Months the file does not contain are left as they are.
export async function importSalesWorkbook(
  year: number,
  formData: FormData
): Promise<Result<SalesImportSummary>> {
  await requirePermission("SALES")
  if (!isValidYear(year)) return err({ code: "VALIDATION", message: "יש לבחור שנה תקינה" })

  const file = formData.get("file")
  if (!(file instanceof File)) return err({ code: "VALIDATION", message: "לא נבחר קובץ" })
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return err({ code: "VALIDATION", message: "יש לבחור קובץ אקסל בפורמט xlsx" })
  }
  if (file.size > MAX_FILE_BYTES) return err({ code: "VALIDATION", message: "הקובץ גדול מדי (עד 10MB)" })

  let parsed
  try {
    parsed = await parseSalesWorkbook(await file.arrayBuffer())
  } catch {
    return err({ code: "VALIDATION", message: "לא ניתן לקרוא את הקובץ, יש לוודא שזה קובץ xlsx תקין" })
  }
  if (parsed.months.length === 0) {
    return err({
      code: "VALIDATION",
      message:
        "לא נמצאו נתוני מכירות. שם הגיליון צריך להיות שם החודש בעברית (למשל אפריל), והוא צריך לכלול את העמודות \"שם\" ו\"עלות\"",
    })
  }

  try {
    const storedRules = await prisma.salesCustomerRule.findMany()
    const ruleByName = new Map<string, CustomerTypeKey>(
      storedRules.filter((rule) => isCustomerType(rule.customerType)).map((rule) => [rule.name, rule.customerType as CustomerTypeKey])
    )

    // A customer's type written in any month of the file also fills the months that leave it empty.
    const learned = new Map<string, CustomerTypeKey>()
    for (const month of [...parsed.months].sort((a, b) => a.month - b.month)) {
      for (const sale of month.sales) if (sale.customerType) learned.set(sale.name, sale.customerType)
    }
    const typeOf = (name: string, own: CustomerTypeKey | null) => own ?? learned.get(name) ?? ruleByName.get(name) ?? null

    const unclassified = new Set<string>()
    await prisma.$transaction(
      async (tx) => {
        for (const month of parsed.months) {
          const bottles = month.sales.reduce((sum, sale) => sum + sale.bottles, 0)
          const revenue = month.sales.reduce((sum, sale) => sum + sale.revenueAgorot, 0)
          const stored = await tx.salesMonth.upsert({
            where: { year_month: { year, month: month.month } },
            create: { year, month: month.month, bottles, wineRevenueAgorot: revenue, sourceFile: file.name },
            update: { bottles, wineRevenueAgorot: revenue, sourceFile: file.name, importedAt: new Date() },
          })
          await tx.salesSale.deleteMany({ where: { monthId: stored.id } })

          const saleRows = []
          const itemRows = []
          for (const sale of month.sales) {
            const id = randomUUID()
            const customerType = typeOf(sale.name, sale.customerType)
            if (!customerType) unclassified.add(sale.name)
            saleRows.push({
              id,
              monthId: stored.id,
              name: sale.name,
              customerType,
              bottles: sale.bottles,
              revenueAgorot: sale.revenueAgorot,
            })
            for (const item of allocateRevenue(sale.revenueAgorot, sale.items)) {
              itemRows.push({ id: randomUUID(), saleId: id, ...item })
            }
          }
          await tx.salesSale.createMany({ data: saleRows })
          await tx.salesSaleItem.createMany({ data: itemRows })
        }

        const changed = [...learned].filter(([name, type]) => ruleByName.get(name) !== type)
        const created = changed.filter(([name]) => !ruleByName.has(name))
        await tx.salesCustomerRule.createMany({
          data: created.map(([name, customerType]) => ({ name, customerType })),
          skipDuplicates: true,
        })
        for (const [name, customerType] of changed.filter(([name]) => ruleByName.has(name))) {
          await tx.salesCustomerRule.update({ where: { name }, data: { customerType } })
        }
      },
      { timeout: 60000 }
    )

    revalidatePath(PAGE)
    return ok({
      months: parsed.months
        .map((month) => ({
          month: month.month,
          label: hebrewMonthName(month.month),
          bottles: month.sales.reduce((sum, sale) => sum + sale.bottles, 0),
          revenueAgorot: month.sales.reduce((sum, sale) => sum + sale.revenueAgorot, 0),
        }))
        .sort((a, b) => a.month - b.month),
      unclassifiedCustomers: unclassified.size,
      warnings: parsed.warnings,
      ignoredSheets: parsed.ignoredSheets,
    })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת הנתונים, לא נשמר דבר" })
  }
}

export async function deleteSalesMonth(year: number, month: number): Promise<Result<void>> {
  await requirePermission("SALES")
  if (!isValidYear(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return err({ code: "VALIDATION", message: "החודש שנבחר אינו תקין" })
  }
  try {
    await prisma.salesMonth.deleteMany({ where: { year, month } })
    revalidatePath(PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה במחיקת החודש" })
  }
}

// Remembers the type for a customer and applies it to every stored sale that has none yet.
export async function classifySalesCustomer(name: string, customerType: string): Promise<Result<{ updated: number }>> {
  await requirePermission("SALES")
  const normalized = normalizeCustomerName(name)
  if (!normalized || !isCustomerType(customerType)) {
    return err({ code: "VALIDATION", message: "פרטי הלקוח אינם תקינים" })
  }

  try {
    const [, updated] = await prisma.$transaction([
      prisma.salesCustomerRule.upsert({
        where: { name: normalized },
        create: { name: normalized, customerType },
        update: { customerType },
      }),
      prisma.salesSale.updateMany({ where: { name: normalized, customerType: null }, data: { customerType } }),
    ])
    revalidatePath(PAGE)
    return ok({ updated: updated.count })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת סוג הלקוח" })
  }
}
