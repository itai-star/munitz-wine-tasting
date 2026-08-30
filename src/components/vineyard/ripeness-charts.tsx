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

export type RipenessSamplePoint = {
  sampleDate: string | Date
  brix: number | null
  ph: number | null
  titratableAcidity: number | null
  blockName: string
}

const LINE_COLORS = ["#7c2d3f", "#a16207", "#166534", "#1d4ed8", "#7e22ce", "#b91c1c"]

type PivotRow = { date: string; [seriesKey: string]: string | number | null }

function buildPivot(
  samples: RipenessSamplePoint[],
  metric: "brix" | "ph" | "titratableAcidity" | "ratio"
): { rows: PivotRow[]; blockNames: string[] } {
  const blockNames = Array.from(new Set(samples.map((s) => s.blockName))).sort()
  const byDate = new Map<string, PivotRow>()

  for (const sample of samples) {
    const dateKey = new Date(sample.sampleDate).toLocaleDateString("he-IL")
    const row = byDate.get(dateKey) ?? { date: dateKey }

    const value =
      metric === "ratio"
        ? sample.brix != null && sample.titratableAcidity
          ? sample.brix / sample.titratableAcidity
          : null
        : sample[metric]

    row[sample.blockName] = value
    byDate.set(dateKey, row)
  }

  const rows = Array.from(byDate.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  return { rows, blockNames }
}

function MetricChart({
  title,
  samples,
  metric,
}: {
  title: string
  samples: RipenessSamplePoint[]
  metric: "brix" | "ph" | "titratableAcidity" | "ratio"
}) {
  const { rows, blockNames } = buildPivot(samples, metric)

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
          {blockNames.length > 1 && <Legend />}
          {blockNames.map((name, i) => (
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

export function RipenessCharts({ samples }: { samples: RipenessSamplePoint[] }) {
  if (samples.length === 0) {
    return (
      <p className="text-stone-500 text-sm text-center py-8">
        אין עדיין דגימות להצגה
      </p>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <MetricChart title="בומה לאורך זמן" samples={samples} metric="brix" />
      <MetricChart title="חמיצות (TA) לאורך זמן" samples={samples} metric="titratableAcidity" />
      <MetricChart title="pH לאורך זמן" samples={samples} metric="ph" />
      <MetricChart title="יחס בומה/חמיצות" samples={samples} metric="ratio" />
    </div>
  )
}
