"use client"

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export type FermentationReadingPoint = {
  readingDate: string | Date
  brix: number | null
  specificGravity: number | null
  temperatureCelsius: number | null
  ph: number | null
  tankName: string
}

const LINE_COLORS = ["#7c2d3f", "#a16207", "#166534", "#1d4ed8", "#7e22ce", "#b91c1c"]

type PivotRow = { date: string; [seriesKey: string]: string | number | null }

function buildPivot(
  readings: FermentationReadingPoint[],
  metric: "sugar" | "temperatureCelsius" | "ph"
): { rows: PivotRow[]; tankNames: string[] } {
  const tankNames = Array.from(new Set(readings.map((r) => r.tankName))).sort()
  const byDate = new Map<string, PivotRow>()

  for (const reading of readings) {
    const dateKey = new Date(reading.readingDate).toLocaleDateString("he-IL")
    const row = byDate.get(dateKey) ?? { date: dateKey }

    const value =
      metric === "sugar" ? reading.brix ?? reading.specificGravity : reading[metric]

    row[reading.tankName] = value
    byDate.set(dateKey, row)
  }

  const rows = Array.from(byDate.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  return { rows, tankNames }
}

function MetricChart({
  title,
  readings,
  metric,
}: {
  title: string
  readings: FermentationReadingPoint[]
  metric: "sugar" | "temperatureCelsius" | "ph"
}) {
  const { rows, tankNames } = buildPivot(readings, metric)

  if (rows.length === 0) return null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
      <h3 className="text-sm font-medium text-stone-700 mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
          <Tooltip />
          {tankNames.length > 1 && <Legend />}
          {tankNames.map((name, i) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={LINE_COLORS[i % LINE_COLORS.length]}
              connectNulls
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function FermentationCharts({ readings }: { readings: FermentationReadingPoint[] }) {
  if (readings.length === 0) {
    return (
      <p className="text-stone-500 text-sm text-center py-8">אין עדיין קריאות להצגה</p>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <MetricChart title="ירידת בומה/צפיפות יומית" readings={readings} metric="sugar" />
      <MetricChart title="טמפרטורה יומית" readings={readings} metric="temperatureCelsius" />
      <MetricChart title="pH לאורך התסיסה" readings={readings} metric="ph" />
    </div>
  )
}
