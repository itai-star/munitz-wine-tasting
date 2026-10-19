"use server"

import { prisma } from "@/lib/prisma"
import { defaultSensorLabel, sensorKindFromKey, type SensorTile } from "@/lib/ecowitt"
import {
  REQUEST_SPACING_MS,
  fetchStationReadings,
  loadCredentials,
  pause,
  saveStationSample,
} from "@/server/ecowitt-client"
import { ok, err } from "@/types"
import type { Result } from "@/types"

const SAMPLE_RETENTION_DAYS = 35
const DAY_MS = 24 * 60 * 60 * 1000

export type StationOverview = {
  id: string
  name: string
  mac: string
  blockId: string | null
  blockName: string | null
  sensors: SensorTile[]
  error: string | null
}

type LatestSample = Awaited<ReturnType<typeof prisma.ecowittSample.findMany>>[number]

function toTile(
  stationId: string,
  sample: LatestSample,
  labels: Map<string, string>
): SensorTile | null {
  const kind = sensorKindFromKey(sample.sensorKey)
  if (!kind) return null
  return {
    stationId,
    key: sample.sensorKey,
    kind,
    label: labels.get(sample.sensorKey) ?? defaultSensorLabel(sample.sensorKey, kind),
    temperatureC: sample.temperatureC,
    humidityPercent: sample.humidityPercent,
    soilMoisturePercent: sample.soilMoisturePercent,
    leafWetnessPercent: sample.leafWetnessPercent,
    rainDailyMm: sample.rainDailyMm,
    observedAt: sample.recordedAt.toISOString(),
  }
}

async function loadOverviews(errors: Map<string, string>): Promise<StationOverview[]> {
  const stations = await prisma.ecowittStation.findMany({
    include: { block: { select: { name: true } }, sensorLabels: true },
  })
  const latest = await prisma.ecowittSample.findMany({
    where: { stationId: { in: stations.map((s) => s.id) } },
    distinct: ["stationId", "sensorKey"],
    orderBy: { recordedAt: "desc" },
  })

  const overviews = stations.map((station): StationOverview => {
    const labels = new Map(station.sensorLabels.map((l) => [l.sensorKey, l.label]))
    const sensors = latest
      .filter((sample) => sample.stationId === station.id)
      .map((sample) => toTile(station.id, sample, labels))
      .filter((tile): tile is SensorTile => tile !== null)
      .sort((a, b) => a.key.localeCompare(b.key, "en", { numeric: true }))

    return {
      id: station.id,
      name: station.name,
      mac: station.mac,
      blockId: station.blockId,
      blockName: station.block?.name ?? null,
      sensors,
      error: errors.get(station.id) ?? null,
    }
  })

  return overviews.sort(
    (a, b) =>
      Number(a.blockName === null) - Number(b.blockName === null) ||
      (a.blockName ?? "").localeCompare(b.blockName ?? "", "he") ||
      a.name.localeCompare(b.name, "he")
  )
}

export async function getVineyardStationsOverview(): Promise<Result<StationOverview[]>> {
  try {
    return ok(await loadOverviews(new Map()))
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת התחנות" })
  }
}

type PollOutcome = { recorded: number; errors: Map<string, string> }

async function pollAllStations(): Promise<Result<PollOutcome>> {
  const credentials = await loadCredentials()
  if (!credentials.success) return credentials

  try {
    const stations = await prisma.ecowittStation.findMany({ select: { id: true, mac: true } })
    const errors = new Map<string, string>()
    const recordedAt = new Date()
    let recorded = 0

    for (const [index, station] of stations.entries()) {
      if (index > 0) await pause(REQUEST_SPACING_MS)
      const readings = await fetchStationReadings(credentials.data, station.mac)
      if (!readings.success) {
        errors.set(station.id, readings.error.message)
        continue
      }
      await saveStationSample(station.id, readings.data, recordedAt)
      recorded += 1
    }

    const cutoff = new Date(recordedAt.getTime() - SAMPLE_RETENTION_DAYS * DAY_MS)
    await prisma.ecowittSample.deleteMany({ where: { recordedAt: { lt: cutoff } } })
    return ok({ recorded, errors })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת הדגימות" })
  }
}

export async function refreshVineyardStations(): Promise<Result<StationOverview[]>> {
  const outcome = await pollAllStations()
  if (!outcome.success) return outcome

  try {
    return ok(await loadOverviews(outcome.data.errors))
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בטעינת התחנות" })
  }
}

export async function recordVineyardStationSamples(): Promise<
  Result<{ stations: number; failed: number }>
> {
  const outcome = await pollAllStations()
  if (!outcome.success) return outcome
  return ok({ stations: outcome.data.recorded, failed: outcome.data.errors.size })
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
  stationId: string,
  sensorKey: string,
  days = 7
): Promise<Result<VineyardSamplePoint[]>> {
  try {
    const since = new Date(Date.now() - days * DAY_MS)
    const samples = await prisma.ecowittSample.findMany({
      where: { stationId, sensorKey, recordedAt: { gte: since } },
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

export async function getSensorTilesForBlock(blockId: string): Promise<Result<SensorTile[]>> {
  const overviews = await getVineyardStationsOverview()
  if (!overviews.success) return overviews

  const stations = overviews.data.filter((station) => station.blockId === blockId)
  const prefixWithStation = stations.length > 1
  return ok(
    stations.flatMap((station) =>
      station.sensors.map((sensor) => ({
        ...sensor,
        label: prefixWithStation ? `${station.name} · ${sensor.label}` : sensor.label,
      }))
    )
  )
}
