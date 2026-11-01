"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { PERMISSIONS } from "@/lib/permissions"
import type { PermissionKey, UserRoleKey } from "@/lib/permissions"
import { requireAdmin } from "@/server/auth/guards"
import { ok, err } from "@/types"
import type { Result } from "@/types"

export type ManagedUser = {
  id: string
  username: string
  role: UserRoleKey
  permissions: PermissionKey[]
  isActive: boolean
  mustChangePassword: boolean
  lastLoginAt: string | null
  createdAt: string
}

export type ResetRequestRow = {
  id: string
  username: string
  userExists: boolean
  emailSent: boolean
  requestedAt: string
}

const UpdateUserSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["ADMIN", "USER"]),
  permissions: z.array(z.enum(PERMISSIONS)),
  isActive: z.boolean(),
})

const USERS_PAGE = "/admin/users"

export async function listUsers(): Promise<Result<ManagedUser[]>> {
  await requireAdmin()
  try {
    const users = await prisma.appUser.findMany({ orderBy: { createdAt: "asc" } })
    return ok(
      users.map((user) => ({
        id: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions as PermissionKey[],
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
      }))
    )
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת המשתמשים" })
  }
}

export async function listOpenResetRequests(): Promise<Result<ResetRequestRow[]>> {
  await requireAdmin()
  try {
    const requests = await prisma.passwordResetRequest.findMany({
      where: { handledAt: null },
      orderBy: { requestedAt: "desc" },
      take: 50,
    })
    return ok(
      requests.map((request) => ({
        id: request.id,
        username: request.username,
        userExists: request.userId !== null,
        emailSent: request.emailSent,
        requestedAt: request.requestedAt.toISOString(),
      }))
    )
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת בקשות האיפוס" })
  }
}

// The system must always keep at least one active administrator.
async function otherActiveAdmins(excludingId: string): Promise<number> {
  return prisma.appUser.count({ where: { role: "ADMIN", isActive: true, NOT: { id: excludingId } } })
}

export async function updateUser(input: z.infer<typeof UpdateUserSchema>): Promise<Result<void>> {
  const actor = await requireAdmin()

  const parsed = UpdateUserSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: "הפרטים שהוזנו אינם תקינים" })
  const { id, role, permissions, isActive } = parsed.data

  try {
    const target = await prisma.appUser.findUnique({ where: { id } })
    if (!target) return err({ code: "NOT_FOUND", message: "המשתמש לא נמצא" })

    if (id === actor.id && (role !== "ADMIN" || !isActive)) {
      return err({ code: "VALIDATION", message: "אי אפשר להוריד לעצמך הרשאת מנהל או להשבית את עצמך" })
    }
    const losesAdmin = target.role === "ADMIN" && target.isActive && (role !== "ADMIN" || !isActive)
    if (losesAdmin && (await otherActiveAdmins(id)) === 0) {
      return err({ code: "VALIDATION", message: "חייב להישאר לפחות מנהל פעיל אחד" })
    }

    await prisma.$transaction([
      prisma.appUser.update({ where: { id }, data: { role, permissions: [...new Set(permissions)], isActive } }),
      // A disabled user is signed out everywhere immediately.
      ...(isActive ? [] : [prisma.userSession.deleteMany({ where: { userId: id } })]),
    ])
    revalidatePath(USERS_PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בעדכון המשתמש" })
  }
}

export async function deleteUser(id: string): Promise<Result<void>> {
  const actor = await requireAdmin()
  if (id === actor.id) return err({ code: "VALIDATION", message: "אי אפשר למחוק את המשתמש שלך" })

  try {
    const target = await prisma.appUser.findUnique({ where: { id } })
    if (!target) return err({ code: "NOT_FOUND", message: "המשתמש לא נמצא" })
    if (target.role === "ADMIN" && target.isActive && (await otherActiveAdmins(id)) === 0) {
      return err({ code: "VALIDATION", message: "חייב להישאר לפחות מנהל פעיל אחד" })
    }

    await prisma.appUser.delete({ where: { id } })
    revalidatePath(USERS_PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה במחיקת המשתמש" })
  }
}

export async function dismissResetRequest(id: string): Promise<Result<void>> {
  await requireAdmin()
  try {
    await prisma.passwordResetRequest.updateMany({ where: { id, handledAt: null }, data: { handledAt: new Date() } })
    revalidatePath(USERS_PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בעדכון הבקשה" })
  }
}
