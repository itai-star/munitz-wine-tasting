"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { formatWineName } from "@/lib/wine-label"

export type StockWine = { id: string; name: string; year: number | null; quantity: number }

const WINE_COLORS = [
  "#722F37",
  "#a16207",
  "#166534",
  "#1d4ed8",
  "#7e22ce",
  "#0f766e",
  "#9a3412",
  "#4d7c0f",
  "#be185d",
  "#475569",
]

const MIN_LABEL_HEIGHT = 18

type Segment = { wineId: string; name: string; label: string; quantity: number }

type VintageRow = {
  vintage: string
  total: number
  segments: Segment[]
  [rankKey: string]: string | number | Segment[]
}

function formatCount(value: number): string {
  return value.toLocaleString("he-IL")
}

function buildRows(wines: StockWine[]): { rows: VintageRow[]; maxRank: number } {
  const byVintage = new Map<string, { sortKey: number; wines: StockWine[] }>()
  for (const wine of wines) {
    if (wine.quantity <= 0) continue
    const vintage = wine.year == null ? "ללא שנה" : String(wine.year)
    const entry = byVintage.get(vintage) ?? { sortKey: wine.year ?? Infinity, wines: [] }
    entry.wines.push(wine)
    byVintage.set(vintage, entry)
  }

  const rows = Array.from(byVintage, ([vintage, { sortKey, wines: group }]) => ({
    vintage,
    sortKey,
    segments: [...group]
      .sort((a, b) => b.quantity - a.quantity)
      .map((w) => ({
        wineId: w.id,
        name: w.name,
        label: formatWineName(w.name, w.year),
        quantity: w.quantity,
      })),
  }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ vintage, segments }): VintageRow => {
      const row: VintageRow = {
        vintage,
        total: segments.reduce((sum, s) => sum + s.quantity, 0),
        segments,
      }
      segments.forEach((s, rank) => {
        row[`rank${rank}`] = s.quantity
      })
      return row
    })

  const maxRank = rows.reduce((max, row) => Math.max(max, row.segments.length), 0)
  return { rows, maxRank }
}

export function WineStockByVintageChart({ wines }: { wines: StockWine[] }) {
  const { rows, maxRank } = buildRows(wines)

  const colorByWineId = new Map<string, string>()
  const legend: { id: string; label: string; color: string }[] = []
  for (const wine of [...wines].sort((a, b) => a.name.localeCompare(b.name, "he"))) {
    if (wine.quantity <= 0) continue
    const color = WINE_COLORS[colorByWineId.size % WINE_COLORS.length]
    colorByWineId.set(wine.id, color)
    legend.push({ id: wine.id, label: formatWineName(wine.name, wine.year), color })
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 mb-6">
        <h3 className="text-sm font-medium text-stone-700 mb-3">בקבוקים במלאי לפי בציר</h3>
        <p className="text-stone-400 text-sm text-center py-8">אין עדיין יינות במלאי להצגה</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 mb-6">
      <h3 className="text-sm font-medium text-stone-700 mb-3">בקבוקים במלאי לפי בציר</h3>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={rows} margin={{ top: 24, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis dataKey="vintage" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip
            shared={false}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null
              const item = payload[0]
              const rowData = item.payload as VintageRow
              const rank = Number(String(item.dataKey).replace("rank", ""))
              const segment = rowData.segments[rank]
              if (!segment) return null
              return (
                <div className="bg-white border border-stone-200 rounded-lg shadow-sm px-3 py-2 text-xs">
                  <p className="font-medium text-stone-800">{segment.label}</p>
                  <p className="text-stone-600">{formatCount(segment.quantity)} בקבוקים</p>
                </div>
              )
            }}
          />
          {Array.from({ length: maxRank }, (_, rank) => (
            <Bar key={rank} dataKey={`rank${rank}`} stackId="stock" isAnimationActive={false}>
              {rows.map((row) => {
                const segment = row.segments[rank]
                return (
                  <Cell
                    key={row.vintage}
                    fill={segment ? colorByWineId.get(segment.wineId) : "transparent"}
                    stroke="#ffffff"
                    strokeWidth={segment ? 1 : 0}
                  />
                )
              })}
              <LabelList
                dataKey={`rank${rank}`}
                content={(props) => {
                  const { x, y, width, height, index } = props
                  const rowsWithRank = rows.filter((r) => r.segments.length > rank)
                  const row = typeof index === "number" ? rowsWithRank[index] : undefined
                  const segment = row?.segments[rank]
                  if (!row || !segment) return null
                  const centerX = Number(x) + Number(width) / 2
                  const isTopSegment = rank === row.segments.length - 1
                  return (
                    <g>
                      {Number(height) >= MIN_LABEL_HEIGHT && (
                        <text
                          x={centerX}
                          y={Number(y) + Number(height) / 2}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#ffffff"
                          fontSize={12}
                          fontWeight={700}
                        >
                          {segment.name} · {formatCount(segment.quantity)}
                        </text>
                      )}
                      {isTopSegment && (
                        <text
                          x={centerX}
                          y={Number(y) - 8}
                          textAnchor="middle"
                          fill="#44403c"
                          fontSize={13}
                          fontWeight={700}
                        >
                          {formatCount(row.total)}
                        </text>
                      )}
                    </g>
                  )
                }}
              />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {legend.map((item) => (
          <li key={item.id} className="flex items-center gap-1.5 text-xs text-stone-600">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
