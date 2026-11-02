import { addDays, dayKeyOf } from "@/lib/calendar-events"
import { canUse } from "@/lib/permissions"
import { getCurrentUser } from "@/server/auth/session"
import { buildEventsWorkbook } from "@/server/events-excel"
import { loadCategories, loadEvents } from "@/server/events-data"

export const dynamic = "force-dynamic"

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

// ?year=2026 exports that year, ?year=all every event, and ?template=1 an empty workbook to fill in.
export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser()
  if (!user || !canUse(user, "EVENTS")) return Response.json({ error: "אין הרשאה" }, { status: 403 })

  const params = new URL(request.url).searchParams
  const year = Number(params.get("year"))
  const wholeYear = Number.isInteger(year) && year >= 2000 && year <= 2100
  const isTemplate = params.get("template") === "1"

  const events = isTemplate
    ? []
    : await loadEvents(wholeYear ? { from: dayKeyOf(year, 1, 1), to: addDays(dayKeyOf(year + 1, 1, 1), -1) } : undefined)
  const workbook = await buildEventsWorkbook(events, await loadCategories())

  const name = isTemplate ? "events-template" : wholeYear ? `events-${year}` : "events-all"
  return new Response(new Uint8Array(workbook), {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${name}.xlsx"`,
    },
  })
}
