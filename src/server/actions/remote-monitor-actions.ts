"use server"

import { prisma } from "@/lib/prisma"
import { encryptSecret, decryptSecret } from "@/lib/encryption"
import { ok, err } from "@/types"
import type { Result } from "@/types"
import { z } from "zod"

const SETTINGS_ID = "default"

const SaveSettingsSchema = z.object({
  host: z.string().trim().min(1, "יש להזין כתובת בקר"),
  username: z.string().trim().min(1, "יש להזין שם משתמש"),
  password: z.string().min(1, "יש להזין סיסמה"),
})

export async function saveRemoteMonitorSettings(
  input: z.infer<typeof SaveSettingsSchema>
): Promise<Result<{ id: string }>> {
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
  try {
    const settings = await prisma.remoteMonitorSettings.findUnique({ where: { id: SETTINGS_ID } })
    if (!settings) return ok(null)
    return ok({ host: settings.host, username: settings.username })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת הגדרות החיבור" })
  }
}

export type RemoteSensorReading = {
  key: string
  name: string
  temperatureC: number | null
  humidityPercent: number | null
}

type TcwItem = { value: string; unit: string }
type TcwSensor = { description: string; item1: TcwItem; item2: TcwItem }
type TcwStatus = { Monitor: { S: Record<string, TcwSensor> } }

function parseSensorValue(item: TcwItem | undefined): number | null {
  if (!item || item.value === "---") return null
  const num = Number(item.value)
  return Number.isFinite(num) ? num : null
}

function extractSensors(status: TcwStatus): RemoteSensorReading[] {
  const sensors = status.Monitor?.S ?? {}
  const readings: RemoteSensorReading[] = []

  for (const key of Object.keys(sensors).sort()) {
    const sensor = sensors[key]
    const temperatureC = sensor.item1?.unit?.includes("C") ? parseSensorValue(sensor.item1) : null
    const humidityPercent = sensor.item2?.unit === "%RH" ? parseSensorValue(sensor.item2) : null

    if (temperatureC == null && humidityPercent == null) continue

    readings.push({ key, name: sensor.description || key, temperatureC, humidityPercent })
  }

  return readings
}

export async function fetchRemoteMonitorReadings(): Promise<
  Result<{ sensors: RemoteSensorReading[]; fetchedAt: string }>
> {
  let settings
  try {
    settings = await prisma.remoteMonitorSettings.findUnique({ where: { id: SETTINGS_ID } })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת הגדרות החיבור" })
  }

  if (!settings) {
    return err({ code: "NOT_FOUND", message: "לא הוגדר חיבור לבקר" })
  }

  let password: string
  try {
    password = decryptSecret(settings.password)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בפענוח פרטי ההתחברות, יש להגדיר מחדש" })
  }

  const query = new URLSearchParams({ a: `${settings.username}:${password}` })
  const host = settings.host.replace(/^https?:\/\//, "").replace(/\/$/, "")
  const url = `http://${host}/status.json?${query.toString()}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" })
    if (response.status === 401) {
      return err({ code: "VALIDATION", message: "שם המשתמש או הסיסמה שגויים" })
    }
    if (!response.ok) {
      return err({ code: "SERVER_ERROR", message: "הבקר החזיר שגיאה, נסה שוב מאוחר יותר" })
    }

    const data = (await response.json()) as TcwStatus
    return ok({ sensors: extractSensors(data), fetchedAt: new Date().toISOString() })
  } catch {
    return err({ code: "SERVER_ERROR", message: "לא ניתן להתחבר לבקר, בדוק שהוא מחובר לרשת" })
  } finally {
    clearTimeout(timeout)
  }
}
