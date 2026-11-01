"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { importGrowerPayments } from "@/server/actions/grower-payment-import-actions"
import type { PaymentsImportSummary } from "@/server/actions/grower-payment-import-actions"

export function PaymentsExcelPanel({ vintageId, year }: { vintageId: string; year: number }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [summary, setSummary] = useState<PaymentsImportSummary | null>(null)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setSubmitting(true)
    setError("")
    setSummary(null)
    const formData = new FormData()
    formData.set("file", file)
    const result = await importGrowerPayments(vintageId, formData)

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
    <details className="bg-white rounded-2xl shadow-sm border border-stone-200 p-4">
      <summary className="cursor-pointer text-base font-bold text-wine">ייצוא וייבוא באקסל</summary>
      <div className="mt-3 space-y-3">
        <p className="text-sm text-stone-600">
          מייצאים קובץ עם ריכוז לפי כורם וזן, מחירים לבציר, חודש ראשון ומספר תשלומים לכל כורם, ורשימת התשלומים עם סטטוס שולם או פתוח.
          ממלאים באקסל ומעלים חזרה, והצפי החודשי והאחוזים מתעדכנים. אפשר גם לעדכן ישירות כאן במסך.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href={`/api/grower-payments/export?vintage=${year}`}
            download
            className="border border-stone-300 text-stone-800 font-semibold px-5 py-2.5 rounded-lg hover:bg-stone-50 transition-colors"
          >
            ייצוא לאקסל
          </a>
          <label className="bg-wine text-white font-semibold px-5 py-2.5 rounded-lg cursor-pointer hover:bg-wine-dark transition-colors">
            {submitting ? "מייבא..." : "ייבוא מאקסל"}
            <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileChange} disabled={submitting} className="hidden" />
          </label>
        </div>

        {error && (
          <p role="alert" className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">
            {error}
          </p>
        )}

        {summary && (
          <div className="text-sm space-y-2">
            <p className="text-emerald-700 font-semibold">
              עודכנו {summary.pricesChanged} מחירים, נשמרו {summary.plansSaved} לוחות תשלומים ושונו {summary.statusesChanged} סטטוסים.
            </p>
            {summary.errors.length > 0 && (
              <div className="text-red-600">
                <p>{summary.errors.length} שורות לא נקלטו:</p>
                <ul className="list-disc ps-5 mt-1">
                  {summary.errors.map((rowError) => (
                    <li key={`${rowError.sheet}-${rowError.row}-${rowError.message}`}>
                      {rowError.sheet}, שורה {rowError.row}: {rowError.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </details>
  )
}
