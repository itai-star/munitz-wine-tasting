"use server"

import { prisma } from "@/lib/prisma"
import { encryptSecret } from "@/lib/encryption"
import { fetchRemoteMonitorReadings as readRemoteMonitor } from "@/server/remote-monitor-polling"
import type { RemoteSensorReading } from "@/server/remote-monitor-polling"
import { ok, err } from "@/types"
import type { Result } from "@/types"
import { z } from "zod"
import { requirePermission } from "@/server/auth/guards"

const SETTINGS_ID = "default"

const SaveSettingsSchema = z.object({
  host: z.string().trim().min(1, "יש להזין כתובת בקר"),
  username: z.string().trim().min(1, "יש להזין שם משתמש"),
  password: z.string().min(1, "יש להזין סיסמה"),
})

export async function saveRemoteMonitorSettings(
  input: z.infer<typeof SaveSettingsSchema>
): Promise<Result<{ id: string }>> {
  await requirePermission("REMOTE_CONTROL")
  const parsed = SaveSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  const { host, username, password } = parsed.data

  try {
    const settings = await prisma.remoteMonitorSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, host, username, password: encryptSecret(password) },
      update: { host, username, password: encryptSecret(password) },
    })
    return ok({ id: settings.id })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת הגדרות החיבור" })
  }
}

export async function deleteRemoteMonitorSettings(): Promise<Result<void>> {
  await requirePermission("REMOTE_CONTROL")
  try {
    await prisma.remoteMonitorSettings.deleteMany({ where: { id: SETTINGS_ID } })
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה במחיקת הגדרות החיבור" })
  }
}

export async function getRemoteMonitorConnection(): Promise<
  Result<{ host: string; username: string } | null>
> {
  await requirePermission("REMOTE_CONTROL")
  try {
    const settings = await prisma.remoteMonitorSettings.findUnique({ where: { id: SETTINGS_ID } })
    if (!settings) return ok(null)
    return ok({ host: settings.host, username: settings.username })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת הגדרות החיבור" })
  }
}

export type { RemoteSensorReading }

export async function fetchRemoteMonitorReadings(): Promise<
  Result<{ sensors: RemoteSensorReading[]; fetchedAt: string }>
> {
  await requirePermission("REMOTE_CONTROL")
  return readRemoteMonitor()
}

export type RemoteSensorSamplePoint = {
  recordedAt: string
  temperatureC: number | null
  humidityPercent: number | null
}

export async function getRemoteMonitorHistory(
  sensorKey: string,
  days = 7
): Promise<Result<RemoteSensorSamplePoint[]>> {
  await requirePermission("REMOTE_CONTROL")
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const samples = await prisma.remoteSensorSample.findMany({
      where: { sensorKey, recordedAt: { gte: since } },
      orderBy: { recordedAt: "asc" },
    })
    return ok(
      samples.map((sample) => ({
        recordedAt: sample.recordedAt.toISOString(),
        temperatureC: sample.temperatureC,
        humidityPercent: sample.humidityPercent,
      }))
    )
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת היסטוריית החיישן" })
  }
}
