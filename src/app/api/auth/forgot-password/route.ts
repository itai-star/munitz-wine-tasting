import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizeUsername } from "@/lib/password-policy"
import { sendPasswordResetNotice } from "@/server/mail"
import { isSameOrigin, readJson, text } from "@/server/auth/same-origin"

export const dynamic = "force-dynamic"

const HOUR_MS = 60 * 60 * 1000
const REPEAT_WINDOW_MS = 15 * 60 * 1000
const MAX_REQUESTS_PER_HOUR = 10
const MAX_NAME_LENGTH = 64

// The answer is the same whether or not the name exists, so the form cannot be used to discover user names.
const ACCEPTED = { ok: true, message: "הבקשה נשלחה. מנהל המערכת יאפס את הסיסמה ויעביר לך סיסמה זמנית." }

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "בקשה לא מורשית" }, { status: 403 })

  const body = await readJson(request)
  const username = normalizeUsername(text(body?.username)).slice(0, MAX_NAME_LENGTH)
  if (!username) return NextResponse.json({ error: "יש להזין שם משתמש" }, { status: 400 })

  try {
    const now = Date.now()
    const [recentTotal, recentSame] = await Promise.all([
      prisma.passwordResetRequest.count({ where: { requestedAt: { gte: new Date(now - HOUR_MS) } } }),
      prisma.passwordResetRequest.count({
        where: { username, handledAt: null, requestedAt: { gte: new Date(now - REPEAT_WINDOW_MS) } },
      }),
    ])
    // Caps on the log and on the mailbox: repeated or flooding requests are acknowledged but not recorded.
    if (recentTotal >= MAX_REQUESTS_PER_HOUR || recentSame > 0) return NextResponse.json(ACCEPTED)

    const user = await prisma.appUser.findUnique({ where: { username }, select: { id: true } })
    const created = await prisma.passwordResetRequest.create({ data: { username, userId: user?.id ?? null } })

    if (user) {
      const origin = new URL(request.url).origin
      const emailSent = await sendPasswordResetNotice(username, origin)
      if (emailSent) {
        await prisma.passwordResetRequest.update({ where: { id: created.id }, data: { emailSent: true } })
      }
    }
    return NextResponse.json(ACCEPTED)
  } catch {
    return NextResponse.json({ error: "שגיאה בשליחת הבקשה, נסה שוב" }, { status: 500 })
  }
}
