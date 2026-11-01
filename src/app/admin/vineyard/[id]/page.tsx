import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { formatShekels } from "@/lib/credit"
import { canUse } from "@/lib/permissions"
import { BlockFinanceForm } from "@/components/vineyard/block-finance-form"
import { BlockForm } from "@/components/vineyard/block-form"
import { RipenessCharts } from "@/components/vineyard/ripeness-charts"
import { VineyardSensorGrid } from "@/components/vineyard-monitor/vineyard-sensor-grid"
import { getCurrentUser } from "@/server/auth/session"
import { getSensorTilesForBlock } from "@/server/actions/vineyard-monitor-data-actions"

export const dynamic = "force-dynamic"

type Tab = "details" | "finance"

function TabLink({ blockId, tab, active, children }: { blockId: string; tab: Tab; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={tab === "details" ? `/admin/vineyard/${blockId}` : `/admin/vineyard/${blockId}?tab=finance`}
      aria-current={active ? "page" : undefined}
      className={`px-5 min-h-11 inline-flex items-center text-base font-bold border-b-4 -mb-px transition-colors ${
        active ? "border-wine text-wine" : "border-transparent text-stone-600 hover:text-stone-900"
      }`}
    >
      {children}
    </Link>
  )
}

async function FinanceTab({ blockId }: { blockId: string }) {
  const [finance, growers, intakes] = await Promise.all([
    prisma.vineyardBlock.findUnique({ where: { id: blockId }, select: { growerId: true, pricePerKgAgorot: true } }),
    prisma.grower.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.grapeIntake.groupBy({ by: ["vintageId"], where: { blockId }, _sum: { totalWeightKg: true } }),
  ])
  const vintages = await prisma.vintage.findMany({
    where: { id: { in: intakes.map((row) => row.vintageId) } },
    orderBy: { year: "desc" },
    select: { id: true, label: true },
  })
  const kgByVintage = new Map(intakes.map((row) => [row.vintageId, row._sum.totalWeightKg ?? 0]))
  const growerId = finance?.growerId ?? null
  const pricePerKgAgorot = finance?.pricePerKgAgorot ?? null

  return (
    <div className="space-y-4">
      <BlockFinanceForm
        blockId={blockId}
        growerId={growerId}
        pricePerKg={pricePerKgAgorot === null ? null : pricePerKgAgorot / 100}
        growers={growers}
      />

      {vintages.length > 0 && (
        <section className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5 sm:p-6">
          <h3 className="text-lg sm:text-xl font-extrabold text-stone-900">קליטות ועלות מוערכת</h3>
          <p className="text-sm text-stone-600 mt-1">לפי מחיר ברירת המחדל של הבלוק</p>
          <ul className="mt-3 divide-y divide-stone-100">
            {vintages.map((vintage) => {
              const kg = kgByVintage.get(vintage.id) ?? 0
              return (
                <li key={vintage.id} className="flex items-baseline justify-between gap-3 py-2.5">
                  <span className="text-base font-bold text-stone-900">{vintage.label}</span>
                  <span className="text-base text-stone-700">
                    <bdi>{kg.toLocaleString("he-IL")}</bdi> ק״ג
                    {pricePerKgAgorot !== null && (
                      <>
                        {" · "}
                        <b className="font-extrabold text-stone-900">
                          <bdi>{formatShekels(Math.round(kg * pricePerKgAgorot))}</bdi>
                        </b>
                      </>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

export default async function BlockDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab: requestedTab } = await searchParams
  const block = await prisma.vineyardBlock.findUnique({ where: { id } })
  if (!block) notFound()

  const user = await getCurrentUser()
  const canFinance = user !== null && canUse(user, "GROWERS")
  const tab: Tab = canFinance && requestedTab === "finance" ? "finance" : "details"

  const samples = await prisma.ripenessSample.findMany({
    where: { blockId: id },
    orderBy: { sampleDate: "asc" },
  })

  const sensorsResult = await getSensorTilesForBlock(id)
  const sensors = sensorsResult.success ? sensorsResult.data : []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">{block.name}</h1>

      {canFinance && (
        <nav aria-label="חלקי הבלוק" className="flex border-b border-stone-200">
          <TabLink blockId={id} tab="details" active={tab === "details"}>
            פרטי הבלוק
          </TabLink>
          <TabLink blockId={id} tab="finance" active={tab === "finance"}>
            נתונים כספיים
          </TabLink>
        </nav>
      )}

      {tab === "finance" ? (
        <FinanceTab blockId={id} />
      ) : (
        <div className="space-y-8">
          <BlockForm block={block} />

          {sensors.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-stone-800 mb-3">ניטור חיישנים</h2>
              <VineyardSensorGrid sensors={sensors} />
            </div>
          )}

          <div>
            <h2 className="text-lg font-bold text-stone-800 mb-3">היסטוריית דגימות הבשלה</h2>
            <RipenessCharts
              samples={samples.map((s) => ({
                sampleDate: s.sampleDate,
                brix: s.brix,
                ph: s.ph,
                titratableAcidity: s.titratableAcidity,
                clusterWeight: s.clusterWeight,
                blockName: block.name,
              }))}
            />
          </div>
        </div>
      )}
    </div>
  )
}
