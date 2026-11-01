"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { formatShekels } from "@/lib/credit"
import { formatCount } from "@/lib/sales-summary"
import { importSalesWorkbook } from "@/server/actions/sales-actions"
import type { SalesImportSummary } from "@/server/actions/sales-actions"

export function SalesImportPanel({ year }: { year: number }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [summary, setSummary] = useState<SalesImportSummary | null>(null)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setSubmitting(true)
    setError("")
    setSummary(null)

    const formData = new FormData()
    formData.set("file", file)
    const result = await importSalesWorkbook(year, formData)

    setSubmitting(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (result.success) {
      setSummary(result.data)
      router.refresh()
    } else {
      setError(result.error.message)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-600">
        אפשר לבחור קובץ xlsx עם חודש אחד (גיליון בודד, ששמו שם החודש בעברית) או חוברת עם גיליון לכל חודש. הנתונים יישמרו לשנת{" "}
        <b>{year}</b>. ייבוא חוזר של אותו חודש מחליף את הנתונים שלו, וחודשים שלא בקובץ נשארים כפי שהם.
      </p>
      <label className="inline-block bg-wine text-white text-sm font-medium px-5 py-2.5 rounded-lg cursor-pointer hover:bg-wine-dark transition-colors">
        {submitting ? "מייבא ומחשב..." : "בחירת קובץ וייבוא"}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          onChange={handleFileChange}
          disabled={submitting}
          className="hidden"
        />
      </label>

      {error && (
        <p role="alert" className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">
          {error}
        </p>
      )}

      {summary && (
        <div className="text-sm space-y-2">
          <p className="text-emerald-700">
            יובאו {summary.months.length} חודשים.
          </p>
          {summary.unclassifiedCustomers > 0 && (
            <p className="text-amber-800">
              {summary.unclassifiedCustomers} לקוחות עדיין בלי סיווג פרטי או סיטונאי, ואפשר לסווג אותם למטה.
            </p>
          )}
          <ul className="text-stone-600 space-y-0.5">
            {summary.months.map((month) => (
              <li key={month.month}>
                {month.label}: <bdi>{formatCount(month.bottles)}</bdi> בקבוקים, <bdi>{formatShekels(month.revenueAgorot)}</bdi>
              </li>
            ))}
          </ul>
          {summary.warnings.length > 0 && (
            <ul className="list-disc ps-5 text-amber-800 bg-amber-50 rounded px-3 py-2 space-y-1">
              {summary.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
          {summary.ignoredSheets.length > 0 && (
            <p className="text-xs text-stone-400">גיליונות שלא נקראו: {summary.ignoredSheets.join(", ")}</p>
          )}
        </div>
      )}
    </div>
  )
}
