import { isCreditSessionValid } from "@/server/credit-auth"
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

// Only the error type and its closing explanation are logged. The credentials never reach
// this point, and database errors keep their cause on the last lines, not in the data.
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return "unknown error"
  const tail = error.message.trim().split("\n").slice(-3).join(" | ")
  return `${error.name}: ${tail}`.slice(0, 400)
}

// The credentials only live in this call's memory; nothing here stores or logs them.
export async function runBankImport(input: unknown): Promise<Result<BankImportSummary>> {
  if (!(await isCreditSessionValid())) {
    return err({ code: "VALIDATION", message: "פג תוקף הכניסה, יש להתחבר מחדש" })
  }

  if (process.env.VERCEL) {
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
    console.error("[bank-import] failed:", describeError(error))
    if (isUnexpectedBankResponse(error)) {
      return err({
        code: "SERVER_ERROR",
        message: "האתר החזיר מבנה נתונים שלא מוכר. ייתכן שהוא השתנה, ויש לעדכן את הכלי",
      })
    }
    return err({ code: "SERVER_ERROR", message: "המשיכה מהבנק נכשלה. פרטי השגיאה נרשמו ביומן השרת" })
  }
}
