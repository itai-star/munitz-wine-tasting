import { MAX_BARREL_YEAR, MIN_BARREL_YEAR } from "@/lib/barrel-room"
import { canUse } from "@/lib/permissions"
import { getCurrentUser } from "@/server/auth/session"
import { buildBlendingWorkbook } from "@/server/blending-excel"
import { loadBlending } from "@/server/blending-data"

export const dynamic = "force-dynamic"

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser()
  if (!user || !canUse(user, "BARRELS")) return Response.json({ error: "אין הרשאה" }, { status: 403 })

  const year = Number(new URL(request.url).searchParams.get("year"))
  if (!Number.isInteger(year) || year < MIN_BARREL_YEAR || year > MAX_BARREL_YEAR) return Response.json({ error: "השנה אינה תקינה" }, { status: 400 })

  const { wines, pile } = await loadBlending(year)
  const workbook = await buildBlendingWorkbook(year, wines, pile)
  return new Response(new Uint8Array(workbook), {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="blending-${year}.xlsx"`,
    },
  })
}
