import { z } from "zod"

export type SensorKind = "outdoor" | "soil" | "temp_humidity" | "temp" | "leaf"

export type EcowittReading = {
  key: string
  kind: SensorKind
  temperatureC: number | null
  humidityPercent: number | null
  soilMoisturePercent: number | null
  leafWetnessPercent: number | null
  rainDailyMm: number | null
  observedAt: string | null
}

const API_URL = "https://api.ecowitt.net/api/v3/device/real_time"
const CELSIUS_UNIT_ID = "1"
const RAINFALL_MM_UNIT_ID = "12"

const MAC_PATTERN = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/

export function normalizeMac(value: string): string | null {
  const compact = value.replace(/[^0-9a-fA-F]/g, "").toUpperCase()
  if (compact.length !== 12) return null
  const formatted = compact.match(/.{2}/g)?.join(":") ?? ""
  return MAC_PATTERN.test(formatted) ? formatted : null
}

export function buildRealTimeUrl(credentials: {
  applicationKey: string
  apiKey: string
  mac: string
}): string {
  const query = new URLSearchParams({
    application_key: credentials.applicationKey,
    api_key: credentials.apiKey,
    mac: credentials.mac,
    call_back: "all",
    temp_unitid: CELSIUS_UNIT_ID,
    rainfall_unitid: RAINFALL_MM_UNIT_ID,
  })
  return `${API_URL}?${query.toString()}`
}

const MetricSchema = z.object({
  time: z.string().optional(),
  value: z.union([z.string(), z.number()]),
})

const ResponseSchema = z.object({
  code: z.number(),
  msg: z.string().optional(),
  data: z.unknown().optional(),
})

export type EcowittParseResult =
  | { ok: true; readings: EcowittReading[] }
  | { ok: false; reason: "INVALID_CREDENTIALS" | "INVALID_DEVICE" | "API_ERROR" | "BAD_RESPONSE" }

const CREDENTIAL_ERROR_CODES = new Set([40010, 40011])
const DEVICE_ERROR_CODES = new Set([40012])

function metricValue(group: Record<string, unknown>, name: string): number | null {
  const parsed = MetricSchema.safeParse(group[name])
  if (!parsed.success) return null
  const num = Number(parsed.data.value)
  return parsed.data.value === "" || !Number.isFinite(num) ? null : num
}

function metricTime(group: Record<string, unknown>, name: string): string | null {
  const parsed = MetricSchema.safeParse(group[name])
  const seconds = parsed.success ? Number(parsed.data.time) : NaN
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function sensorKindFromKey(key: string): SensorKind | null {
  if (key === "outdoor") return "outdoor"
  if (/^soil_ch\d+$/.test(key)) return "soil"
  if (/^temp_and_humidity_ch\d+$/.test(key)) return "temp_humidity"
  if (/^temp_ch\d+$/.test(key)) return "temp"
  if (/^leaf_ch\d+$/.test(key)) return "leaf"
  return null
}

function outdoorRain(data: Record<string, unknown>): number | null {
  for (const groupName of ["rainfall", "rainfall_piezo"]) {
    const group = data[groupName]
    if (!isRecord(group)) continue
    const daily = metricValue(group, "daily")
    if (daily != null) return daily
  }
  return null
}

function readSensor(
  key: string,
  kind: SensorKind,
  group: Record<string, unknown>,
  data: Record<string, unknown>
): EcowittReading {
  const timeSource = kind === "soil" ? "soilmoisture" : kind === "leaf" ? "leaf_wetness" : "temperature"
  return {
    key,
    kind,
    temperatureC: kind === "soil" || kind === "leaf" ? null : metricValue(group, "temperature"),
    humidityPercent: metricValue(group, "humidity"),
    soilMoisturePercent: kind === "soil" ? metricValue(group, "soilmoisture") : null,
    leafWetnessPercent: kind === "leaf" ? metricValue(group, "leaf_wetness") : null,
    rainDailyMm: kind === "outdoor" ? outdoorRain(data) : null,
    observedAt: metricTime(group, timeSource),
  }
}

function hasAnyValue(reading: EcowittReading): boolean {
  return (
    reading.temperatureC != null ||
    reading.humidityPercent != null ||
    reading.soilMoisturePercent != null ||
    reading.leafWetnessPercent != null
  )
}

export function parseRealTimeResponse(payload: unknown): EcowittParseResult {
  const parsed = ResponseSchema.safeParse(payload)
  if (!parsed.success) return { ok: false, reason: "BAD_RESPONSE" }

  const { code, data } = parsed.data
  if (CREDENTIAL_ERROR_CODES.has(code)) return { ok: false, reason: "INVALID_CREDENTIALS" }
  if (DEVICE_ERROR_CODES.has(code)) return { ok: false, reason: "INVALID_DEVICE" }
  if (code !== 0) return { ok: false, reason: "API_ERROR" }
  if (!isRecord(data)) return { ok: false, reason: "BAD_RESPONSE" }

  const readings: EcowittReading[] = []
  for (const [key, group] of Object.entries(data)) {
    const kind = sensorKindFromKey(key)
    if (!kind || !isRecord(group)) continue
    const reading = readSensor(key, kind, group, data)
    if (hasAnyValue(reading)) readings.push(reading)
  }

  readings.sort((a, b) => a.key.localeCompare(b.key, "en", { numeric: true }))
  return { ok: true, readings }
}

const KIND_LABELS: Record<SensorKind, string> = {
  outdoor: "תחנת מזג אוויר",
  soil: "לחות קרקע",
  temp_humidity: "טמפרטורה ולחות",
  temp: "טמפרטורה",
  leaf: "לחות עלווה",
}

export function defaultSensorLabel(key: string, kind: SensorKind): string {
  if (kind === "outdoor") return KIND_LABELS.outdoor
  const channel = key.match(/(\d+)$/)?.[1]
  return channel ? `${KIND_LABELS[kind]} ${channel}` : KIND_LABELS[kind]
}
