"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { formatShekels, hebrewMonthName, parseMonthKey } from "@/lib/credit"
import type { CreditCardInfo, CreditTransactionRow } from "@/server/credit-data"

function monthLabel(key: string): string {
  const parsed = parseMonthKey(key)
  return parsed ? `${hebrewMonthName(parsed.month)} ${parsed.year}` : key
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", { timeZone: "UTC" })
}

export function CreditMonthView({
  cards,
  availableMonths,
  selectedMonth,
  selectedCardId,
  transactions,
  totalAgorot,
}: {
  cards: CreditCardInfo[]
  availableMonths: string[]
  selectedMonth: string | null
  selectedCardId: string | null
  transactions: CreditTransactionRow[]
  totalAgorot: number
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const cardById = new Map(cards.map((card) => [card.id, card]))

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`?${params.toString()}`)
  }

  const selectClass = "border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white"

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
        <div className="flex gap-3 flex-wrap">
          <div>
            <label className="block text-xs text-stone-500 mb-1">חודש חיוב</label>
            <select
              className={selectClass}
              value={selectedMonth ?? ""}
              onChange={(e) => update("month", e.target.value)}
              disabled={availableMonths.length === 0}
            >
              {availableMonths.length === 0 && <option value="">אין נתונים</option>}
              {availableMonths.map((key) => (
                <option key={key} value={key}>
                  {monthLabel(key)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">כרטיס</label>
            <select
              className={selectClass}
              value={selectedCardId ?? ""}
              onChange={(e) => update("card", e.target.value)}
            >
              <option value="">כל הכרטיסים</option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name}
                  {card.last4 ? ` ····${card.last4}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="text-left">
          <p className="text-xs text-stone-500">סה״כ חיוב בחודש</p>
          <p className="text-2xl font-bold text-wine">
            <bdi>{formatShekels(totalAgorot)}</bdi>
          </p>
          <p className="text-xs text-stone-400">
            <bdi>{transactions.length}</bdi> עסקאות
          </p>
        </div>
      </div>

      {transactions.length === 0 ? (
        <p className="text-stone-400 text-sm text-center py-8">אין עסקאות להצגה בבחירה הזו</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 text-right">
                <th className="px-3 py-2 font-medium">תאריך עסקה</th>
                <th className="px-3 py-2 font-medium">בית עסק</th>
                <th className="px-3 py-2 font-medium">כרטיס</th>
                <th className="px-3 py-2 font-medium">תשלומים</th>
                <th className="px-3 py-2 font-medium text-left">סכום</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => {
                const card = cardById.get(txn.cardId)
                return (
                  <tr key={txn.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <bdi>{formatDate(txn.transactionDate)}</bdi>
                    </td>
                    <td className="px-3 py-2">{txn.description}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-sm ml-1.5 align-middle"
                        style={{ backgroundColor: card?.color ?? "#a8a29e" }}
                        aria-hidden="true"
                      />
                      {card?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-stone-500 whitespace-nowrap">
                      {txn.installmentsTotal ? (
                        <bdi>
                          {txn.installmentNumber ?? "?"}/{txn.installmentsTotal}
                        </bdi>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-left font-medium whitespace-nowrap">
                      <bdi>{formatShekels(txn.amountAgorot)}</bdi>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
