"use server"

import { prisma } from "@/lib/prisma"
import { encryptSecret, decryptSecret } from "@/lib/encryption"
import {
  buildRealTimeUrl,
  defaultSensorLabel,
  normalizeMac,
  parseRealTimeResponse,
  sensorKindFromKey,
  type EcowittReading,
} from "@/lib/ecowitt"
import { ok, err } from "@/types"
import type { Result } from "@/types"
import { z } from "zod"

const SETTINGS_ID = "default"
const FETCH_TIMEOUT_MS = 10000
const SAMPLE_RETENTION_DAYS = 35
const DAY_MS = 24 * 60 * 60 * 1000

const SaveSettingsSchema = z.object({
  applicationKey: z.string().trim().min(1, "יש להזין Application Key"),
  apiKey: z.string().trim().min(1, "יש להזין API Key"),
  mac: z
    .string()
    .trim()
    .min(1, "יש להזין כתובת MAC של המכשיר")
    .transform((value, ctx) => {
      const mac = normalizeMac(value)
      if (!mac) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "כתובת MAC לא תקינה" })
        return z.NEVER
      }
      return mac
    }),
})

export async function saveVineyardMonitorSettings(
  input: z.input<typeof SaveSettingsSchema>
): Promise<Result<{ id: string }>> {
  const parsed = SaveSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  const { applicationKey, apiKey, mac } = parsed.data
  const data = { applicationKey: encryptSecret(applicationKey), apiKey: encryptSecret(apiKey), mac }

  try {
    const settings = await prisma.ecowittSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...data },
      update: data,
    })
    return ok({ id: settings.id })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת הגדרות החיבור" })
  }
}

export async function deleteVineyardMonitorSettings(): Promise<Result<void>> {
  try {
    await prisma.ecowittSettings.deleteMany({ where: { id: SETTINGS_ID } })
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה במחיקת הגדרות החיבור" })
  }
}

export async function getVineyardMonitorConnection(): Promise<Result<{ mac: string } | null>> {
  try {
    const settings = await prisma.ecowittSettings.findUnique({ where: { id: SETTINGS_ID } })
    return ok(settings ? { mac: settings.mac } : null)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת הגדרות החיבור" })
  }
}

export type VineyardSensorTile = Omit<EcowittReading, "observedAt"> & {
  label: string
  blockId: string | null
  observedAt: string | null
}

export type VineyardLiveData = { sensors: VineyardSensorTile[]; fetchedAt: string }

const PARSE_FAILURE_MESSAGES = {
  INVALID_CREDENTIALS: "מפתחות הגישה ל-Ecowitt שגויים, יש להזין אותם מחדש",
  INVALID_DEVICE: "כתובת ה-MAC של המכשיר לא נמצאה בחשבון",
  API_ERROR: "שירות Ecowitt החזיר שגיאה, נסה שוב מאוחר יותר",
  BAD_RESPONSE: "התקבלה תשובה לא צפויה משירות Ecowitt",
} as const

async function fetchReadings(): Promise<Result<EcowittReading[]>> {
  let settings
  try {
    settings = await prisma.ecowittSettings.findUnique({ where: { id: SETTINGS_ID } })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת הגדרות החיבור" })
  }
  if (!settings) return err({ code: "NOT_FOUND", message: "לא הוגדר חיבור ל-Ecowitt" })

  let url: string
  try {
    url = buildRealTimeUrl({
      applicationKey: decryptSecret(settings.applicationKey),
      apiKey: decryptSecret(settings.apiKey),
      mac: settings.mac,
    })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בפענוח המפתחות, יש להגדיר מחדש" })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" })
    if (!response.ok) {
      return err({ code: "SERVER_ERROR", message: PARSE_FAILURE_MESSAGES.API_ERROR })
    }
    const parsed = parseRealTimeResponse(await response.json())
    if (!parsed.ok) {
      return err({ code: "SERVER_ERROR", message: PARSE_FAILURE_MESSAGES[parsed.reason] })
    }
    return ok(parsed.readings)
  } catch {
    return err({ code: "SERVER_ERROR", message: "לא ניתן להתחבר לשירות Ecowitt" })
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchVineyardLiveData(): Promise<Result<VineyardLiveData>> {
  const readings = await fetchReadings()
  if (!readings.success) return readings

  try {
    const assignments = await prisma.ecowittSensorAssignment.findMany()
    const assignmentByKey = new Map(assignments.map((a) => [a.sensorKey, a]))
    const sensors = readings.data.map((reading) => {
      const assignment = assignmentByKey.get(reading.key)
      return {
        ...reading,
        label: assignment?.label ?? defaultSensorLabel(reading.key, reading.kind),
        blockId: assignment?.blockId ?? null,
      }
    })
    return ok({ sensors, fetchedAt: new Date().toISOString() })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת שיוך החיישנים" })
  }
}

export async function recordVineyardMonitorSample(): Promise<Result<{ count: number }>> {
  const readings = await fetchReadings()
  if (!readings.success) return readings

  const recordedAt = new Date()
  const cutoff = new Date(recordedAt.getTime() - SAMPLE_RETENTION_DAYS * DAY_MS)

  try {
    await prisma.$transaction([
      prisma.ecowittSample.createMany({
        data: readings.data.map((reading) => ({
          sensorKey: reading.key,
          temperatureC: reading.temperatureC,
          humidityPercent: reading.humidityPercent,
          soilMoisturePercent: reading.soilMoisturePercent,
          leafWetnessPercent: reading.leafWetnessPercent,
          rainDailyMm: reading.rainDailyMm,
          recordedAt,
        })),
      }),
      prisma.ecowittSample.deleteMany({ where: { recordedAt: { lt: cutoff } } }),
    ])
    return ok({ count: readings.data.length })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת הדגימה" })
  }
}

export type VineyardSamplePoint = {
  recordedAt: string
  temperatureC: number | null
  humidityPercent: number | null
  soilMoisturePercent: number | null
  leafWetnessPercent: number | null
  rainDailyMm: number | null
}

export async function getVineyardSensorHistory(
  sensorKey: string,
  days = 7
): Promise<Result<VineyardSamplePoint[]>> {
  try {
    const since = new Date(Date.now() - days * DAY_MS)
    const samples = await prisma.ecowittSample.findMany({
      where: { sensorKey, recordedAt: { gte: since } },
      orderBy: { recordedAt: "asc" },
    })
    return ok(
      samples.map((sample) => ({
        recordedAt: sample.recordedAt.toISOString(),
        temperatureC: sample.temperatureC,
        humidityPercent: sample.humidityPercent,
        soilMoisturePercent: sample.soilMoisturePercent,
        leafWetnessPercent: sample.leafWetnessPercent,
        rainDailyMm: sample.rainDailyMm,
      }))
    )
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת היסטוריית החיישן" })
  }
}

const AssignSensorSchema = z.object({
  sensorKey: z.string().min(1),
  blockId: z.string().min(1).nullable(),
  label: z.string().trim().min(1).max(60).nullable(),
})

export async function assignVineyardSensor(
  input: z.infer<typeof AssignSensorSchema>
): Promise<Result<void>> {
  const parsed = AssignSensorSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: "פרטי השיוך אינם תקינים" })
  }

  const { sensorKey, blockId, label } = parsed.data
  try {
    await prisma.ecowittSensorAssignment.upsert({
      where: { sensorKey },
      create: { sensorKey, blockId, label },
      update: { blockId, label },
    })
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת שיוך החיישן" })
  }
}

export type StoredSensorTile = Omit<VineyardSensorTile, "blockId">

export async function getLatestSensorTilesForBlock(
  blockId: string
): Promise<Result<StoredSensorTile[]>> {
  try {
    const assignments = await prisma.ecowittSensorAssignment.findMany({ where: { blockId } })
    const latestSamples = await Promise.all(
      assignments.map((assignment) =>
        prisma.ecowittSample.findFirst({
          where: { sensorKey: assignment.sensorKey },
          orderBy: { recordedAt: "desc" },
        })
      )
    )

    const tiles: StoredSensorTile[] = []
    assignments.forEach((assignment, index) => {
      const latest = latestSamples[index]
      if (!latest) return
      const kind = sensorKindFromKey(assignment.sensorKey) ?? "outdoor"
      tiles.push({
        key: assignment.sensorKey,
        kind,
        label: assignment.label ?? defaultSensorLabel(assignment.sensorKey, kind),
        temperatureC: latest.temperatureC,
        humidityPercent: latest.humidityPercent,
        soilMoisturePercent: latest.soilMoisturePercent,
        leafWetnessPercent: latest.leafWetnessPercent,
        rainDailyMm: latest.rainDailyMm,
        observedAt: latest.recordedAt.toISOString(),
      })
    })
    return ok(tiles)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת נתוני החיישנים" })
  }
}
