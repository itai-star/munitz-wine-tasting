import { prisma } from "@/lib/prisma"
import {
  getVineyardMonitorConnection,
  fetchVineyardLiveData,
} from "@/server/actions/vineyard-monitor-actions"
import { VineyardMonitorSettingsForm } from "@/components/vineyard-monitor/vineyard-monitor-settings-form"
import { VineyardMonitorDashboard } from "@/components/vineyard-monitor/vineyard-monitor-dashboard"

export const dynamic = "force-dynamic"

export default async function VineyardMonitorPage() {
  const connectionResult = await getVineyardMonitorConnection()
  const connection = connectionResult.success ? connectionResult.data : null

  const blocks = connection
    ? await prisma.vineyardBlock.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">ניטור כרמים</h1>

      {!connection ? (
        <div className="space-y-4">
          <p className="text-stone-500">
            יש להזין את פרטי החיבור לחשבון Ecowitt כדי להציג את נתוני החיישנים בכרמים.
          </p>
          <VineyardMonitorSettingsForm />
        </div>
      ) : (
        <VineyardMonitorDashboard
          mac={connection.mac}
          blocks={blocks}
          initialResult={await fetchVineyardLiveData()}
        />
      )}
    </div>
  )
}
