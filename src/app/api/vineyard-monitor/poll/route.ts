import { NextResponse } from "next/server"
import { recordVineyardStationSamples } from "@/server/actions/vineyard-monitor-data-actions"

export const maxDuration = 60

export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await recordVineyardStationSamples()
  if (!result.success) {
    if (result.error.code === "NOT_FOUND") {
      return NextResponse.json({ ok: true, skipped: "not configured" })
    }
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, stationsRecorded: result.data.stations, stationsFailed: result.data.failed })
}
