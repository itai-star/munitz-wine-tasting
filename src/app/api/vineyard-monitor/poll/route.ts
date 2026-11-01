import { NextResponse } from "next/server"
import { recordVineyardStationSamples } from "@/server/vineyard-polling"

export const maxDuration = 60

export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
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
