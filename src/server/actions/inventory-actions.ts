"use server"

import { prisma } from "@/lib/prisma"
import { ok, err } from "@/types"
import type { Result, AppError } from "@/types"
import { z } from "zod"

const WithdrawSchema = z
  .object({
    wineId: z.string().min(1).optional(),
    barcode: z.string().min(1).optional(),
    quantity: z.number().int().min(1, "הכמות חייבת להיות לפחות 1"),
  })
  .refine((data) => Boolean(data.wineId) || Boolean(data.barcode), {
    message: "יש לציין יין או ברקוד",
  })

export async function withdrawWine(
  input: z.infer<typeof WithdrawSchema>
): Promise<Result<{ wineId: string; wineName: string; newQuantity: number }>> {
  const parsed = WithdrawSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const wine = parsed.data.wineId
        ? await tx.wine.findUnique({ where: { id: parsed.data.wineId } })
        : await tx.wine.findUnique({ where: { barcode: parsed.data.barcode } })

      if (!wine) {
        throw new WithdrawError({ code: "NOT_FOUND", message: "היין לא נמצא" })
      }
      if (wine.quantity < parsed.data.quantity) {
        throw new WithdrawError({
          code: "VALIDATION",
          message: `אין מספיק מלאי — נותרו רק ${wine.quantity} בקבוקים`,
        })
      }

      const updated = await tx.wine.update({
        where: { id: wine.id },
        data: { quantity: wine.quantity - parsed.data.quantity },
      })
      await tx.wineWithdrawal.create({
        data: { wineId: wine.id, quantity: parsed.data.quantity },
      })

      return { wineId: wine.id, wineName: wine.name, newQuantity: updated.quantity }
    })

    return ok(result)
  } catch (error) {
    if (error instanceof WithdrawError) {
      return err(error.appError)
    }
    return err({ code: "SERVER_ERROR", message: "שגיאה בעדכון המלאי" })
  }
}

const AdjustStockSchema = z.discriminatedUnion("mode", [
  z.object({
    wineId: z.string().min(1),
    mode: z.literal("add"),
    quantity: z.number().int().min(1, "יש להוסיף לפחות בקבוק אחד"),
  }),
  z.object({
    wineId: z.string().min(1),
    mode: z.literal("set"),
    quantity: z.number().int().min(0, "הכמות לא יכולה להיות שלילית"),
  }),
])

export async function adjustWineStock(
  input: z.infer<typeof AdjustStockSchema>
): Promise<Result<{ wineName: string; newQuantity: number }>> {
  const parsed = AdjustStockSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  const { wineId, mode, quantity } = parsed.data

  try {
    const updated = await prisma.wine.update({
      where: { id: wineId },
      data: { quantity: mode === "add" ? { increment: quantity } : quantity },
      select: { name: true, quantity: true },
    })
    return ok({ wineName: updated.name, newQuantity: updated.quantity })
  } catch {
    return err({ code: "NOT_FOUND", message: "היין לא נמצא או שהעדכון נכשל" })
  }
}

export async function getRecentWithdrawals(limit = 20): Promise<
  Result<Array<{ id: string; wineName: string; quantity: number; createdAt: Date }>>
> {
  try {
    const withdrawals = await prisma.wineWithdrawal.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { wine: { select: { name: true } } },
    })
    return ok(
      withdrawals.map((w) => ({
        id: w.id,
        wineName: w.wine.name,
        quantity: w.quantity,
        createdAt: w.createdAt,
      }))
    )
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת יומן המשיכות" })
  }
}

class WithdrawError extends Error {
  appError: AppError
  constructor(appError: AppError) {
    super(appError.message)
    this.appError = appError
  }
}
