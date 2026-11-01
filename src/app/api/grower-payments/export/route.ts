import { canUse } from "@/lib/permissions"
import { getCurrentUser } from "@/server/auth/session"
import { loadPaymentsOverview } from "@/server/grower-payments-data"
import { buildGrowerPaymentsWorkbook } from "@/server/grower-payments-excel"

export const dynamic = "force-dynamic"

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser()
  if (!user || !canUse(user, "GROWERS")) return Response.json({ error: "אין הרשאה" }, { status: 403 })

  const overview = await loadPaymentsOverview(new URL(request.url).searchParams.get("vintage") ?? undefined)
  if (!overview.vintage) return Response.json({ error: "אין בציר" }, { status: 404 })

  const workbook = await buildGrowerPaymentsWorkbook(overview)
  return new Response(new Uint8Array(workbook), {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="grower-payments-${overview.vintage.year}.xlsx"`,
    },
  })
}
