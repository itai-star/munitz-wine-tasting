"use server"

import { prisma } from "@/lib/prisma"
import { requireCreditSession } from "@/server/credit-auth"
import { ok, err } from "@/types"
import type { Result } from "@/types"
import { z } from "zod"

const CardFieldsSchema = z.object({
  name: z.string().trim().min(1, "יש להזין שם לכרטיס").max(40),
  last4: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "יש להזין 4 ספרות אחרונות")
    .nullable(),
})

async function authorize(): Promise<Result<void>> {
  try {
    await requireCreditSession()
    return ok(undefined)
  } catch {
    return err({ code: "VALIDATION", message: "פג תוקף הכניסה, יש להתחבר מחדש" })
  }
}

export async function createCreditCard(
  input: z.input<typeof CardFieldsSchema>
): Promise<Result<{ id: string }>> {
  const auth = await authorize()
  if (!auth.success) return auth

  const parsed = CardFieldsSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  try {
    const card = await prisma.creditCard.create({ data: parsed.data })
    return ok({ id: card.id })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בהוספת הכרטיס" })
  }
}

export async function updateCreditCard(
  input: z.input<typeof CardFieldsSchema> & { id: string }
): Promise<Result<void>> {
  const auth = await authorize()
  if (!auth.success) return auth

  const parsed = CardFieldsSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  try {
    await prisma.creditCard.update({ where: { id: input.id }, data: parsed.data })
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בעדכון הכרטיס" })
  }
}

export async function deleteCreditCard(id: string): Promise<Result<void>> {
  const auth = await authorize()
  if (!auth.success) return auth

  try {
    await prisma.creditCard.delete({ where: { id } })
    return ok(undefined)
  } catch {
    return err({ code: "NOT_FOUND", message: "הכרטיס לא נמצא" })
  }
}
