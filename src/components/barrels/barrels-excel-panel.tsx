"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { importBarrelsFromExcel } from "@/server/actions/barrel-import-actions"
import type { BarrelsImportSummary } from "@/server/actions/barrel-import-actions"

const linkClass =
  "inline-flex min-h-10 items-center rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-800 hover:bg-stone-50 transition-colors"

export function BarrelsExcelPanel() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [summary, setSummary] = useState<BarrelsImportSummary | null>(null)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setSubmitting(true)
    setError("")
    setSummary(null)
    const formData = new FormData()
    formData.set("file", file)
    const result = await importBarrelsFromExcel(formData)

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
    <details className="rounded-2xl border border-stone-200 bg-white p-4">
      <summary className="cursor-pointer text-base font-extrabold text-wine">ייצוא וייבוא באקסל</summary>
      <div className="mt-3 space-y-3">
        <p className="text-sm text-stone-600">
          בקובץ שלוש עמודות חובה: מספר חבית, סוג ושנה. מספר חבית חדש נוסף, ומספר שכבר קיים מתעדכן בסוג ובשנה שבקובץ. הקובץ לא מחזיר למלאי חבית
          שהוצאה ידנית. הייצוא כולל גם את סטטוס החבית (בחדר או הוצאה מהמלאי).
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="/api/barrels/export" download className={linkClass}>
            ייצוא לאקסל
          </a>
          <a href="/api/barrels/export?template=1" download className={linkClass}>
            תבנית ריקה
          </a>
          <label className="inline-flex min-h-10 cursor-pointer items-center rounded-lg bg-wine px-4 text-sm font-bold text-white hover:bg-wine-dark transition-colors">
            {submitting ? "מייבא..." : "ייבוא מאקסל"}
            <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileChange} disabled={submitting} className="hidden" />
          </label>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
            {error}
          </p>
        )}

        {summary && (
          <div className="space-y-2 rounded-lg bg-stone-50 p-3 text-sm">
            <p className="font-bold text-stone-900">
              נוספו {summary.created} חביות, עודכנו {summary.updated}, ו-{summary.unchanged} ללא שינוי
              {summary.errors.length > 0 && `. ${summary.errors.length} שורות לא נקלטו`}.
            </p>
            {summary.errors.length > 0 && (
              <ul className="list-disc space-y-0.5 ps-5 font-semibold text-red-700">
                {summary.errors.slice(0, 20).map((problem) => (
                  <li key={problem.row}>
                    שורה {problem.row}: {problem.message}
                  </li>
                ))}
                {summary.errors.length > 20 && <li>ועוד {summary.errors.length - 20} שורות</li>}
              </ul>
            )}
          </div>
        )}
      </div>
    </details>
  )
}
