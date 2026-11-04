"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { createBarrelTest, deleteBarrelTest, updateBarrelTest } from "@/server/actions/barrel-test-actions"
import {
  LabTestFieldInputs,
  LabTestFormSchema,
  emptyLabValues,
  labTestToValues,
  labValuesToFields,
} from "@/components/lab-test/lab-test-fields"
import type { LabTestFormValues } from "@/components/lab-test/lab-test-fields"
import type { BarrelTestRow, BarrelYearRow } from "@/lib/barrel-room"

const MEASURES: { key: "density" | "ethanol" | "ph" | "totalAcid" | "volatile" | "rsBx" | "co2" | "malicAcid" | "freeBisulfite"; label: string }[] = [
  { key: "density", label: "Density" },
  { key: "ethanol", label: "Ethanol" },
  { key: "ph", label: "pH" },
  { key: "totalAcid", label: "Total Acid" },
  { key: "volatile", label: "Volatile" },
  { key: "rsBx", label: "RS/Bx" },
  { key: "co2", label: "CO2" },
  { key: "malicAcid", label: "Malic Acid" },
  { key: "freeBisulfite", label: "ביסולפיט חופשי" },
]

function dateText(day: string): string {
  return day.split("-").reverse().join(".")
}

function TestForm({
  barrelId,
  year,
  editing,
  onDone,
}: {
  barrelId: string
  year: number
  editing: BarrelTestRow | null
  onDone: () => void
}) {
  const router = useRouter()
  const [error, setError] = useState("")
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LabTestFormValues>({
    resolver: zodResolver(LabTestFormSchema),
    defaultValues: editing ? labTestToValues(editing) : emptyLabValues(),
  })

  async function onSubmit(values: LabTestFormValues): Promise<void> {
    setError("")
    const fields = labValuesToFields(values)
    const result = editing ? await updateBarrelTest({ id: editing.id, ...fields }) : await createBarrelTest({ barrelId, year, ...fields })
    if (result.success) {
      onDone()
      router.refresh()
    } else {
      setError(result.error.message)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
      <p className="text-base font-extrabold text-stone-900">{editing ? "עריכת בדיקה" : "בדיקת מעבדה חדשה"}</p>
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <LabTestFieldInputs register={register} errors={errors} withBisulfite />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-11 flex-1 rounded-lg bg-wine px-6 font-bold text-white hover:bg-wine-dark transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "שומר..." : editing ? "שמירת שינויים" : "שמירת בדיקה"}
        </button>
        <button type="button" onClick={onDone} className="min-h-11 rounded-lg border border-stone-300 px-5 font-bold text-stone-600 hover:bg-white">
          ביטול
        </button>
      </div>
    </form>
  )
}

// The lab tests of a barrel for one year: the list of them, and a form to add one or change one.
export function BarrelTestsDialog({ row, year, onClose }: { row: BarrelYearRow; year: number; onClose: () => void }) {
  const router = useRouter()
  const [formFor, setFormFor] = useState<"new" | string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  async function remove(test: BarrelTestRow): Promise<void> {
    if (!confirm("למחוק את בדיקת המעבדה?")) return
    setBusyId(test.id)
    setError("")
    const result = await deleteBarrelTest(test.id)
    setBusyId(null)
    if (result.success) router.refresh()
    else setError(result.error.message)
  }

  const editing = formFor && formFor !== "new" ? row.tests.find((test) => test.id === formFor) ?? null : null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="בדיקות מעבדה של חבית"
        onClick={(event) => event.stopPropagation()}
        className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-xl space-y-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-stone-900">בדיקות מעבדה, חבית {row.number}</h2>
            <p className="text-sm font-semibold text-stone-600">
              שנה <bdi>{year}</bdi>
              {row.parts.length > 0 && ` · ${row.parts.map((part) => part.blockName).join(" + ")}`}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="סגירה" className="h-10 w-10 rounded-full text-2xl leading-none text-stone-500 hover:bg-stone-100">
            ×
          </button>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
            {error}
          </p>
        )}

        {formFor === null ? (
          <button
            type="button"
            onClick={() => setFormFor("new")}
            className="min-h-11 rounded-lg bg-wine px-5 text-base font-bold text-white hover:bg-wine-dark transition-colors"
          >
            + בדיקה חדשה
          </button>
        ) : (
          <TestForm key={formFor} barrelId={row.id} year={year} editing={editing} onDone={() => setFormFor(null)} />
        )}

        {row.tests.length === 0 ? (
          <p className="rounded-xl border border-stone-200 p-4 text-center text-base text-stone-500">עדיין אין בדיקות לחבית הזו בשנה {year}.</p>
        ) : (
          <ul className="space-y-3">
            {[...row.tests].reverse().map((test) => (
              <li key={test.id} className="rounded-xl border border-stone-200 p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-base font-extrabold text-stone-900">
                    <bdi>{dateText(test.testDate)}</bdi>
                  </span>
                  <span className="text-sm font-semibold text-stone-600">{test.lab ?? "ללא שם מעבדה"}</span>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                  {MEASURES.map((measure) => (
                    <div key={measure.key} className="flex justify-between gap-2">
                      <dt className="font-semibold text-stone-600">{measure.label}</dt>
                      <dd className="font-extrabold text-stone-900">
                        <bdi>{test[measure.key] ?? "—"}</bdi>
                      </dd>
                    </div>
                  ))}
                </dl>
                {test.notes && <p className="mt-2 whitespace-pre-line text-sm text-stone-600">{test.notes}</p>}
                {test.actionItems && (
                  <p className="mt-1 whitespace-pre-line text-sm text-stone-800">
                    <span className="font-bold">פעולות לביצוע:</span> {test.actionItems}
                  </p>
                )}
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => setFormFor(test.id)} className="min-h-10 rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-800 hover:bg-stone-50">
                    עריכה
                  </button>
                  <button
                    type="button"
                    disabled={busyId === test.id}
                    onClick={() => remove(test)}
                    className="min-h-10 px-3 text-sm font-bold text-red-700 hover:underline disabled:opacity-50"
                  >
                    מחיקה
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button type="button" onClick={onClose} className="min-h-11 px-3 text-base font-bold text-stone-600 hover:underline">
          סגירה
        </button>
      </div>
    </div>
  )
}
