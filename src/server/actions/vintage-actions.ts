"use server"

import { prisma } from "@/lib/prisma"
import { ok, err } from "@/types"
import type { Result } from "@/types"
import { z } from "zod"

const CreateVintageSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  label: z.string().min(1, "יש להזין תווית לעונה"),
})

export async function createVintage(
  input: z.infer<typeof CreateVintageSchema>
): Promise<Result<{ id: string }>> {
  const parsed = CreateVintageSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  try {
    const vintage = await prisma.vintage.create({ data: parsed.data })
    return ok({ id: vintage.id })
  } catch {
    return err({ code: "DUPLICATE", message: "כבר קיימת עונה עם השנה הזו" })
  }
}

export async function listVintages(): Promise<
  Result<Array<{ id: string; year: number; label: string }>>
> {
  try {
    const vintages = await prisma.vintage.findMany({
      orderBy: { year: "desc" },
      select: { id: true, year: true, label: true },
    })
    return ok(vintages)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת רשימת העונות" })
  }
}
