"use client"

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { VarietyWeightRow } from "@/lib/season-summary"

function formatKg(value: number): string {
  return value.toLocaleString("he-IL")
}

export function VarietyWeightChart({ rows }: { rows: VarietyWeightRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
        <h3 className="text-sm font-medium text-stone-700 mb-3">סה&quot;כ ענבים שנקלטו לפי זן</h3>
        <p className="text-stone-400 text-sm text-center py-8">אין עדיין נתוני קליטה לבציר זה</p>
      </div>
    )
  }

  const height = Math.max(200, rows.length * 36)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
      <h3 className="text-sm font-medium text-stone-700 mb-3">סה&quot;כ ענבים שנקלטו לפי זן (ק&quot;ג)</h3>
      <div dir="ltr">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="variety" tick={{ fontSize: 12 }} width={110} />
            <Tooltip formatter={(value) => [`${formatKg(Number(value))} ק"ג`, "כמות שנקלטה"]} />
            <Bar dataKey="totalWeightKg" fill="#722F37" radius={[0, 4, 4, 0]}>
              <LabelList
                dataKey="totalWeightKg"
                position="right"
                formatter={(value: unknown) => formatKg(Number(value))}
                style={{ fill: "#57534e", fontSize: 12 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
