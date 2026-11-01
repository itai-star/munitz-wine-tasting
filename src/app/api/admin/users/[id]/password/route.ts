import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkPassword } from "@/lib/password-policy"
import { getCurrentUser } from "@/server/auth/session"
import { hashPassword } from "@/server/auth/password"
import { isSameOrigin, readJson, text } from "@/server/auth/same-origin"

export const dynamic = "force-dynamic"

// Sets a temporary password for another user. The user must replace it at their next sign-in.
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "בקשה לא מורשית" }, { status: 403 })

  const current = await getCurrentUser()
  if (!current) return NextResponse.json({ error: "יש להתחבר מחדש" }, { status: 401 })
  if (current.role !== "ADMIN") return NextResponse.json({ error: "אין הרשאה לפעולה הזו" }, { status: 403 })

  const { id } = await context.params
  const body = await readJson(request)
  const password = text(body?.password)
  const invalid = checkPassword(password)
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

  try {
    const target = await prisma.appUser.findUnique({ where: { id }, select: { id: true } })
    if (!target) return NextResponse.json({ error: "המשתמש לא נמצא" }, { status: 404 })

    await prisma.$transaction([
      prisma.appUser.update({
        where: { id },
        data: {
          passwordHash: await hashPassword(password),
          mustChangePassword: id !== current.id,
          failedAttempts: 0,
          lockedUntil: null,
        },
      }),
      prisma.userSession.deleteMany({ where: { userId: id } }),
      prisma.passwordResetRequest.updateMany({
        where: { userId: id, handledAt: null },
        data: { handledAt: new Date() },
      }),
    ])
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "שגיאה באיפוס הסיסמה" }, { status: 500 })
  }
}
