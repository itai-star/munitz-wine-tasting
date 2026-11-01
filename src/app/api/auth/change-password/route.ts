import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPassword } from "@/lib/password-policy"
import { hashPassword, verifyPassword } from "@/server/auth/password"
import { getCurrentUser, endOtherSessions } from "@/server/auth/session"
import { isSameOrigin, readJson, text } from "@/server/auth/same-origin"

export const dynamic = "force-dynamic"

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "בקשה לא מורשית" }, { status: 403 })

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "יש להתחבר מחדש" }, { status: 401 })

  const body = await readJson(request)
  const currentPassword = text(body?.currentPassword)
  const newPassword = text(body?.newPassword)

  const policyError = checkPassword(newPassword)
  if (policyError) return NextResponse.json({ error: policyError }, { status: 400 })
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: "הסיסמה החדשה חייבת להיות שונה מהנוכחית" }, { status: 400 })
  }

  try {
    const record = await prisma.appUser.findUnique({ where: { id: user.id } })
    if (!record || !(await verifyPassword(currentPassword, record.passwordHash))) {
      return NextResponse.json({ error: "הסיסמה הנוכחית שגויה" }, { status: 400 })
    }

    await prisma.appUser.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword), mustChangePassword: false },
    })
    await endOtherSessions(user.id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "שגיאה בשינוי הסיסמה" }, { status: 500 })
  }
}
