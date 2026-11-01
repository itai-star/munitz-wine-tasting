import { createHash, randomBytes } from "crypto"
import { cache } from "react"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import type { PermissionKey, SessionUser } from "@/lib/permissions"

export const SESSION_COOKIE = "munitz_session"
const SESSION_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

// The token in the cookie is random; only its hash is stored, so a copy of the database cannot be used to sign in.
export async function readSessionUser(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null

  const session = await prisma.userSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  })
  if (!session || session.expiresAt.getTime() < Date.now() || !session.user.isActive) return null

  return {
    id: session.user.id,
    username: session.user.username,
    role: session.user.role,
    permissions: session.user.permissions as PermissionKey[],
    mustChangePassword: session.user.mustChangePassword,
  }
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return readSessionUser(token)
})

export async function startSession(userId: string, userAgent: string | null): Promise<void> {
  const token = randomBytes(32).toString("base64url")
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY_MS)

  await prisma.userSession.create({
    data: { userId, tokenHash: hashToken(token), expiresAt, userAgent: userAgent?.slice(0, 300) ?? null },
  })
  // Expired rows are removed here, on the way in, so no scheduled job is needed.
  await prisma.userSession.deleteMany({ where: { expiresAt: { lt: new Date() } } })

  ;(await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * DAY_MS / 1000,
  })
}

export async function endSession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) await prisma.userSession.deleteMany({ where: { tokenHash: hashToken(token) } })
  store.delete({ name: SESSION_COOKIE, path: "/" })
}

// Used after a password change or reset: every other device has to sign in again.
export async function endOtherSessions(userId: string): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  await prisma.userSession.deleteMany({
    where: { userId, ...(token ? { NOT: { tokenHash: hashToken(token) } } : {}) },
  })
}
