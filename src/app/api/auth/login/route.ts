import { NextResponse } from "next/server"
import { authenticate } from "@/server/auth/authenticate"
import { startSession } from "@/server/auth/session"
import { isSameOrigin, readJson, text } from "@/server/auth/same-origin"

export const dynamic = "force-dynamic"

const WRONG_CREDENTIALS = "שם משתמש או סיסמה שגויים"

// Only paths inside the site are accepted as a destination after signing in.
function safeDestination(next: string, fallback: string): string {
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "בקשה לא מורשית" }, { status: 403 })

  const body = await readJson(request)
  const username = text(body?.username)
  const password = text(body?.password)
  if (!username || !password || username.length > 64 || password.length > 200) {
    return NextResponse.json({ error: WRONG_CREDENTIALS }, { status: 400 })
  }

  try {
    const outcome = await authenticate(username, password)
    if (outcome.status === "locked") {
      return NextResponse.json(
        { error: `יותר מדי ניסיונות שגויים. אפשר לנסות שוב בעוד ${outcome.minutes} דקות` },
        { status: 429 }
      )
    }
    if (outcome.status === "wrong") {
      return NextResponse.json({ error: WRONG_CREDENTIALS }, { status: 401 })
    }

    await startSession(outcome.userId, request.headers.get("user-agent"))
    const destination =
      outcome.landingPage === "/admin/account"
        ? outcome.landingPage
        : safeDestination(text(body?.next), outcome.landingPage)
    return NextResponse.json({ ok: true, redirect: destination })
  } catch {
    return NextResponse.json({ error: "שגיאה בכניסה, נסה שוב" }, { status: 500 })
  }
}
