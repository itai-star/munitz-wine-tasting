"use server"

import { prisma } from "@/lib/prisma"
import { ok, err } from "@/types"
import type { Result } from "@/types"
import { z } from "zod"

const IntakeSchema = z.object({
  vintageId: z.string().min(1),
  blockId: z.string().min(1),
  intakeDate: z.coerce.date(),
  totalWeightKg: z.number().min(0, "המשקל חייב להיות חיובי"),
  binCount: z.number().int().min(0, "כמות המשטחים חייבת להיות חיובית"),
  notes: z.string().trim().min(1).nullable(),
})

export async function createIntake(
  input: z.infer<typeof IntakeSchema>
): Promise<Result<{ id: string }>> {
  const parsed = IntakeSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  try {
    const intake = await prisma.grapeIntake.create({ data: parsed.data })
    return ok({ id: intake.id })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת קליטת הענבים" })
  }
}

export async function listIntakes(
  vintageId: string
): Promise<Result<Awaited<ReturnType<typeof prisma.grapeIntake.findMany>>>> {
  try {
    const intakes = await prisma.grapeIntake.findMany({
      where: { vintageId },
      orderBy: { intakeDate: "asc" },
    })
    return ok(intakes)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת קליטות הענבים" })
  }
}

const DeleteIntakesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "לא נבחרו קליטות למחיקה"),
})

export async function deleteIntakes(ids: string[]): Promise<Result<{ deleted: number }>> {
  const parsed = DeleteIntakesSchema.safeParse({ ids })
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  try {
    const result = await prisma.grapeIntake.deleteMany({
      where: { id: { in: parsed.data.ids } },
    })
    return ok({ deleted: result.count })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה במחיקת הקליטות" })
  }
}
