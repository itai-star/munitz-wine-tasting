"use server"

import { prisma } from "@/lib/prisma"
import { ok, err } from "@/types"
import type { Result } from "@/types"
import { z } from "zod"

const WINE_TYPES = ["אדום", "לבן", "רוזה"] as const

const CreateBatchSchema = z.object({
  vintageId: z.string().min(1),
  tankName: z.string().min(1, "שם/מספר המיכל נדרש"),
  wineType: z.enum(WINE_TYPES).nullable(),
  volumeLiters: z.number().nullable(),
  litersAfterPressing: z.number().nullable(),
  litersAfterSettling: z.number().nullable(),
  yeastStrain: z.string().trim().min(1).nullable(),
  startDate: z.coerce.date(),
  notes: z.string().trim().min(1).nullable(),
  blockIds: z.array(z.string().min(1)).min(1, "יש לבחור לפחות בלוק אחד"),
})

export async function createBatch(
  input: z.infer<typeof CreateBatchSchema>
): Promise<Result<{ id: string }>> {
  const parsed = CreateBatchSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  const { blockIds, ...batchData } = parsed.data

  try {
    const batch = await prisma.fermentationBatch.create({
      data: {
        ...batchData,
        blocks: {
          create: blockIds.map((blockId) => ({ blockId })),
        },
      },
    })
    return ok({ id: batch.id })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה ביצירת המיכל" })
  }
}

const UpdateBatchSchema = CreateBatchSchema.extend({
  id: z.string().min(1),
})

export async function updateBatch(
  input: z.infer<typeof UpdateBatchSchema>
): Promise<Result<{ id: string }>> {
  const parsed = UpdateBatchSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  const { id, blockIds, vintageId: _vintageId, ...batchData } = parsed.data

  try {
    await prisma.$transaction([
      prisma.fermentationBatch.update({ where: { id }, data: batchData }),
      prisma.fermentationBatchBlock.deleteMany({ where: { batchId: id } }),
      prisma.fermentationBatchBlock.createMany({
        data: blockIds.map((blockId) => ({ batchId: id, blockId })),
      }),
    ])
    return ok({ id })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בעדכון המיכל" })
  }
}

export async function deleteBatch(id: string): Promise<Result<void>> {
  try {
    await prisma.fermentationBatch.delete({ where: { id } })
    return ok(undefined)
  } catch {
    return err({ code: "NOT_FOUND", message: "המיכל לא נמצא" })
  }
}

const UpdateBatchStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["active", "completed"]),
  endDate: z.coerce.date().nullable(),
})

export async function updateBatchStatus(
  input: z.infer<typeof UpdateBatchStatusSchema>
): Promise<Result<{ id: string }>> {
  const parsed = UpdateBatchStatusSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  try {
    const batch = await prisma.fermentationBatch.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status, endDate: parsed.data.endDate },
    })
    return ok({ id: batch.id })
  } catch {
    return err({ code: "NOT_FOUND", message: "המיכל לא נמצא" })
  }
}

export async function listActiveBatches(vintageId: string): Promise<
  Result<Awaited<ReturnType<typeof prisma.fermentationBatch.findMany>>>
> {
  try {
    const batches = await prisma.fermentationBatch.findMany({
      where: { vintageId, status: "active" },
      include: { blocks: { include: { block: true } } },
      orderBy: { startDate: "desc" },
    })
    return ok(batches)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת המיכלים הפעילים" })
  }
}

export async function getBatch(id: string): Promise<
  Result<NonNullable<Awaited<ReturnType<typeof prisma.fermentationBatch.findFirst>>>>
> {
  try {
    const batch = await prisma.fermentationBatch.findUnique({
      where: { id },
      include: { blocks: { include: { block: true } } },
    })
    if (!batch) {
      return err({ code: "NOT_FOUND", message: "המיכל לא נמצא" })
    }
    return ok(batch)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת המיכל" })
  }
}

const ReadingSchema = z.object({
  batchId: z.string().min(1),
  readingDate: z.coerce.date(),
  brix: z.number().nullable(),
  specificGravity: z.number().nullable(),
  temperatureCelsius: z.number().nullable(),
  ph: z.number().nullable(),
  yeastAdditions: z.string().trim().min(1).nullable(),
  cellarWork: z.string().trim().min(1).nullable(),
  so2Addition: z.string().trim().min(1).nullable(),
  tasteAromaNotes: z.string().trim().min(1).nullable(),
})

export async function addReading(
  input: z.infer<typeof ReadingSchema>
): Promise<Result<{ id: string }>> {
  const parsed = ReadingSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  const { batchId, readingDate, ...data } = parsed.data

  try {
    const reading = await prisma.fermentationReading.upsert({
      where: { batchId_readingDate: { batchId, readingDate } },
      create: { batchId, readingDate, ...data },
      update: data,
    })
    return ok({ id: reading.id })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת הקריאה" })
  }
}

const UpdateReadingSchema = z.object({
  id: z.string().min(1),
  readingDate: z.coerce.date(),
  brix: z.number().nullable(),
  specificGravity: z.number().nullable(),
  temperatureCelsius: z.number().nullable(),
  ph: z.number().nullable(),
  yeastAdditions: z.string().trim().min(1).nullable(),
  cellarWork: z.string().trim().min(1).nullable(),
  so2Addition: z.string().trim().min(1).nullable(),
  tasteAromaNotes: z.string().trim().min(1).nullable(),
})

export async function updateReading(
  input: z.infer<typeof UpdateReadingSchema>
): Promise<Result<{ id: string }>> {
  const parsed = UpdateReadingSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  const { id, ...data } = parsed.data

  try {
    const reading = await prisma.fermentationReading.update({
      where: { id },
      data,
    })
    return ok({ id: reading.id })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בעדכון הקריאה" })
  }
}

export async function listReadings(
  batchId: string
): Promise<Result<Awaited<ReturnType<typeof prisma.fermentationReading.findMany>>>> {
  try {
    const readings = await prisma.fermentationReading.findMany({
      where: { batchId },
      orderBy: { readingDate: "asc" },
    })
    return ok(readings)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת יומן הקריאות" })
  }
}
