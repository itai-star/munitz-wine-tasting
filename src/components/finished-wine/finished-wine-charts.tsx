"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  averageWineEfficiency,
  calculateWineEfficiency,
  type WineEfficiencyStages,
} from "@/lib/wine-efficiency"

const STAGE_LABELS = ["אחרי פראס", "אחרי שפייה ראשונה", "אחרי שפייה שנייה"] as const

type ChartRow = { stage: string; value: number | null }

function toChartRows(efficiency: ReturnType<typeof calculateWineEfficiency>): ChartRow[] {
  return [
    { stage: STAGE_LABELS[0], value: efficiency.afterPressing },
    { stage: STAGE_LABELS[1], value: efficiency.afterFirstRacking },
    { stage: STAGE_LABELS[2], value: efficiency.afterSecondRacking },
  ]
}

function EfficiencyBarChart({ title, rows }: { title: string; rows: ChartRow[] }) {
  const hasData = rows.some((r) => r.value != null)
  if (!hasData) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
        <h3 className="text-sm font-medium text-stone-700 mb-3">{title}</h3>
        <p className="text-stone-400 text-sm text-center py-8">אין עדיין מספיק נתונים לחישוב נצילות</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
      <h3 className="text-sm font-medium text-stone-700 mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(1)}%`, "נצילות"]}
          />
          <Bar dataKey="value" fill="#7c2d3f" radius={[4, 4, 0, 0]}>
            <LabelList
              dataKey="value"
              position="top"
              formatter={(value: number | null) => (value == null ? "" : `${value.toFixed(1)}%`)}
              style={{ fill: "#57534e", fontSize: 12 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function FinishedWineStageChart({ record }: { record: WineEfficiencyStages }) {
  const efficiency = calculateWineEfficiency(record)
  return <EfficiencyBarChart title="נצילות לפי שלב" rows={toChartRows(efficiency)} />
}

export function FinishedWineAverageChart({ records }: { records: WineEfficiencyStages[] }) {
  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
        <h3 className="text-sm font-medium text-stone-700 mb-3">נצילות ממוצעת לבציר</h3>
        <p className="text-stone-400 text-sm text-center py-8">אין עדיין רשומות יין מוכן לבציר זה</p>
      </div>
    )
  }
  const efficiency = averageWineEfficiency(records)
  return <EfficiencyBarChart title="נצילות ממוצעת לבציר" rows={toChartRows(efficiency)} />
}
