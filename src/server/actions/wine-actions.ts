"use server"

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { ok, err } from "@/types"
import type { Result, AppError } from "@/types"
import { z } from "zod"

const CreateWineSchema = z.object({
  name: z.string().min(1, "שם היין נדרש"),
  year: z.number().int().min(1900).max(2100).nullable(),
  type: z.string().nullable(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  price: z.number().int().min(0).nullable(),
  quantity: z.number().int().min(0),
  barcode: z.string().trim().min(1).nullable(),
})

function isDuplicateBarcodeError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    Array.isArray(error.meta?.target) &&
    error.meta.target.includes("barcode")
  )
}

const UpdateWineSchema = CreateWineSchema.extend({
  id: z.string().min(1),
})

export async function getWines(): Promise<Result<Awaited<ReturnType<typeof prisma.wine.findMany>>>> {
  try {
    const wines = await prisma.wine.findMany({
      orderBy: { createdAt: "desc" },
    })
    return ok(wines)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת היינות" })
  }
}

export async function createWine(input: z.infer<typeof CreateWineSchema>): Promise<Result<{ id: string }>> {
  const parsed = CreateWineSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  try {
    const wine = await prisma.wine.create({
      data: {
        name: parsed.data.name,
        year: parsed.data.year,
        type: parsed.data.type,
        description: parsed.data.description,
        imageUrl: parsed.data.imageUrl,
        price: parsed.data.price,
        quantity: parsed.data.quantity,
        barcode: parsed.data.barcode,
      },
    })
    return ok({ id: wine.id })
  } catch (error) {
    if (isDuplicateBarcodeError(error)) {
      return err({ code: "DUPLICATE", message: "הברקוד הזה כבר משויך ליין אחר" })
    }
    return err({ code: "SERVER_ERROR", message: "שגיאה ביצירת היין" })
  }
}

export async function updateWine(input: z.infer<typeof UpdateWineSchema>): Promise<Result<{ id: string }>> {
  const parsed = UpdateWineSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  try {
    const wine = await prisma.wine.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        year: parsed.data.year,
        type: parsed.data.type,
        description: parsed.data.description,
        imageUrl: parsed.data.imageUrl,
        price: parsed.data.price,
        quantity: parsed.data.quantity,
        barcode: parsed.data.barcode,
      },
    })
    return ok({ id: wine.id })
  } catch (error) {
    if (isDuplicateBarcodeError(error)) {
      return err({ code: "DUPLICATE", message: "הברקוד הזה כבר משויך ליין אחר" })
    }
    return err({ code: "NOT_FOUND", message: "היין לא נמצא" })
  }
}

export async function deleteWine(id: string): Promise<Result<void, AppError>> {
  try {
    await prisma.wine.delete({ where: { id } })
    return ok(undefined)
  } catch {
    return err({ code: "NOT_FOUND", message: "היין לא נמצא" })
  }
}
