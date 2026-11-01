"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { importBlocksFromExcel } from "@/server/actions/vineyard-excel-actions"
import type { BlocksImportSummary } from "@/server/actions/vineyard-excel-actions"

// Export the vineyard blocks to a workbook, edit it, and load it back. Blocks are matched by name.
export function VineyardExcelPanel({ includesFinance }: { includesFinance: boolean }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [summary, setSummary] = useState<BlocksImportSummary | null>(null)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setSubmitting(true)
    setError("")
    setSummary(null)
    const formData = new FormData()
    formData.set("file", file)
    const result = await importBlocksFromExcel(formData)

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
      <summary className="cursor-pointer text-base font-bold text-wine">ייצוא וייבוא של נתוני הכרם באקסל</summary>
      <div className="mt-3 space-y-3">
        <p className="text-sm text-stone-600">
          מייצאים את כל הבלוקים לקובץ, מעדכנים אותו באקסל ומעלים אותו חזרה. בלוק מזוהה לפי השם: שם קיים מתעדכן, ושם חדש נוצר.
          {includesFinance && " הקובץ כולל גם כורם (בחירה מרשימה) ומחיר לקילו."}
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/api/vineyard/export"
            download
            className="border border-stone-300 text-stone-800 font-semibold px-5 py-2.5 rounded-lg hover:bg-stone-50 transition-colors"
          >
            ייצוא לאקסל
          </a>
          <label className="bg-wine text-white font-semibold px-5 py-2.5 rounded-lg cursor-pointer hover:bg-wine-dark transition-colors">
            {submitting ? "מייבא..." : "ייבוא מאקסל"}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              disabled={submitting}
              className="hidden"
            />
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
              נוצרו {summary.created} בלוקים, עודכנו {summary.updated} וללא שינוי {summary.unchanged}.
            </p>
            {summary.warnings.length > 0 && (
              <ul className="list-disc ps-5 text-amber-800 bg-amber-50 rounded px-3 py-2 space-y-1">
                {summary.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
            {summary.errors.length > 0 && (
              <div className="text-red-600">
                <p>{summary.errors.length} שורות לא נקלטו:</p>
                <ul className="list-disc ps-5 mt-1">
                  {summary.errors.map((rowError) => (
                    <li key={`${rowError.row}-${rowError.message}`}>
                      שורה {rowError.row}: {rowError.message}
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
