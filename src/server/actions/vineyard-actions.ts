"use server"

import { prisma } from "@/lib/prisma"
import { ok, err } from "@/types"
import type { Result } from "@/types"
import type { VineyardBlock } from "@prisma/client"
import { z } from "zod"
import { requirePermission } from "@/server/auth/guards"
import { BlockSchema } from "@/lib/vineyard-block-schema"

const UpdateBlockSchema = BlockSchema.extend({
  id: z.string().min(1),
})

export async function createBlock(
  input: z.infer<typeof BlockSchema>
): Promise<Result<{ id: string }>> {
  await requirePermission("HARVEST")
  const parsed = BlockSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  try {
    const block = await prisma.vineyardBlock.create({ data: parsed.data })
    return ok({ id: block.id })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה ביצירת הבלוק" })
  }
}

export async function updateBlock(
  input: z.infer<typeof UpdateBlockSchema>
): Promise<Result<{ id: string }>> {
  await requirePermission("HARVEST")
  const parsed = UpdateBlockSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  const { id, ...data } = parsed.data

  try {
    const block = await prisma.vineyardBlock.update({ where: { id }, data })
    return ok({ id: block.id })
  } catch {
    return err({ code: "NOT_FOUND", message: "הבלוק לא נמצא" })
  }
}

export async function listBlocks(): Promise<
  Result<Awaited<ReturnType<typeof prisma.vineyardBlock.findMany>>>
> {
  await requirePermission("HARVEST", "REMOTE_CONTROL")
  try {
    const blocks = await prisma.vineyardBlock.findMany({
      orderBy: { name: "asc" },
    })
    return ok(blocks)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת בלוקי הכרם" })
  }
}

export async function getBlock(id: string): Promise<Result<Omit<VineyardBlock, "growerId" | "pricePerKgAgorot">>> {
  await requirePermission("HARVEST", "REMOTE_CONTROL")
  try {
    const block = await prisma.vineyardBlock.findUnique({ where: { id } })
    if (!block) {
      return err({ code: "NOT_FOUND", message: "הבלוק לא נמצא" })
    }
    return ok(block)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת הבלוק" })
  }
}
