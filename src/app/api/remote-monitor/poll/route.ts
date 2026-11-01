import { NextResponse } from "next/server"
import { recordRemoteMonitorSample } from "@/server/remote-monitor-polling"

export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await recordRemoteMonitorSample()
  if (!result.success) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sensorsRecorded: result.data.count })
}
