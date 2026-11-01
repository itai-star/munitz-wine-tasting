import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { checkPassword, checkUsername, normalizeUsername } from "@/lib/password-policy"
import { PERMISSIONS } from "@/lib/permissions"
import { getCurrentUser } from "@/server/auth/session"
import { hashPassword } from "@/server/auth/password"
import { isSameOrigin, readJson } from "@/server/auth/same-origin"

export const dynamic = "force-dynamic"

const CreateUserSchema = z.object({
  username: z.string(),
  password: z.string(),
  role: z.enum(["ADMIN", "USER"]),
  permissions: z.array(z.enum(PERMISSIONS)),
})

// A route handler rather than a server action, so the new password is not printed in the development log.
export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "בקשה לא מורשית" }, { status: 403 })

  const current = await getCurrentUser()
  if (!current) return NextResponse.json({ error: "יש להתחבר מחדש" }, { status: 401 })
  if (current.role !== "ADMIN") return NextResponse.json({ error: "אין הרשאה לפעולה הזו" }, { status: 403 })

  const parsed = CreateUserSchema.safeParse(await readJson(request))
  if (!parsed.success) return NextResponse.json({ error: "הפרטים שהוזנו אינם תקינים" }, { status: 400 })

  const username = normalizeUsername(parsed.data.username)
  const invalid = checkUsername(username) ?? checkPassword(parsed.data.password)
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

  try {
    if (await prisma.appUser.findUnique({ where: { username }, select: { id: true } })) {
      return NextResponse.json({ error: "שם המשתמש כבר קיים" }, { status: 409 })
    }
    const user = await prisma.appUser.create({
      data: {
        username,
        passwordHash: await hashPassword(parsed.data.password),
        role: parsed.data.role,
        permissions: [...new Set(parsed.data.permissions)],
        // The password was chosen by an administrator, so the user picks their own on first sign-in.
        mustChangePassword: true,
      },
      select: { id: true },
    })
    return NextResponse.json({ ok: true, id: user.id })
  } catch {
    return NextResponse.json({ error: "שגיאה ביצירת המשתמש" }, { status: 500 })
  }
}
