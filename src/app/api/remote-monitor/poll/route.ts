import { NextResponse } from "next/server"
import { recordRemoteMonitorSample } from "@/server/actions/remote-monitor-actions"

export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await recordRemoteMonitorSample()
  if (!result.success) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sensorsRecorded: result.data.count })
}
