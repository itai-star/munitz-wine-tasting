import { prisma } from "@/lib/prisma"
import { canUse } from "@/lib/permissions"
import { getCurrentUser } from "@/server/auth/session"
import { buildBlocksWorkbook } from "@/server/vineyard-excel"

export const dynamic = "force-dynamic"

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

export async function GET(): Promise<Response> {
  const user = await getCurrentUser()
  if (!user || !canUse(user, "HARVEST")) return Response.json({ error: "אין הרשאה" }, { status: 403 })

  // Grower and price columns are part of the file only for someone who may see them.
  const includeFinance = canUse(user, "GROWERS")

  const [blocks, growers] = await Promise.all([
    prisma.vineyardBlock.findMany({
      orderBy: { name: "asc" },
      omit: { growerId: false, pricePerKgAgorot: false },
      include: { grower: { select: { name: true } } },
    }),
    includeFinance ? prisma.grower.findMany({ orderBy: { name: "asc" }, select: { name: true } }) : Promise.resolve([]),
  ])

  const workbook = await buildBlocksWorkbook(
    blocks.map((block) => ({ ...block, growerName: block.grower?.name ?? null })),
    growers.map((grower) => grower.name),
    includeFinance
  )

  return new Response(new Uint8Array(workbook), {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": 'attachment; filename="vineyard-blocks.xlsx"',
    },
  })
}
