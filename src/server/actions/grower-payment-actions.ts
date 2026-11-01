"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { MAX_INSTALLMENTS } from "@/lib/grower-payments"
import { shekelsToAgorot } from "@/lib/vineyard-excel"
import { requirePermission } from "@/server/auth/guards"
import { applyPaymentPlan } from "@/server/grower-payments-plan"
import { ok, err } from "@/types"
import type { Result } from "@/types"

const MAX_PRICE_SHEKELS = 1000
const PAGE = "/admin/grower-payments"

const PriceSchema = z.object({
  vintageId: z.string().min(1),
  blockId: z.string().min(1),
  pricePerKg: z.number().min(0, "המחיר לא יכול להיות שלילי").max(MAX_PRICE_SHEKELS, "המחיר גבוה מדי").nullable(),
})

const PlanSchema = z.object({
  vintageId: z.string().min(1),
  growerId: z.string().min(1),
  firstMonth: z.string(),
  count: z.number().int().min(1, "מספר התשלומים חייב להיות לפחות 1").max(MAX_INSTALLMENTS, "מספר התשלומים גבוה מדי"),
})

// A price for this vintage only. Leaving it empty goes back to the block's default price.
export async function setVintagePrice(input: z.input<typeof PriceSchema>): Promise<Result<void>> {
  await requirePermission("GROWERS")
  const parsed = PriceSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  const { vintageId, blockId, pricePerKg } = parsed.data

  try {
    if (pricePerKg === null) {
      await prisma.blockVintagePrice.deleteMany({ where: { vintageId, blockId } })
    } else {
      const pricePerKgAgorot = shekelsToAgorot(pricePerKg)
      await prisma.blockVintagePrice.upsert({
        where: { blockId_vintageId: { blockId, vintageId } },
        create: { blockId, vintageId, pricePerKgAgorot },
        update: { pricePerKgAgorot },
      })
    }
    revalidatePath(PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "NOT_FOUND", message: "הבלוק או הבציר לא נמצאו" })
  }
}

export async function savePaymentPlan(input: z.input<typeof PlanSchema>): Promise<Result<void>> {
  await requirePermission("GROWERS")
  const parsed = PlanSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.errors[0].message })

  const result = await applyPaymentPlan(parsed.data.vintageId, parsed.data.growerId, parsed.data.firstMonth, parsed.data.count)
  if (result.success) revalidatePath(PAGE)
  return result
}

export async function setInstallmentPaid(installmentId: string, paid: boolean): Promise<Result<void>> {
  await requirePermission("GROWERS")
  try {
    await prisma.growerInstallment.update({ where: { id: installmentId }, data: { paidAt: paid ? new Date() : null } })
    revalidatePath(PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "NOT_FOUND", message: "התשלום לא נמצא" })
  }
}
