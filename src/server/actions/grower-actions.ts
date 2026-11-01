"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { shekelsToAgorot } from "@/lib/vineyard-excel"
import { requirePermission } from "@/server/auth/guards"
import { ok, err } from "@/types"
import type { Result } from "@/types"

const MAX_PRICE_SHEKELS = 1000
const PAGES = ["/admin/growers", "/admin/vineyard"]

const GrowerFieldsSchema = z.object({
  name: z.string().transform((value) => value.replace(/\s+/g, " ").trim()).pipe(z.string().min(1, "יש להזין שם כורם").max(60)),
  phone: z.string().trim().max(30).nullable(),
  notes: z.string().trim().max(500).nullable(),
})

const UpdateGrowerSchema = GrowerFieldsSchema.extend({ id: z.string().min(1) })

const BlockFinanceSchema = z.object({
  blockId: z.string().min(1),
  growerId: z.string().min(1).nullable(),
  pricePerKg: z.number().min(0, "המחיר לא יכול להיות שלילי").max(MAX_PRICE_SHEKELS, "המחיר גבוה מדי").nullable(),
})

export type GrowerRow = {
  id: string
  name: string
  phone: string | null
  notes: string | null
  blocks: { id: string; name: string; variety: string; pricePerKgAgorot: number | null }[]
}

function revalidateAll(): void {
  for (const page of PAGES) revalidatePath(page)
}

function isDuplicate(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
}

export async function listGrowers(): Promise<Result<GrowerRow[]>> {
  await requirePermission("GROWERS")
  try {
    const growers = await prisma.grower.findMany({
      orderBy: { name: "asc" },
      include: {
        blocks: { orderBy: { name: "asc" }, select: { id: true, name: true, variety: true, pricePerKgAgorot: true } },
      },
    })
    return ok(growers)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת הכורמים" })
  }
}

export async function createGrower(input: z.input<typeof GrowerFieldsSchema>): Promise<Result<{ id: string }>> {
  await requirePermission("GROWERS")
  const parsed = GrowerFieldsSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.errors[0].message })

  try {
    const grower = await prisma.grower.create({ data: parsed.data })
    revalidateAll()
    return ok({ id: grower.id })
  } catch (error) {
    if (isDuplicate(error)) return err({ code: "DUPLICATE", message: "כורם בשם הזה כבר קיים" })
    return err({ code: "SERVER_ERROR", message: "שגיאה ביצירת הכורם" })
  }
}

export async function updateGrower(input: z.input<typeof UpdateGrowerSchema>): Promise<Result<{ id: string }>> {
  await requirePermission("GROWERS")
  const parsed = UpdateGrowerSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.errors[0].message })

  const { id, ...data } = parsed.data
  try {
    await prisma.grower.update({ where: { id }, data })
    revalidateAll()
    return ok({ id })
  } catch (error) {
    if (isDuplicate(error)) return err({ code: "DUPLICATE", message: "כורם בשם הזה כבר קיים" })
    return err({ code: "NOT_FOUND", message: "הכורם לא נמצא" })
  }
}

// The blocks of a deleted grower stay, with no grower, so their prices are kept.
export async function deleteGrower(id: string): Promise<Result<void>> {
  await requirePermission("GROWERS")
  try {
    await prisma.grower.delete({ where: { id } })
    revalidateAll()
    return ok(undefined)
  } catch {
    return err({ code: "NOT_FOUND", message: "הכורם לא נמצא" })
  }
}

export async function updateBlockFinance(input: z.input<typeof BlockFinanceSchema>): Promise<Result<void>> {
  await requirePermission("GROWERS")
  const parsed = BlockFinanceSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.errors[0].message })

  const { blockId, growerId, pricePerKg } = parsed.data
  try {
    await prisma.vineyardBlock.update({
      where: { id: blockId },
      data: { growerId, pricePerKgAgorot: pricePerKg === null ? null : shekelsToAgorot(pricePerKg) },
    })
    revalidateAll()
    return ok(undefined)
  } catch {
    return err({ code: "NOT_FOUND", message: "הבלוק או הכורם לא נמצאו" })
  }
}
