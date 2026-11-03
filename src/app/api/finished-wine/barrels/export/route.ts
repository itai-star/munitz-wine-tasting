import { prisma } from "@/lib/prisma"
import { planBarrels } from "@/lib/barrel-plan"
import { canUse } from "@/lib/permissions"
import { getCurrentUser } from "@/server/auth/session"
import { buildBarrelPlanWorkbook } from "@/server/barrel-plan-excel"
import { loadInBarrelsByVariety } from "@/server/barrels-data"

export const dynamic = "force-dynamic"

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser()
  if (!user || !canUse(user, "HARVEST")) return Response.json({ error: "אין הרשאה" }, { status: 403 })

  const year = Number(new URL(request.url).searchParams.get("vintage"))
  const vintage = Number.isInteger(year) && year > 0 ? await prisma.vintage.findUnique({ where: { year } }) : null
  if (!vintage) return Response.json({ error: "הבציר לא נמצא" }, { status: 404 })

  const [wines, stored, fresh] = await Promise.all([
    prisma.finishedWine.findMany({ where: { vintageId: vintage.id }, include: { block: true } }),
    prisma.barrelCombination.findMany({ orderBy: { createdAt: "asc" }, include: { varieties: { orderBy: { variety: "asc" } } } }),
    prisma.freshAllocation.findMany({ where: { vintageId: vintage.id } }),
  ])
  const tanks = wines.map((wine) => ({ ...wine, variety: wine.block?.variety ?? null }))
  const combinations = stored.map((combination) => ({ id: combination.id, varieties: combination.varieties.map((entry) => entry.variety) }))

  const workbook = await buildBarrelPlanWorkbook({
    vintageLabel: vintage.label,
    tanks,
    combinations,
    plan: planBarrels(tanks, combinations, new Map(fresh.map((entry) => [entry.variety, entry.liters])), await loadInBarrelsByVariety(vintage.year)),
  })
  return new Response(new Uint8Array(workbook), {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="barrel-plan-${vintage.year}.xlsx"`,
    },
  })
}
