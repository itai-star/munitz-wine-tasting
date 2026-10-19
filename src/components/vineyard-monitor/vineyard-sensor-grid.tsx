"use client"

import { useState } from "react"
import {
  getVineyardSensorHistory,
  type VineyardSamplePoint,
} from "@/server/actions/vineyard-monitor-data-actions"
import type { SensorTile as SensorTileData } from "@/lib/ecowitt"
import { VineyardSensorChart } from "@/components/vineyard-monitor/vineyard-sensor-chart"
import type { Result } from "@/types"

const HISTORY_RANGES = [
  { days: 1, label: "יום" },
  { days: 7, label: "7 ימים" },
  { days: 30, label: "30 ימים" },
]
const DEFAULT_HISTORY_DAYS = 7

function formatNumber(value: number, digits = 1): string {
  return value.toFixed(digits)
}

function formatUpdated(iso: string): string {
  return new Date(iso).toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function primaryValue(sensor: SensorTileData): { text: string; caption: string } {
  if (sensor.soilMoisturePercent != null) {
    return { text: `${formatNumber(sensor.soilMoisturePercent, 0)}%`, caption: "לחות קרקע" }
  }
  if (sensor.leafWetnessPercent != null) {
    return { text: `${formatNumber(sensor.leafWetnessPercent, 0)}%`, caption: "לחות עלווה" }
  }
  if (sensor.temperatureC != null) {
    return { text: `${formatNumber(sensor.temperatureC)}°C`, caption: "טמפרטורה" }
  }
  if (sensor.humidityPercent != null) {
    return { text: `${formatNumber(sensor.humidityPercent, 0)}%`, caption: "לחות אוויר" }
  }
  return { text: "—", caption: "" }
}

function SensorTile({ sensor, onOpen }: { sensor: SensorTileData; onOpen: () => void }) {
  const primary = primaryValue(sensor)
  const showHumidity = sensor.temperatureC != null && sensor.humidityPercent != null

  return (
    <button
      type="button"
      onClick={onOpen}
      className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 text-right hover:border-wine/40 transition-colors"
    >
      <p className="font-medium text-stone-800">{sensor.label}</p>
      <p className="text-2xl font-bold text-wine mt-2">
        <bdi>{primary.text}</bdi>
      </p>
      <p className="text-xs text-stone-400">{primary.caption}</p>
      {showHumidity && (
        <p className="text-sm text-stone-500 mt-1">
          לחות אוויר: <bdi>{formatNumber(sensor.humidityPercent!, 0)}%</bdi>
        </p>
      )}
      {sensor.rainDailyMm != null && (
        <p className="text-sm text-stone-500 mt-1">
          גשם היום: <bdi>{formatNumber(sensor.rainDailyMm)}</bdi> מ״מ
        </p>
      )}
      {sensor.observedAt && (
        <p className="text-xs text-stone-400 mt-2">
          עודכן <bdi>{formatUpdated(sensor.observedAt)}</bdi>
        </p>
      )}
    </button>
  )
}

function HistoryPanel({
  sensor,
  days,
  history,
  onSelectDays,
  onClose,
}: {
  sensor: SensorTileData
  days: number
  history: Result<VineyardSamplePoint[]> | null
  onSelectDays: (days: number) => void
  onClose: () => void
}) {
  const points = history?.success ? history.data : null

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white sm:rounded-xl shadow-lg p-4 sm:p-6 w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-stone-800">{sensor.label}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 text-xl leading-none"
            aria-label="סגור"
          >
            ×
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {HISTORY_RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              onClick={() => onSelectDays(range.days)}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                days === range.days
                  ? "bg-wine text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {history && !history.success && (
          <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{history.error.message}</p>
        )}
        {history == null && <p className="text-stone-400 text-sm text-center py-8">טוען נתונים...</p>}
        {points != null && points.length === 0 && (
          <p className="text-stone-400 text-sm text-center py-8">
            עדיין אין נתונים היסטוריים לחיישן זה בטווח שנבחר
          </p>
        )}
        {points != null && points.length > 0 && <VineyardSensorChart points={points} />}
      </div>
    </div>
  )
}

export function VineyardSensorGrid({ sensors }: { sensors: SensorTileData[] }) {
  const [selected, setSelected] = useState<SensorTileData | null>(null)
  const [days, setDays] = useState(DEFAULT_HISTORY_DAYS)
  const [history, setHistory] = useState<Result<VineyardSamplePoint[]> | null>(null)

  async function loadHistory(sensor: SensorTileData, rangeDays: number) {
    setDays(rangeDays)
    setHistory(null)
    setHistory(await getVineyardSensorHistory(sensor.stationId, sensor.key, rangeDays))
  }

  function openSensor(sensor: SensorTileData) {
    setSelected(sensor)
    void loadHistory(sensor, DEFAULT_HISTORY_DAYS)
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sensors.map((sensor) => (
          <SensorTile key={`${sensor.stationId}:${sensor.key}`} sensor={sensor} onOpen={() => openSensor(sensor)} />
        ))}
      </div>

      {selected && (
        <HistoryPanel
          sensor={selected}
          days={days}
          history={history}
          onSelectDays={(next) => loadHistory(selected, next)}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
