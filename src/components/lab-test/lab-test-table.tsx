"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { deleteLabTest } from "@/server/actions/lab-test-actions"

export type LabTestRow = {
  id: string
  testDate: string | Date
  lab: string | null
  density: number | null
  ethanol: number | null
  ph: number | null
  totalAcid: number | null
  volatile: number | null
  rsBx: number | null
  co2: number | null
  malicAcid: number | null
  notes: string | null
}

const deleteButtonClass =
  "inline-flex items-center gap-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors px-2 py-1 text-xs font-medium disabled:opacity-40"

const trashIcon = (
  <svg
    className="w-3.5 h-3.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 6h16" />
    <path d="M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6" />
    <path d="M6 6l1 14.5A1.5 1.5 0 0 0 8.5 22h7a1.5 1.5 0 0 0 1.5-1.5L18 6" />
  </svg>
)

export function LabTestTable({ tests }: { tests: LabTestRow[] }) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState("")

  async function handleDelete(id: string) {
    if (!confirm("למחוק את בדיקת המעבדה?")) return

    setDeletingId(id)
    setError("")
    const result = await deleteLabTest(id)
    setDeletingId(null)

    if (result.success) {
      router.refresh()
    } else {
      setError(result.error.message)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-x-auto">
      <div className="flex items-center justify-between gap-3 p-3 border-b border-stone-200">
        <span className="text-sm text-stone-500">{tests.length} בדיקות מעבדה</span>
      </div>

      {error && <p className="text-red-600 text-sm px-3 py-2">{error}</p>}

      {/* Mobile: stacked cards */}
      <div className="sm:hidden divide-y divide-stone-100">
        {tests.map((t) => (
          <div key={t.id} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-stone-800">{t.lab ?? "—"}</span>
              <span className="text-xs text-stone-500 shrink-0">
                {new Date(t.testDate).toLocaleDateString("he-IL")}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-stone-600">
              <span>Density: {t.density ?? "—"}</span>
              <span>Ethanol: {t.ethanol ?? "—"}</span>
              <span>pH: {t.ph ?? "—"}</span>
              <span>Total Acid: {t.totalAcid ?? "—"}</span>
              <span>Volatile: {t.volatile ?? "—"}</span>
              <span>RS/Bx: {t.rsBx ?? "—"}</span>
              <span>CO2: {t.co2 ?? "—"}</span>
              <span>Malic Acid: {t.malicAcid ?? "—"}</span>
            </div>
            {t.notes && <p className="mt-1 text-xs text-stone-400">{t.notes}</p>}
            <button
              type="button"
              onClick={() => handleDelete(t.id)}
              disabled={deletingId === t.id}
              className={`${deleteButtonClass} mt-2`}
            >
              {trashIcon}
              מחק בדיקה
            </button>
          </div>
        ))}
        {tests.length === 0 && (
          <p className="px-4 py-6 text-center text-stone-400 text-sm">
            אין עדיין בדיקות מעבדה לרשומה זו
          </p>
        )}
      </div>

      {/* Desktop / tablet: table */}
      <table className="w-full text-sm hidden sm:table">
        <thead>
          <tr className="border-b border-stone-200 text-stone-500 text-right">
            <th className="px-3 py-2 font-medium"></th>
            <th className="px-3 py-2 font-medium">תאריך</th>
            <th className="px-3 py-2 font-medium">מעבדה</th>
            <th className="px-3 py-2 font-medium">Density</th>
            <th className="px-3 py-2 font-medium">Ethanol</th>
            <th className="px-3 py-2 font-medium">pH</th>
            <th className="px-3 py-2 font-medium">Total Acid</th>
            <th className="px-3 py-2 font-medium">Volatile</th>
            <th className="px-3 py-2 font-medium">RS/Bx</th>
            <th className="px-3 py-2 font-medium">CO2</th>
            <th className="px-3 py-2 font-medium">Malic Acid</th>
            <th className="px-3 py-2 font-medium">הערות</th>
          </tr>
        </thead>
        <tbody>
          {tests.map((t) => (
            <tr key={t.id} className="border-b border-stone-100 last:border-0">
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => handleDelete(t.id)}
                  disabled={deletingId === t.id}
                  className={deleteButtonClass}
                >
                  {trashIcon}
                  מחק
                </button>
              </td>
              <td className="px-3 py-2">{new Date(t.testDate).toLocaleDateString("he-IL")}</td>
              <td className="px-3 py-2">{t.lab ?? "—"}</td>
              <td className="px-3 py-2">{t.density ?? "—"}</td>
              <td className="px-3 py-2">{t.ethanol ?? "—"}</td>
              <td className="px-3 py-2">{t.ph ?? "—"}</td>
              <td className="px-3 py-2">{t.totalAcid ?? "—"}</td>
              <td className="px-3 py-2">{t.volatile ?? "—"}</td>
              <td className="px-3 py-2">{t.rsBx ?? "—"}</td>
              <td className="px-3 py-2">{t.co2 ?? "—"}</td>
              <td className="px-3 py-2">{t.malicAcid ?? "—"}</td>
              <td className="px-3 py-2 text-stone-500">{t.notes ?? "—"}</td>
            </tr>
          ))}
          {tests.length === 0 && (
            <tr>
              <td colSpan={12} className="px-3 py-6 text-center text-stone-400">
                אין עדיין בדיקות מעבדה לרשומה זו
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
