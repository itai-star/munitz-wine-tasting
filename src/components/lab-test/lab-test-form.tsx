"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { createLabTest, updateLabTest } from "@/server/actions/lab-test-actions"

const FormSchema = z.object({
  testDate: z.string().min(1, "יש לבחור תאריך"),
  lab: z.string(),
  density: z.string(),
  ethanol: z.string(),
  ph: z.string(),
  totalAcid: z.string(),
  volatile: z.string(),
  rsBx: z.string(),
  co2: z.string(),
  malicAcid: z.string(),
  notes: z.string(),
})
type FormValues = z.infer<typeof FormSchema>

function toNullableNumber(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  const num = Number(trimmed)
  return Number.isFinite(num) ? num : null
}
function toNullableText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const emptyValues: FormValues = {
  testDate: new Date().toISOString().slice(0, 10),
  lab: "",
  density: "",
  ethanol: "",
  ph: "",
  totalAcid: "",
  volatile: "",
  rsBx: "",
  co2: "",
  malicAcid: "",
  notes: "",
}

export type EditableLabTest = {
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

function numberToText(value: number | null): string {
  return value == null ? "" : String(value)
}

function toFormValues(test: EditableLabTest): FormValues {
  return {
    testDate: new Date(test.testDate).toISOString().slice(0, 10),
    lab: test.lab ?? "",
    density: numberToText(test.density),
    ethanol: numberToText(test.ethanol),
    ph: numberToText(test.ph),
    totalAcid: numberToText(test.totalAcid),
    volatile: numberToText(test.volatile),
    rsBx: numberToText(test.rsBx),
    co2: numberToText(test.co2),
    malicAcid: numberToText(test.malicAcid),
    notes: test.notes ?? "",
  }
}

export function LabTestForm({
  finishedWineId,
  editingTest,
  onDone,
}: {
  finishedWineId: string
  editingTest?: EditableLabTest
  onDone?: () => void
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState("")
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: editingTest ? toFormValues(editingTest) : emptyValues,
  })

  async function onSubmit(values: FormValues) {
    setServerError("")
    const fields = {
      testDate: new Date(values.testDate),
      lab: toNullableText(values.lab),
      density: toNullableNumber(values.density),
      ethanol: toNullableNumber(values.ethanol),
      ph: toNullableNumber(values.ph),
      totalAcid: toNullableNumber(values.totalAcid),
      volatile: toNullableNumber(values.volatile),
      rsBx: toNullableNumber(values.rsBx),
      co2: toNullableNumber(values.co2),
      malicAcid: toNullableNumber(values.malicAcid),
      notes: toNullableText(values.notes),
    }
    const result = editingTest
      ? await updateLabTest({ id: editingTest.id, ...fields })
      : await createLabTest({ finishedWineId, ...fields })
    if (result.success) {
      if (editingTest) {
        onDone?.()
      } else {
        reset({ ...emptyValues, testDate: values.testDate })
      }
      router.refresh()
    } else {
      setServerError(result.error.message)
    }
  }

  const inputClass =
    "w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
  const labelClass = "block text-sm font-medium text-stone-700 mb-1"

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 space-y-4"
    >
      {serverError && (
        <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{serverError}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>תאריך</label>
          <input type="date" className={inputClass} {...register("testDate")} />
          {errors.testDate && <p className="text-red-600 text-xs mt-1">{errors.testDate.message}</p>}
        </div>
        <div>
          <label className={labelClass}>מעבדה</label>
          <input className={inputClass} {...register("lab")} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className={labelClass}>Density</label>
          <input type="number" step="any" inputMode="decimal" className={inputClass} {...register("density")} />
        </div>
        <div>
          <label className={labelClass}>Ethanol</label>
          <input type="number" step="any" inputMode="decimal" className={inputClass} {...register("ethanol")} />
        </div>
        <div>
          <label className={labelClass}>pH</label>
          <input type="number" step="any" inputMode="decimal" className={inputClass} {...register("ph")} />
        </div>
        <div>
          <label className={labelClass}>Total Acid</label>
          <input type="number" step="any" inputMode="decimal" className={inputClass} {...register("totalAcid")} />
        </div>
        <div>
          <label className={labelClass}>Volatile</label>
          <input type="number" step="any" inputMode="decimal" className={inputClass} {...register("volatile")} />
        </div>
        <div>
          <label className={labelClass}>RS/Bx</label>
          <input type="number" step="any" inputMode="decimal" className={inputClass} {...register("rsBx")} />
        </div>
        <div>
          <label className={labelClass}>CO2</label>
          <input type="number" step="any" inputMode="decimal" className={inputClass} {...register("co2")} />
        </div>
        <div>
          <label className={labelClass}>Malic Acid</label>
          <input type="number" step="any" inputMode="decimal" className={inputClass} {...register("malicAcid")} />
        </div>
      </div>

      <div>
        <label className={labelClass}>הערות</label>
        <textarea className={inputClass} rows={2} {...register("notes")} />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-wine text-white px-6 py-3 rounded-lg hover:bg-wine-dark transition-colors font-medium disabled:opacity-50"
        >
          {isSubmitting ? "שומר..." : editingTest ? "שמור שינויים" : "שמור בדיקת מעבדה"}
        </button>
        {editingTest && (
          <button
            type="button"
            onClick={onDone}
            className="px-6 py-3 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-50 transition-colors font-medium"
          >
            ביטול
          </button>
        )}
      </div>
    </form>
  )
}
