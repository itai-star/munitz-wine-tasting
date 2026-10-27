"use client"

import { useRouter, useSearchParams } from "next/navigation"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { formatShekels } from "@/lib/credit"
import { CreditYearlyBars } from "@/components/credit/credit-yearly-bars"
import type { CreditCardInfo, YearlyMonthRow } from "@/server/credit-data"

type TickProps = {
  x?: number
  y?: number
  payload?: { index: number }
}

function compactShekels(agorot: number): string {
  const shekels = Math.round(agorot / 100)
  return shekels === 0 ? "" : shekels.toLocaleString("he-IL")
}

export function CreditYearlyChart({
  year,
  years,
  cards,
  rows,
}: {
  year: number
  years: number[]
  cards: CreditCardInfo[]
  rows: YearlyMonthRow[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const chartRows = rows.map((row) => ({
    label: row.label,
    total: row.total,
    ...Object.fromEntries(cards.map((card) => [card.id, row.byCard[card.id] / 100])),
  }))

  function selectYear(next: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("year", next)
    router.push(`?${params.toString()}`)
  }

  function MonthTick({ x, y, payload }: TickProps) {
    const row = rows[payload?.index ?? 0]
    if (!row) return null
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={14} textAnchor="middle" fontSize={11} fill="#57534e">
          {row.label}
        </text>
        <text x={0} y={0} dy={28} textAnchor="middle" fontSize={10} fontWeight={700} fill="#44403c">
          {compactShekels(row.total)}
        </text>
      </g>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h3 className="text-sm font-medium text-stone-700">חיובים לפי חודש חיוב — {year}</h3>
        {years.length > 1 && (
          <select
            value={year}
            onChange={(e) => selectYear(e.target.value)}
            aria-label="שנה"
            className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm"
          >
            {years.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="sm:hidden">
        <CreditYearlyBars cards={cards} rows={rows} />
      </div>

      <div className="hidden sm:block">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartRows} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
            <XAxis dataKey="label" tick={<MonthTick />} interval={0} height={44} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value: number) => value.toLocaleString("he-IL")}
              width={56}
            />
            <Tooltip
              cursor={{ fill: "#f5f5f4" }}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null
                const row = rows.find((r) => r.label === label)
                return (
                  <div className="bg-white border border-stone-200 rounded-lg shadow-sm px-3 py-2 text-xs space-y-0.5">
                    <p className="font-medium text-stone-800">{label}</p>
                    {cards.map((card) => (
                      <p key={card.id} className="text-stone-600">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-sm ml-1.5 align-middle"
                          style={{ backgroundColor: card.color }}
                        />
                        {card.name}: <bdi>{formatShekels(row?.byCard[card.id] ?? 0)}</bdi>
                      </p>
                    ))}
                    <p className="font-medium text-stone-800 pt-0.5">
                      סה״כ: <bdi>{formatShekels(row?.total ?? 0)}</bdi>
                    </p>
                  </div>
                )
              }}
            />
            {cards.map((card) => (
              <Bar
                key={card.id}
                dataKey={card.id}
                stackId="charges"
                fill={card.color}
                stroke="#ffffff"
                strokeWidth={1}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {cards.map((card) => (
          <li key={card.id} className="flex items-center gap-1.5 text-xs text-stone-600">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: card.color }}
              aria-hidden="true"
            />
            {card.name}
            {card.last4 && <bdi> ····{card.last4}</bdi>}
          </li>
        ))}
      </ul>
    </div>
  )
}
