"use client"

import { useState } from "react"
import {
  fetchRemoteMonitorReadings,
  deleteRemoteMonitorSettings,
  getRemoteMonitorHistory,
  type RemoteSensorReading,
  type RemoteSensorSamplePoint,
} from "@/server/actions/remote-monitor-actions"
import { RemoteMonitorSettingsForm } from "@/components/remote-monitor/remote-monitor-settings-form"
import { RemoteMonitorSensorChart } from "@/components/remote-monitor/remote-monitor-sensor-chart"
import type { Result } from "@/types"

const HISTORY_DAYS = 7

export function RemoteMonitorDashboard({
  host,
  username,
  initialResult,
}: {
  host: string
  username: string
  initialResult: Result<{ sensors: RemoteSensorReading[]; fetchedAt: string }>
}) {
  const [result, setResult] = useState(initialResult)
  const [refreshing, setRefreshing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [forgetting, setForgetting] = useState(false)
  const [selectedSensor, setSelectedSensor] = useState<{ key: string; name: string } | null>(null)
  const [history, setHistory] = useState<Result<RemoteSensorSamplePoint[]> | null>(null)

  async function handleRefresh() {
    setRefreshing(true)
    const next = await fetchRemoteMonitorReadings()
    setResult(next)
    setRefreshing(false)
  }

  async function handleSensorClick(sensor: { key: string; name: string }) {
    setSelectedSensor(sensor)
    setHistory(null)
    const historyResult = await getRemoteMonitorHistory(sensor.key, HISTORY_DAYS)
    setHistory(historyResult)
  }

  async function handleForget() {
    if (!confirm("לשכוח את פרטי ההתחברות לבקר? תצטרך להזין אותם מחדש כדי לראות נתונים.")) return
    setForgetting(true)
    await deleteRemoteMonitorSettings()
    window.location.reload()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <p className="text-sm text-stone-500">
          מחובר ל־{host} · משתמש {username}
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
          <RemoteMonitorSettingsForm
            defaultHost={host}
            defaultUsername={username}
            onSaved={() => setShowSettings(false)}
          />
          <button
            type="button"
            onClick={handleForget}
            disabled={forgetting}
            className="text-sm text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {forgetting ? "מוחק..." : "שכח פרטי התחברות"}
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {result.data.sensors.map((sensor) => (
              <button
                key={sensor.key}
                type="button"
                onClick={() => handleSensorClick({ key: sensor.key, name: sensor.name })}
                className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 text-right hover:border-wine/40 transition-colors"
              >
                <p className="font-medium text-stone-800">{sensor.name}</p>
                {sensor.temperatureC != null && (
                  <p className="text-2xl font-bold text-wine mt-2">
                    {sensor.temperatureC.toFixed(1)}°C
                  </p>
                )}
                {sensor.humidityPercent != null && (
                  <p className="text-sm text-stone-500 mt-1">
                    לחות: {sensor.humidityPercent.toFixed(1)}%
                  </p>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-stone-400">
            עודכן לאחרונה: {new Date(result.data.fetchedAt).toLocaleTimeString("he-IL")}
          </p>
        </>
      )}

      {selectedSensor && (
        <RemoteMonitorSensorChart
          sensorName={selectedSensor.name}
          result={history}
          onClose={() => setSelectedSensor(null)}
        />
      )}
    </div>
  )
}
