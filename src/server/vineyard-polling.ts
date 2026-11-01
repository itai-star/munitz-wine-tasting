import { prisma } from "@/lib/prisma"
import {
  REQUEST_SPACING_MS,
  fetchStationReadings,
  loadCredentials,
  pause,
  saveStationSample,
} from "@/server/ecowitt-client"
import { ok, err } from "@/types"
import type { Result } from "@/types"

// Collection used by the scheduled job and by the refresh button. It lives outside the action files
// because an exported server action can be called from a browser, and the job runs with no signed-in user.
export type PollOutcome = { recorded: number; errors: Map<string, string> }

export async function pollAllStations(): Promise<Result<PollOutcome>> {
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

    return ok({ recorded, errors })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת הדגימות" })
  }
}

export async function recordVineyardStationSamples(): Promise<
  Result<{ stations: number; failed: number }>
> {
  const outcome = await pollAllStations()
  if (!outcome.success) return outcome
  return ok({ stations: outcome.data.recorded, failed: outcome.data.errors.size })
}
