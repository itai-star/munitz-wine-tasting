import { prisma } from "@/lib/prisma"
import { decryptSecret } from "@/lib/encryption"
import { buildRealTimeUrl, parseRealTimeResponse, type EcowittReading } from "@/lib/ecowitt"
import { ok, err } from "@/types"
import type { Result } from "@/types"

const SETTINGS_ID = "default"
const FETCH_TIMEOUT_MS = 10000
// Ecowitt allows roughly one request per second per application key.
export const REQUEST_SPACING_MS = 1100

export type EcowittCredentials = { applicationKey: string; apiKey: string }

const PARSE_FAILURE_MESSAGES = {
  INVALID_CREDENTIALS: "מפתחות הגישה ל-Ecowitt שגויים, יש להזין אותם מחדש",
  INVALID_DEVICE: "כתובת ה-MAC לא נמצאה בחשבון Ecowitt",
  API_ERROR: "שירות Ecowitt החזיר שגיאה, נסה שוב מאוחר יותר",
  BAD_RESPONSE: "התקבלה תשובה לא צפויה משירות Ecowitt",
} as const

export async function loadCredentials(): Promise<Result<EcowittCredentials>> {
  let settings
  try {
    settings = await prisma.ecowittSettings.findUnique({ where: { id: SETTINGS_ID } })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת הגדרות החיבור" })
  }
  if (!settings) return err({ code: "NOT_FOUND", message: "לא הוגדר חיבור ל-Ecowitt" })

  try {
    return ok({
      applicationKey: decryptSecret(settings.applicationKey),
      apiKey: decryptSecret(settings.apiKey),
    })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בפענוח המפתחות, יש להגדיר מחדש" })
  }
}

export async function fetchStationReadings(
  credentials: EcowittCredentials,
  mac: string
): Promise<Result<EcowittReading[]>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(buildRealTimeUrl({ ...credentials, mac }), {
      signal: controller.signal,
      cache: "no-store",
    })
    if (!response.ok) {
      return err({ code: "SERVER_ERROR", message: PARSE_FAILURE_MESSAGES.API_ERROR })
    }
    const parsed = parseRealTimeResponse(await response.json())
    if (!parsed.ok) {
      const detail = parsed.detail ? ` (${parsed.detail})` : ""
      return err({ code: "SERVER_ERROR", message: `${PARSE_FAILURE_MESSAGES[parsed.reason]}${detail}` })
    }
    return ok(parsed.readings)
  } catch {
    return err({ code: "SERVER_ERROR", message: "לא ניתן להתחבר לשירות Ecowitt" })
  } finally {
    clearTimeout(timeout)
  }
}

export function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function saveStationSample(
  stationId: string,
  readings: EcowittReading[],
  recordedAt: Date
): Promise<void> {
  await prisma.ecowittSample.createMany({
    data: readings.map((reading) => ({
      stationId,
      sensorKey: reading.key,
      temperatureC: reading.temperatureC,
      humidityPercent: reading.humidityPercent,
      soilMoisturePercent: reading.soilMoisturePercent,
      leafWetnessPercent: reading.leafWetnessPercent,
      rainDailyMm: reading.rainDailyMm,
      recordedAt,
    })),
  })
}
