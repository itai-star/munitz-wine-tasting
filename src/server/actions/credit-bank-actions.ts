"use server"

import { requirePermission } from "@/server/auth/guards"

export async function isBankImportAvailable(): Promise<boolean> {
  await requirePermission("CREDIT")
  return !process.env.VERCEL
}
