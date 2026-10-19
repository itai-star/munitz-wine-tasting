"use client"

import { useState } from "react"
import { deleteVineyardMonitorKeys } from "@/server/actions/vineyard-monitor-actions"
import {
  getVineyardStationsOverview,
  refreshVineyardStations,
  type StationOverview,
} from "@/server/actions/vineyard-monitor-data-actions"
import { VineyardMonitorSettingsForm } from "@/components/vineyard-monitor/vineyard-monitor-settings-form"
import { VineyardSensorGrid } from "@/components/vineyard-monitor/vineyard-sensor-grid"
import { SensorLabelEditor } from "@/components/vineyard-monitor/sensor-label-editor"
import { StationManager, type BlockOption } from "@/components/vineyard-monitor/station-manager"
import type { Result } from "@/types"

function StationSection({
  station,
  onLabelsSaved,
}: {
  station: StationOverview
  onLabelsSaved: () => void
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-stone-800">{station.name}</h2>
        <p className="text-xs text-stone-400">
          {station.blockName ? `כרם ${station.blockName}` : "לא משויכת לכרם"} · <bdi>{station.mac}</bdi>
        </p>
      </div>

      {station.error && (
        <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{station.error}</p>
      )}

      {station.sensors.length > 0 ? (
        <VineyardSensorGrid sensors={station.sensors} />
      ) : (
        !station.error && (
          <p className="text-stone-400 text-sm">
            עדיין לא התקבלו נתונים מהתחנה. לחץ על "רענן" כדי למשוך אותם עכשיו.
          </p>
        )
      )}

      <SensorLabelEditor sensors={station.sensors} onSaved={onLabelsSaved} />
    </section>
  )
}

export function VineyardMonitorDashboard({
  blocks,
  initialResult,
}: {
  blocks: BlockOption[]
  initialResult: Result<StationOverview[]>
}) {
  const [result, setResult] = useState(initialResult)
  const [refreshing, setRefreshing] = useState(false)
  const [showKeys, setShowKeys] = useState(false)
  const [forgetting, setForgetting] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    setResult(await refreshVineyardStations())
    setRefreshing(false)
  }

  async function reloadFromDatabase() {
    setResult(await getVineyardStationsOverview())
  }

  async function handleForget() {
    if (!confirm("לשכוח את מפתחות החיבור ל-Ecowitt? התחנות וההיסטוריה יישמרו, אבל לא יתעדכנו עד שתזין מפתחות מחדש.")) return
    setForgetting(true)
    await deleteVineyardMonitorKeys()
    window.location.reload()
  }

  const stations = result.success ? result.data : []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <p className="text-sm text-stone-500">
          <bdi>{stations.length}</bdi> תחנות
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || stations.length === 0}
            className="text-sm border border-stone-300 text-stone-700 px-4 py-2 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
          >
            {refreshing ? "מושך נתונים..." : "רענן"}
          </button>
          <button
            type="button"
            onClick={() => setShowKeys((v) => !v)}
            className="text-sm border border-stone-300 text-stone-700 px-4 py-2 rounded-lg hover:bg-stone-50 transition-colors"
          >
            ערוך מפתחות חיבור
          </button>
        </div>
      </div>

      {showKeys && (
        <div className="space-y-3">
          <VineyardMonitorSettingsForm onSaved={() => setShowKeys(false)} />
          <button
            type="button"
            onClick={handleForget}
            disabled={forgetting}
            className="text-sm text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {forgetting ? "מוחק..." : "שכח מפתחות חיבור"}
          </button>
        </div>
      )}

      {!result.success && (
        <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{result.error.message}</p>
      )}

      {stations.map((station) => (
        <StationSection key={station.id} station={station} onLabelsSaved={reloadFromDatabase} />
      ))}

      <details open={stations.length === 0} className="group">
        <summary className="cursor-pointer text-sm font-medium text-wine">ניהול תחנות</summary>
        <div className="mt-3">
          <StationManager stations={stations} blocks={blocks} onChanged={reloadFromDatabase} />
        </div>
      </details>
    </div>
  )
}
