"use client"

import { useState } from "react"
import {
  fetchVineyardLiveData,
  deleteVineyardMonitorSettings,
  type VineyardLiveData,
} from "@/server/actions/vineyard-monitor-actions"
import { VineyardMonitorSettingsForm } from "@/components/vineyard-monitor/vineyard-monitor-settings-form"
import { VineyardSensorGrid } from "@/components/vineyard-monitor/vineyard-sensor-grid"
import {
  SensorAssignmentManager,
  type BlockOption,
} from "@/components/vineyard-monitor/sensor-assignment-manager"
import type { Result } from "@/types"

function sectionsFor(data: VineyardLiveData, blocks: BlockOption[]) {
  const blockSections = blocks
    .map((block) => ({
      id: block.id,
      title: `כרם ${block.name}`,
      sensors: data.sensors.filter((s) => s.blockId === block.id),
    }))
    .filter((section) => section.sensors.length > 0)

  const knownBlockIds = new Set(blocks.map((b) => b.id))
  const unassigned = data.sensors.filter((s) => !s.blockId || !knownBlockIds.has(s.blockId))

  return unassigned.length > 0
    ? [...blockSections, { id: "unassigned", title: "חיישנים שלא שויכו לכרם", sensors: unassigned }]
    : blockSections
}

export function VineyardMonitorDashboard({
  mac,
  blocks,
  initialResult,
}: {
  mac: string
  blocks: BlockOption[]
  initialResult: Result<VineyardLiveData>
}) {
  const [result, setResult] = useState(initialResult)
  const [refreshing, setRefreshing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [forgetting, setForgetting] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    setResult(await fetchVineyardLiveData())
    setRefreshing(false)
  }

  async function handleForget() {
    if (!confirm("לשכוח את מפתחות החיבור ל-Ecowitt? תצטרך להזין אותם מחדש כדי לראות נתונים.")) return
    setForgetting(true)
    await deleteVineyardMonitorSettings()
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <p className="text-sm text-stone-500">
          מחובר למכשיר <bdi>{mac}</bdi>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-sm border border-stone-300 text-stone-700 px-4 py-2 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
          >
            {refreshing ? "מרענן..." : "רענן"}
          </button>
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            className="text-sm border border-stone-300 text-stone-700 px-4 py-2 rounded-lg hover:bg-stone-50 transition-colors"
          >
            ערוך הגדרות חיבור
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="space-y-3">
          <VineyardMonitorSettingsForm defaultMac={mac} onSaved={() => setShowSettings(false)} />
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

      {!result.success ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-stone-200">
          <p className="text-red-600">{result.error.message}</p>
        </div>
      ) : result.data.sensors.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-stone-200">
          <p className="text-stone-500">לא התקבלו נתונים מהחיישנים</p>
        </div>
      ) : (
        <>
          {sectionsFor(result.data, blocks).map((section) => (
            <section key={section.id} className="space-y-3">
              <h2 className="text-lg font-bold text-stone-800">{section.title}</h2>
              <VineyardSensorGrid sensors={section.sensors} />
            </section>
          ))}

          <p className="text-xs text-stone-400">
            נשלף מהענן: <bdi>{new Date(result.data.fetchedAt).toLocaleTimeString("he-IL")}</bdi>
          </p>

          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-wine">
              שיוך חיישנים לכרמים
            </summary>
            <div className="mt-3">
              <SensorAssignmentManager
                sensors={result.data.sensors}
                blocks={blocks}
                onSaved={handleRefresh}
              />
            </div>
          </details>
        </>
      )}
    </div>
  )
}
