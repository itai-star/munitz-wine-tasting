import { prisma } from "@/lib/prisma"
import { MAX_INSTALLMENTS, addMonths, isMonthKey, splitEvenly } from "@/lib/grower-payments"
import { loadPaymentsOverviewById } from "@/server/grower-payments-data"
import { ok, err } from "@/types"
import type { Result } from "@/types"

// Builds or rebuilds a grower's schedule for a vintage. Payments already marked as paid stay exactly as they are;
// what is still owed is divided evenly between the payments that are still open.
export async function applyPaymentPlan(
  vintageId: string,
  growerId: string,
  firstMonth: string,
  count: number
): Promise<Result<void>> {
  if (!isMonthKey(firstMonth)) return err({ code: "VALIDATION", message: "חודש התשלום הראשון אינו תקין" })
  if (!Number.isInteger(count) || count < 1 || count > MAX_INSTALLMENTS) {
    return err({ code: "VALIDATION", message: `מספר התשלומים חייב להיות בין 1 ל-${MAX_INSTALLMENTS}` })
  }

  const overview = await loadPaymentsOverviewById(vintageId)
  const grower = overview.growers.find((row) => row.id === growerId)
  if (!grower) return err({ code: "NOT_FOUND", message: "לכורם אין קליטות בבציר הזה" })

  const paid = grower.installments.filter((row) => row.paid)
  const paidSequences = new Set(paid.map((row) => row.sequence))
  if (paid.some((row) => row.sequence > count)) {
    return err({ code: "VALIDATION", message: "אי אפשר להקטין את מספר התשלומים מתחת לתשלומים שכבר שולמו" })
  }

  const paidTotal = paid.reduce((sum, row) => sum + row.amountAgorot, 0)
  const openSequences = Array.from({ length: count }, (_, index) => index + 1).filter((seq) => !paidSequences.has(seq))
  const amounts = splitEvenly(Math.max(grower.amountAgorot - paidTotal, 0), openSequences.length)

  try {
    await prisma.$transaction(async (tx) => {
      const plan = await tx.growerPaymentPlan.upsert({
        where: { vintageId_growerId: { vintageId, growerId } },
        create: { vintageId, growerId, firstMonth, installmentCount: count },
        update: { firstMonth, installmentCount: count },
      })
      await tx.growerInstallment.deleteMany({ where: { planId: plan.id, paidAt: null } })
      await tx.growerInstallment.createMany({
        data: openSequences.map((sequence, index) => ({
          planId: plan.id,
          sequence,
          dueMonth: addMonths(firstMonth, sequence - 1),
          amountAgorot: amounts[index],
        })),
      })
    })
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת לוח התשלומים" })
  }
}
