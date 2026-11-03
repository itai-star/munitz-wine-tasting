import { MAX_BARREL_YEAR, MIN_BARREL_YEAR } from "@/lib/barrel-room"
import { canUse } from "@/lib/permissions"
import { getCurrentUser } from "@/server/auth/session"
import { buildBarrelTestsWorkbook } from "@/server/barrel-test-excel"
import { loadBarrelYear } from "@/server/barrels-data"

export const dynamic = "force-dynamic"

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

// ?year=2026 returns the lab tests of that year's barrels, and ?template=1 as well returns a row for every barrel of the
// year with the number filled in, to write the date and the results next to.
export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser()
  if (!user || !canUse(user, "BARRELS")) return Response.json({ error: "אין הרשאה" }, { status: 403 })

  const params = new URL(request.url).searchParams
  const year = Number(params.get("year"))
  if (!Number.isInteger(year) || year < MIN_BARREL_YEAR || year > MAX_BARREL_YEAR) return Response.json({ error: "השנה אינה תקינה" }, { status: 400 })

  const template = params.get("template") === "1"
  const workbook = await buildBarrelTestsWorkbook(await loadBarrelYear(year), template)
  return new Response(new Uint8Array(workbook), {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="barrel-tests-${template ? "template-" : ""}${year}.xlsx"`,
    },
  })
}
