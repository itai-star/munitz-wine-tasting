"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { importEventsFromExcel } from "@/server/actions/event-import-actions"
import type { EventsImportSummary } from "@/server/actions/event-import-actions"

const linkClass =
  "inline-flex min-h-10 items-center rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-800 hover:bg-stone-50 transition-colors"

// Export the calendar to a workbook, fill it in, and load it back. Rows already on the calendar are skipped.
export function EventsExcelPanel({ year }: { year: number }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [summary, setSummary] = useState<EventsImportSummary | null>(null)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setSubmitting(true)
    setError("")
    setSummary(null)
    const formData = new FormData()
    formData.set("file", file)
    const result = await importEventsFromExcel(formData)

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
          הקובץ כולל קטגוריה, פרטי האירוע, תאריך וסטטוס (פעיל או בוטל). לטעינה מרוכזת מורידים את התבנית, ממלאים שורה לכל אירוע, ומעלים. קטגוריה
          נבחרת מהרשימה שבקובץ. שורה שכבר קיימת בלוח מדולגת, כך שטעינה חוזרת של אותו קובץ לא תכפיל אירועים.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href={`/api/events/export?year=${year}`} download className={linkClass}>
            ייצוא {year}
          </a>
          <a href="/api/events/export?year=all" download className={linkClass}>
            ייצוא כל השנים
          </a>
          <a href="/api/events/export?template=1" download className={linkClass}>
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
              נוספו {summary.created} אירועים
              {summary.skipped > 0 && `, ${summary.skipped} שורות כבר קיימות בלוח ודולגו`}
              {summary.errors.length > 0 && `, ו-${summary.errors.length} שורות לא נקלטו`}.
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
