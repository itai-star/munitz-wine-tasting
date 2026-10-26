"use server"

import { prisma } from "@/lib/prisma"
import {
  CREDIT_PASSWORD_MIN_LENGTH,
  checkCreditPassword,
  endCreditSession,
  hasCreditPassword,
  hashPassword,
  startCreditSession,
} from "@/server/credit-auth"
import { ok, err } from "@/types"
import type { Result } from "@/types"
import { z } from "zod"

const PasswordSchema = z
  .string()
  .min(CREDIT_PASSWORD_MIN_LENGTH, `הסיסמה חייבת להכיל לפחות ${CREDIT_PASSWORD_MIN_LENGTH} תווים`)
  .max(200)

export async function setupCreditPassword(input: {
  password: string
  confirmation: string
}): Promise<Result<void>> {
  const parsed = PasswordSchema.safeParse(input.password)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }
  if (input.password !== input.confirmation) {
    return err({ code: "VALIDATION", message: "הסיסמאות אינן זהות" })
  }

  try {
    if (await hasCreditPassword()) {
      return err({ code: "DUPLICATE", message: "כבר הוגדרה סיסמה, יש להתחבר" })
    }
    const passwordHash = await hashPassword(input.password)
    await prisma.creditAccess.create({ data: { id: "default", passwordHash } })
    await startCreditSession(passwordHash)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בהגדרת הסיסמה" })
  }
}

export async function loginToCredit(password: string): Promise<Result<void>> {
  try {
    const outcome = await checkCreditPassword(password)
    switch (outcome.status) {
      case "ok":
        await startCreditSession(outcome.passwordHash)
        return ok(undefined)
      case "locked":
        return err({
          code: "VALIDATION",
          message: `יותר מדי ניסיונות שגויים. אפשר לנסות שוב בעוד ${outcome.minutes} דקות`,
        })
      case "not_set":
        return err({ code: "NOT_FOUND", message: "עדיין לא הוגדרה סיסמה" })
      case "wrong":
        return err({ code: "VALIDATION", message: "סיסמה שגויה" })
    }
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בכניסה" })
  }
}

export async function logoutFromCredit(): Promise<void> {
  await endCreditSession()
}
