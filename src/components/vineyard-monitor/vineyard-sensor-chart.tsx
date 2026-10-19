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
import type { VineyardSamplePoint } from "@/server/actions/vineyard-monitor-actions"

type MetricKey =
  | "temperatureC"
  | "humidityPercent"
  | "soilMoisturePercent"
  | "leafWetnessPercent"
  | "rainDailyMm"

type Metric = { key: MetricKey; title: string; unit: string; color: string }

const METRICS: Metric[] = [
  { key: "temperatureC", title: "טמפרטורה", unit: "°C", color: "#7c2d3f" },
  { key: "humidityPercent", title: "לחות אוויר", unit: "%", color: "#1d4ed8" },
  { key: "soilMoisturePercent", title: "לחות קרקע", unit: "%", color: "#166534" },
  { key: "leafWetnessPercent", title: "לחות עלווה", unit: "%", color: "#0f766e" },
  { key: "rainDailyMm", title: "גשם מצטבר ביום", unit: "מ״מ", color: "#475569" },
]

const MAX_TICKS = 5

type AxisTickProps = {
  x?: number
  y?: number
  payload?: { value: string }
}

function DateTimeTick({ x, y, payload }: AxisTickProps) {
  if (!payload) return null
  const date = new Date(payload.value)
  const dateStr = date.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" })
  const timeStr = date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fontSize={11} fill="#57534e">
        {dateStr}
      </text>
      <text x={0} y={0} dy={26} textAnchor="middle" fontSize={10} fill="#a8a29e">
        {timeStr}
      </text>
    </g>
  )
}

function formatTooltipLabel(iso: string): string {
  return new Date(iso).toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function MetricChart({ points, metric }: { points: VineyardSamplePoint[]; metric: Metric }) {
  const tickInterval = Math.max(0, Math.ceil(points.length / MAX_TICKS) - 1)

  return (
    <div>
      <h3 className="text-sm font-medium text-stone-700 mb-3">{metric.title}</h3>
      <div className="h-[300px] sm:h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis dataKey="recordedAt" tick={<DateTimeTick />} height={40} interval={tickInterval} />
            <YAxis
              tick={{ fontSize: 12 }}
              unit={metric.unit}
              domain={["auto", "auto"]}
              width={metric.unit.length > 2 ? 56 : 44}
            />
            <Tooltip
              labelFormatter={(value) => formatTooltipLabel(String(value))}
              formatter={(value) => [`${Number(value).toFixed(1)}${metric.unit}`, metric.title]}
            />
            <Line
              type="monotone"
              dataKey={metric.key}
              stroke={metric.color}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function VineyardSensorChart({ points }: { points: VineyardSamplePoint[] }) {
  const available = METRICS.filter((metric) => points.some((p) => p[metric.key] != null))

  return (
    <div className="space-y-6">
      {available.map((metric) => (
        <MetricChart key={metric.key} points={points} metric={metric} />
      ))}
    </div>
  )
}
