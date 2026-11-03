import { MAX_BARREL_YEAR, MIN_BARREL_YEAR } from "@/lib/barrel-room"
import { canUse } from "@/lib/permissions"
import { getCurrentUser } from "@/server/auth/session"
import { buildBarrelWineWorkbook } from "@/server/barrel-wine-excel"
import { loadBarrelYear, loadBlockOptions } from "@/server/barrels-data"

export const dynamic = "force-dynamic"

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

// The barrels of one year with the wine and the lab tests they had, as a workbook to fill in and load back.
export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser()
  if (!user || !canUse(user, "BARRELS")) return Response.json({ error: "אין הרשאה" }, { status: 403 })

  const year = Number(new URL(request.url).searchParams.get("year"))
  if (!Number.isInteger(year) || year < MIN_BARREL_YEAR || year > MAX_BARREL_YEAR) return Response.json({ error: "השנה אינה תקינה" }, { status: 400 })

  const [rows, blocks] = await Promise.all([loadBarrelYear(year), loadBlockOptions()])
  const workbook = await buildBarrelWineWorkbook(rows, blocks)
  return new Response(new Uint8Array(workbook), {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="barrel-wine-${year}.xlsx"`,
    },
  })
}
