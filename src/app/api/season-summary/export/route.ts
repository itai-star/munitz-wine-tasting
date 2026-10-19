import { prisma } from "@/lib/prisma"
import { loadSeasonSummary } from "@/server/season-summary-data"
import { buildSeasonSummaryWorkbook } from "@/server/season-summary-export"

export const dynamic = "force-dynamic"

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

export async function GET(request: Request): Promise<Response> {
  const year = Number(new URL(request.url).searchParams.get("vintage"))
  if (!Number.isInteger(year)) {
    return Response.json({ error: "Invalid vintage" }, { status: 400 })
  }

  const vintage = await prisma.vintage.findUnique({ where: { year } })
  if (!vintage) {
    return Response.json({ error: "Vintage not found" }, { status: 404 })
  }

  const workbook = await buildSeasonSummaryWorkbook(await loadSeasonSummary(vintage.id))
  return new Response(new Uint8Array(workbook), {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="season-summary-${year}.xlsx"`,
    },
  })
}
