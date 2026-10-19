import { prisma } from "@/lib/prisma"
import { hasVineyardMonitorKeys } from "@/server/actions/vineyard-monitor-actions"
import { getVineyardStationsOverview } from "@/server/actions/vineyard-monitor-data-actions"
import { VineyardMonitorSettingsForm } from "@/components/vineyard-monitor/vineyard-monitor-settings-form"
import { VineyardMonitorDashboard } from "@/components/vineyard-monitor/vineyard-monitor-dashboard"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export default async function VineyardMonitorPage() {
  const hasKeys = await hasVineyardMonitorKeys()

  const [blocks, stations] = hasKeys
    ? await Promise.all([
        prisma.vineyardBlock.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        getVineyardStationsOverview(),
      ])
    : [[], null]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">ניטור כרמים</h1>

      {!hasKeys || !stations ? (
        <div className="space-y-4">
          <p className="text-stone-500">
            יש להזין את מפתחות החיבור לחשבון Ecowitt. אחרי השמירה אפשר להוסיף תחנות ולשייך כל תחנה
            לכרם.
          </p>
          <VineyardMonitorSettingsForm />
        </div>
      ) : (
        <VineyardMonitorDashboard blocks={blocks} initialResult={stations} />
      )}
    </div>
  )
}
