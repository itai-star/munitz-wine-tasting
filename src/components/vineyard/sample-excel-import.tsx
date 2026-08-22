"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { importSamplesFromExcel } from "@/server/actions/sample-actions"

type ImportSummary = { imported: number; errors: { row: number; message: string }[] }

export function SampleExcelImport({ vintageId }: { vintageId: string }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setSubmitting(true)
    setError("")
    setSummary(null)

    const formData = new FormData()
    formData.set("file", file)

    const result = await importSamplesFromExcel(vintageId, formData)

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
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-medium text-stone-700">ייבוא מאקסל</p>
          <p className="text-xs text-stone-500">
            עמודות מצופות: תאריך, כרם, בומה, PH, חמיצות, צבע
          </p>
        </div>
        <label className="bg-stone-100 hover:bg-stone-200 transition-colors text-stone-700 text-sm font-medium px-4 py-2 rounded-lg cursor-pointer">
          {submitting ? "מייבא..." : "בחר קובץ xlsx"}
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

      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

      {summary && (
        <div className="mt-3 text-sm">
          <p className="text-green-700">יובאו {summary.imported} דגימות.</p>
          {summary.errors.length > 0 && (
            <div className="mt-2 text-red-600">
              <p>{summary.errors.length} שורות נדחו:</p>
              <ul className="list-disc mr-5 mt-1">
                {summary.errors.map((e) => (
                  <li key={e.row}>
                    שורה {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
