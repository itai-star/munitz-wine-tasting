import {
  getRemoteMonitorConnection,
  fetchRemoteMonitorReadings,
} from "@/server/actions/remote-monitor-actions"
import { RemoteMonitorSettingsForm } from "@/components/remote-monitor/remote-monitor-settings-form"
import { RemoteMonitorDashboard } from "@/components/remote-monitor/remote-monitor-dashboard"

export const dynamic = "force-dynamic"

export default async function RemoteMonitorPage() {
  const connectionResult = await getRemoteMonitorConnection()
  const connection = connectionResult.success ? connectionResult.data : null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">בקרה מרחוק</h1>

      {!connection ? (
        <div className="space-y-4">
          <p className="text-stone-500">
            יש להזין את פרטי ההתחברות לבקר כדי להציג את נתוני החיישנים.
          </p>
          <RemoteMonitorSettingsForm />
        </div>
      ) : (
        <RemoteMonitorDashboard
          host={connection.host}
          username={connection.username}
          initialResult={await fetchRemoteMonitorReadings()}
        />
      )}
    </div>
  )
}
