import { getCurrentUser } from "@/server/auth/session"
import { canUse } from "@/lib/permissions"
import type { PermissionKey, SessionUser } from "@/lib/permissions"

export class AuthError extends Error {
  constructor(readonly reason: "UNAUTHORIZED" | "FORBIDDEN") {
    super(reason)
  }
}

// Server actions can be called by anyone who knows their address, so each one checks the session itself
// and does not rely on the page that happens to render its form.
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) throw new AuthError("UNAUTHORIZED")
  return user
}

export async function requirePermission(...permissions: PermissionKey[]): Promise<SessionUser> {
  const user = await requireUser()
  if (!permissions.some((permission) => canUse(user, permission))) throw new AuthError("FORBIDDEN")
  return user
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser()
  if (user.role !== "ADMIN") throw new AuthError("FORBIDDEN")
  return user
}
