"use client"

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export type VintageStockRow = { vintage: string; bottles: number }

function formatCount(value: number): string {
  return value.toLocaleString("he-IL")
}

export function WineStockByVintageChart({ rows }: { rows: VintageStockRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 mb-6">
        <h3 className="text-sm font-medium text-stone-700 mb-3">בקבוקים במלאי לפי בציר</h3>
        <p className="text-stone-400 text-sm text-center py-8">אין עדיין יינות להצגה</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 mb-6">
      <h3 className="text-sm font-medium text-stone-700 mb-3">בקבוקים במלאי לפי בציר</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={rows} margin={{ top: 24, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis dataKey="vintage" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <Tooltip formatter={(value) => [formatCount(Number(value)), "בקבוקים"]} />
          <Bar dataKey="bottles" fill="#722F37" radius={[4, 4, 0, 0]}>
            <LabelList
              dataKey="bottles"
              position="top"
              formatter={(value) => formatCount(Number(value))}
              style={{ fill: "#44403c", fontSize: 13, fontWeight: 700 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
