"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { importBarrelWineFromExcel } from "@/server/actions/barrel-wine-import-actions"
import type { BarrelWineImportSummary } from "@/server/actions/barrel-wine-import-actions"

const linkClass =
  "inline-flex min-h-10 items-center rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-800 hover:bg-stone-50 transition-colors"

// Export the barrels of a year with their wine and tests, fill in the wine, and load it back for that year.
export function BarrelWineExcelPanel({ year }: { year: number }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [summary, setSummary] = useState<BarrelWineImportSummary | null>(null)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setSubmitting(true)
    setError("")
    setSummary(null)
    const formData = new FormData()
    formData.set("file", file)
    formData.set("year", String(year))
    const result = await importBarrelWineFromExcel(formData)

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
      <summary className="cursor-pointer text-base font-extrabold text-wine">יין בחביות באקסל, לשנת {year}</summary>
      <div className="mt-3 space-y-3">
        <p className="text-sm text-stone-600">
          הקובץ כולל שתי עמודות לקריאה: מספר חבית ויין. היין הוא שם הכרם, ואם הוא שילוב של כמה כרמים כותבים כל כרם עם האחוז שלו, למשל{" "}
          <bdi className="font-bold">SHCF (65%) + PKMR (35%)</bdi>. כרם יחיד אפשר לכתוב בלי אחוז. הכרמים חייבים להיות ברשימת הכרמים, והאחוזים צריכים
          להסתכם ב-100. שורה עם יין ריק משאירה את החבית כמו שהיא. הייבוא חל על שנת {year}.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href={`/api/barrels/wine-export?year=${year}`} download className={linkClass}>
            ייצוא {year}
          </a>
          <label className="inline-flex min-h-10 cursor-pointer items-center rounded-lg bg-wine px-4 text-sm font-bold text-white hover:bg-wine-dark transition-colors">
            {submitting ? "מייבא..." : `ייבוא יין לשנת ${year}`}
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
              עודכנו {summary.updated} חביות, {summary.unchanged} ללא שינוי
              {summary.skippedEmpty > 0 && `, ${summary.skippedEmpty} שורות עם יין ריק דולגו`}
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
