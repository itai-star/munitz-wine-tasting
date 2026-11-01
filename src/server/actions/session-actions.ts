"use server"

import { prisma } from "@/lib/prisma"
import { ok, err } from "@/types"
import type { Result, AppError } from "@/types"
import { z } from "zod"
import { requirePermission } from "@/server/auth/guards"

const CreateSessionSchema = z.object({
  name: z.string().min(1, "שם הטעימה נדרש"),
  wineIds: z.array(z.string()).min(1, "יש לבחור לפחות יין אחד"),
})

export async function getSessions(): Promise<Result<Awaited<ReturnType<typeof fetchSessions>>>> {
  await requirePermission("TASTINGS")
  try {
    const sessions = await fetchSessions()
    return ok(sessions)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת הטעימות" })
  }
}

async function fetchSessions() {
  return prisma.tastingSession.findMany({
    include: {
      wines: {
        include: { wine: true },
        orderBy: { order: "asc" },
      },
      _count: { select: { ratings: true, impressions: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getSession(id: string): Promise<Result<NonNullable<Awaited<ReturnType<typeof fetchSession>>>>> {
  await requirePermission("TASTINGS")
  try {
    const session = await fetchSession(id)
    if (!session) {
      return err({ code: "NOT_FOUND", message: "הטעימה לא נמצאה" })
    }
    return ok(session)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת הטעימה" })
  }
}

async function fetchSession(id: string) {
  return prisma.tastingSession.findUnique({
    where: { id },
    include: {
      wines: {
        include: { wine: true },
        orderBy: { order: "asc" },
      },
      ratings: true,
      impressions: true,
    },
  })
}

export async function createSession(input: z.infer<typeof CreateSessionSchema>): Promise<Result<{ id: string }>> {
  await requirePermission("TASTINGS")
  const parsed = CreateSessionSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  try {
    const session = await prisma.tastingSession.create({
      data: {
        name: parsed.data.name,
        wines: {
          create: parsed.data.wineIds.map((wineId, index) => ({
            wineId,
            order: index,
          })),
        },
      },
    })
    return ok({ id: session.id })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה ביצירת הטעימה" })
  }
}

export async function toggleSession(id: string): Promise<Result<{ isActive: boolean }>> {
  await requirePermission("TASTINGS")
  try {
    const session = await prisma.tastingSession.findUnique({ where: { id } })
    if (!session) {
      return err({ code: "NOT_FOUND", message: "הטעימה לא נמצאה" })
    }
    const updated = await prisma.tastingSession.update({
      where: { id },
      data: { isActive: !session.isActive },
    })
    return ok({ isActive: updated.isActive })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בעדכון הטעימה" })
  }
}

export async function deleteSession(id: string): Promise<Result<void, AppError>> {
  await requirePermission("TASTINGS")
  try {
    await prisma.tastingSession.delete({ where: { id } })
    return ok(undefined)
  } catch {
    return err({ code: "NOT_FOUND", message: "הטעימה לא נמצאה" })
  }
}
