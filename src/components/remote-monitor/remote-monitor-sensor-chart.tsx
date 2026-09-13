"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { RemoteSensorSamplePoint } from "@/server/actions/remote-monitor-actions"
import type { Result } from "@/types"

function formatTick(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" })
}

function formatTooltipLabel(iso: string): string {
  return new Date(iso).toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function HistoryChart({
  title,
  points,
  dataKey,
  unit,
  color,
}: {
  title: string
  points: RemoteSensorSamplePoint[]
  dataKey: "temperatureC" | "humidityPercent"
  unit: string
  color: string
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-stone-700 mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={points}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis dataKey="recordedAt" tickFormatter={formatTick} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} unit={unit} domain={["auto", "auto"]} />
          <Tooltip
            labelFormatter={(value) => formatTooltipLabel(String(value))}
            formatter={(value) => [`${Number(value).toFixed(1)}${unit}`, title]}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RemoteMonitorSensorChart({
  sensorName,
  result,
  onClose,
}: {
  sensorName: string
  result: Result<RemoteSensorSamplePoint[]> | null
  onClose: () => void
}) {
  const points = result?.success ? result.data : null
  const hasTemperature = points?.some((p) => p.temperatureC != null) ?? false
  const hasHumidity = points?.some((p) => p.humidityPercent != null) ?? false

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-lg border border-stone-200 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-stone-800">{sensorName} — 7 ימים אחרונים</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 text-xl leading-none"
            aria-label="סגור"
          >
            ×
          </button>
        </div>

        {result && !result.success && (
          <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{result.error.message}</p>
        )}

        {result == null && <p className="text-stone-400 text-sm text-center py-8">טוען נתונים...</p>}

        {points != null && points.length === 0 && (
          <p className="text-stone-400 text-sm text-center py-8">
            עדיין אין מספיק נתונים היסטוריים לחיישן זה
          </p>
        )}

        {points != null && points.length > 0 && (
          <div className="space-y-6">
            {hasTemperature && (
              <HistoryChart
                title="טמפרטורה"
                points={points}
                dataKey="temperatureC"
                unit="°C"
                color="#7c2d3f"
              />
            )}
            {hasHumidity && (
              <HistoryChart
                title="לחות"
                points={points}
                dataKey="humidityPercent"
                unit="%"
                color="#1d4ed8"
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
