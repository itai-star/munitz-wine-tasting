"use server"

import { prisma } from "@/lib/prisma"
import { ok, err } from "@/types"
import type { Result } from "@/types"
import { z } from "zod"

const CreateFinishedWineSchema = z.object({
  vintageId: z.string().min(1),
  tank: z.string().min(1, "שם/מספר המכל נדרש"),
  harvestedWeightKg: z.number().int().positive(),
  litersAfterPressing: z.number().int().positive().nullable(),
  litersAfterFirstRacking: z.number().int().positive().nullable(),
  litersAfterSecondRacking: z.number().int().positive().nullable(),
})

export async function createFinishedWine(
  input: z.infer<typeof CreateFinishedWineSchema>
): Promise<Result<{ id: string }>> {
  const parsed = CreateFinishedWineSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  try {
    const wine = await prisma.finishedWine.create({ data: parsed.data })
    return ok({ id: wine.id })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה ביצירת רשומת היין המוכן" })
  }
}

const UpdateFinishedWineSchema = CreateFinishedWineSchema.extend({
  id: z.string().min(1),
})

export async function updateFinishedWine(
  input: z.infer<typeof UpdateFinishedWineSchema>
): Promise<Result<{ id: string }>> {
  const parsed = UpdateFinishedWineSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  const { id, ...data } = parsed.data

  try {
    await prisma.finishedWine.update({ where: { id }, data })
    return ok({ id })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בעדכון רשומת היין המוכן" })
  }
}

export async function deleteFinishedWine(id: string): Promise<Result<void>> {
  try {
    await prisma.finishedWine.delete({ where: { id } })
    return ok(undefined)
  } catch {
    return err({ code: "NOT_FOUND", message: "הרשומה לא נמצאה" })
  }
}

export async function listFinishedWines(
  vintageId: string
): Promise<Result<Awaited<ReturnType<typeof prisma.finishedWine.findMany>>>> {
  try {
    const wines = await prisma.finishedWine.findMany({
      where: { vintageId },
      orderBy: { createdAt: "desc" },
    })
    return ok(wines)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת רשומות היין המוכן" })
  }
}

export async function getFinishedWine(
  id: string
): Promise<Result<NonNullable<Awaited<ReturnType<typeof prisma.finishedWine.findUnique>>>>> {
  try {
    const wine = await prisma.finishedWine.findUnique({ where: { id } })
    if (!wine) {
      return err({ code: "NOT_FOUND", message: "הרשומה לא נמצאה" })
    }
    return ok(wine)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת הרשומה" })
  }
}
