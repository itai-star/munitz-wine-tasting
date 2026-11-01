import { NextResponse } from "next/server"
import { endSession } from "@/server/auth/session"
import { isSameOrigin } from "@/server/auth/same-origin"

export const dynamic = "force-dynamic"

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "בקשה לא מורשית" }, { status: 403 })

  try {
    await endSession()
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "שגיאה ביציאה" }, { status: 500 })
  }
}
