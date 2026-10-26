"use server"

import { requireCreditSession } from "@/server/credit-auth"
import {
  isUnexpectedBankResponse,
  runMizrahiCreditImport,
  type BankImportSummary,
} from "@/server/bank/mizrahi-credit-import"
import { BankSessionError, type BankLoginFailure } from "@/server/bank/mizrahi-session"
import { ok, err } from "@/types"
import type { Result } from "@/types"
import { z } from "zod"

const CredentialsSchema = z.object({
  username: z.string().trim().min(1, "יש להזין שם משתמש").max(100),
  password: z.string().min(1, "יש להזין סיסמה").max(200),
})

const FAILURE_MESSAGES: Record<BankLoginFailure, string> = {
  WRONG_CREDENTIALS: "שם המשתמש או הסיסמה שגויים. לא בוצע ניסיון נוסף כדי לא לחסום את החשבון",
  CHANGE_PASSWORD: "הבנק דורש להחליף סיסמה. יש לעשות זאת באתר הבנק ואז לנסות שוב",
  TIMEOUT: "הכניסה לא הושלמה בזמן. אם הופיע חלון קוד SMS, יש להשלים אותו בדפדפן שנפתח",
  NO_BROWSER: "לא נמצא דפדפן Edge או Chrome מותקן במחשב",
  NO_TOKEN: "הכניסה הצליחה אבל האתר לא החזיר אישור לשליפת נתונים",
}

export async function isBankImportAvailable(): Promise<boolean> {
  return !process.env.VERCEL
}

// The credentials only live in this call's memory; nothing here stores or logs them.
export async function importCreditFromBank(input: {
  username: string
  password: string
}): Promise<Result<BankImportSummary>> {
  try {
    await requireCreditSession()
  } catch {
    return err({ code: "VALIDATION", message: "פג תוקף הכניסה, יש להתחבר מחדש" })
  }

  if (!(await isBankImportAvailable())) {
    return err({
      code: "VALIDATION",
      message: "המשיכה מהבנק זמינה רק כשהאפליקציה רצה על המחשב שלך",
    })
  }

  const parsed = CredentialsSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  try {
    return ok(await runMizrahiCreditImport(parsed.data))
  } catch (error) {
    if (error instanceof BankSessionError) {
      return err({ code: "SERVER_ERROR", message: FAILURE_MESSAGES[error.reason] })
    }
    if (isUnexpectedBankResponse(error)) {
      return err({
        code: "SERVER_ERROR",
        message: "האתר החזיר מבנה נתונים שלא מוכר. ייתכן שהוא השתנה, ויש לעדכן את הכלי",
      })
    }
    return err({ code: "SERVER_ERROR", message: "המשיכה מהבנק נכשלה" })
  }
}
