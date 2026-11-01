import { prisma } from "@/lib/prisma"
import { normalizeUsername } from "@/lib/password-policy"
import { landingPageFor } from "@/lib/permissions"
import type { PermissionKey } from "@/lib/permissions"
import { verifyAgainstDecoy, verifyPassword } from "@/server/auth/password"

const MAX_FAILED_ATTEMPTS = 5
const LOCK_MINUTES = 15

export type LoginOutcome =
  | { status: "ok"; userId: string; landingPage: string }
  | { status: "locked"; minutes: number }
  | { status: "wrong" }

export async function authenticate(rawUsername: string, password: string): Promise<LoginOutcome> {
  const user = await prisma.appUser.findUnique({ where: { username: normalizeUsername(rawUsername) } })

  // An unknown name, a disabled account and a wrong password all look the same from outside.
  if (!user || !user.isActive) {
    await verifyAgainstDecoy(password)
    return { status: "wrong" }
  }

  const now = Date.now()
  if (user.lockedUntil && user.lockedUntil.getTime() > now) {
    return { status: "locked", minutes: Math.ceil((user.lockedUntil.getTime() - now) / 60000) }
  }

  if (await verifyPassword(password, user.passwordHash)) {
    await prisma.appUser.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    })
    return {
      status: "ok",
      userId: user.id,
      landingPage: user.mustChangePassword
        ? "/admin/account"
        : landingPageFor({ role: user.role, permissions: user.permissions as PermissionKey[] }),
    }
  }

  const failedAttempts = user.failedAttempts + 1
  const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS
  await prisma.appUser.update({
    where: { id: user.id },
    data: {
      failedAttempts: shouldLock ? 0 : failedAttempts,
      lockedUntil: shouldLock ? new Date(now + LOCK_MINUTES * 60000) : null,
    },
  })
  return shouldLock ? { status: "locked", minutes: LOCK_MINUTES } : { status: "wrong" }
}
