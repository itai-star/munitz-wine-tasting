"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatShekels } from "@/lib/credit"
import { formatCount } from "@/lib/sales-summary"
import { importSalesWorkbook } from "@/server/actions/sales-actions"
import type { SalesImportSummary } from "@/server/actions/sales-actions"

// The first year the winery's monthly sales are kept from.
const FIRST_IMPORT_YEAR = 2020

// The year a file is saved to is chosen here, so past years can be loaded as well as the one on screen.
function importYears(shown: number): number[] {
  const last = Math.max(new Date().getFullYear(), shown)
  const first = Math.min(FIRST_IMPORT_YEAR, shown)
  return Array.from({ length: last - first + 1 }, (_, index) => last - index)
}

// A year written in the name of the file, when it is not the year chosen, is most likely a file picked by mistake.
function yearInFileName(name: string): number | null {
  const match = /(?:^|[^\d])(20\d{2})(?:[^\d]|$)/.exec(name)
  return match ? Number(match[1]) : null
}

export function SalesImportPanel({ year }: { year: number }) {
  const router = useRouter()
  const [targetYear, setTargetYear] = useState(year)
  const [importedYear, setImportedYear] = useState(year)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [summary, setSummary] = useState<SalesImportSummary | null>(null)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const nameYear = yearInFileName(file.name)
    if (nameYear !== null && nameYear !== targetYear && !confirm(`שם הקובץ מזכיר את שנת ${nameYear}, אבל נבחרה שנת ${targetYear}. לייבא את הקובץ לשנת ${targetYear}?`)) {
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    setSubmitting(true)
    setError("")
    setSummary(null)

    const formData = new FormData()
    formData.set("file", file)
    const result = await importSalesWorkbook(targetYear, formData)

    setSubmitting(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (result.success) {
      setSummary(result.data)
      setImportedYear(targetYear)
      router.refresh()
    } else {
      setError(result.error.message)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-600">
        אפשר לבחור קובץ xlsx עם חודש אחד (גיליון בודד, ששמו שם החודש בעברית) או חוברת עם גיליון לכל חודש. כל קובץ מכיל שנה אחת, וכדי לייבא
        שנים קודמות בוחרים את השנה כאן. ייבוא חוזר של אותו חודש מחליף את הנתונים שלו, וחודשים שלא בקובץ נשארים כפי שהם.
      </p>
      <div className="flex items-center gap-2">
        <label htmlFor="sales-import-year" className="text-sm font-bold text-stone-800">
          לשמור את הקובץ לשנת
        </label>
        <select
          id="sales-import-year"
          value={targetYear}
          disabled={submitting}
          onChange={(event) => setTargetYear(Number(event.target.value))}
          className="border border-stone-300 rounded-lg px-3 py-2 text-base bg-white focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
        >
          {importYears(year).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
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
            יובאו {summary.months.length} חודשים לשנת <bdi>{importedYear}</bdi>.
            {importedYear !== year && (
              <>
                {" "}
                <Link href={`/admin/monthly-summary?year=${importedYear}`} className="font-bold text-wine hover:underline">
                  מעבר לסיכום {importedYear}
                </Link>
              </>
            )}
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
