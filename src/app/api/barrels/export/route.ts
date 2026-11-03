import { canUse } from "@/lib/permissions"
import { getCurrentUser } from "@/server/auth/session"
import { buildBarrelsWorkbook } from "@/server/barrels-excel"
import { loadBarrels } from "@/server/barrels-data"

export const dynamic = "force-dynamic"

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

// ?template=1 returns an empty workbook with the column names, to fill in and load back.
export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser()
  if (!user || !canUse(user, "BARRELS")) return Response.json({ error: "אין הרשאה" }, { status: 403 })

  const isTemplate = new URL(request.url).searchParams.get("template") === "1"
  const workbook = await buildBarrelsWorkbook(isTemplate ? [] : await loadBarrels())
  return new Response(new Uint8Array(workbook), {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${isTemplate ? "barrels-template" : "barrels"}.xlsx"`,
    },
  })
}
