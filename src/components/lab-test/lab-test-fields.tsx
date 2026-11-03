"use client"

import { z } from "zod"
import type { FieldErrors, UseFormRegister } from "react-hook-form"

// The form of a lab test, shared by the finished wine and the barrels: every value is text, as a form gives it.
export const LabTestFormSchema = z.object({
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
  actionItems: z.string(),
})
export type LabTestFormValues = z.infer<typeof LabTestFormSchema>

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
  actionItems: string | null
}

export type LabTestFields = {
  testDate: Date
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
  actionItems: string | null
}

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

function numberToText(value: number | null): string {
  return value == null ? "" : String(value)
}

export function emptyLabValues(testDate: string = new Date().toISOString().slice(0, 10)): LabTestFormValues {
  return { testDate, lab: "", density: "", ethanol: "", ph: "", totalAcid: "", volatile: "", rsBx: "", co2: "", malicAcid: "", notes: "", actionItems: "" }
}

export function labTestToValues(test: EditableLabTest): LabTestFormValues {
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
    actionItems: test.actionItems ?? "",
  }
}

export function labValuesToFields(values: LabTestFormValues): LabTestFields {
  return {
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
    actionItems: toNullableText(values.actionItems),
  }
}

const inputClass =
  "w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
const labelClass = "block text-sm font-medium text-stone-700 mb-1"

const NUMBER_FIELDS: { name: "density" | "ethanol" | "ph" | "totalAcid" | "volatile" | "rsBx" | "co2" | "malicAcid"; label: string }[] = [
  { name: "density", label: "Density" },
  { name: "ethanol", label: "Ethanol" },
  { name: "ph", label: "pH" },
  { name: "totalAcid", label: "Total Acid" },
  { name: "volatile", label: "Volatile" },
  { name: "rsBx", label: "RS/Bx" },
  { name: "co2", label: "CO2" },
  { name: "malicAcid", label: "Malic Acid" },
]

// The inputs of the lab test form: date, lab, the eight measurements, notes and actions to take.
export function LabTestFieldInputs({
  register,
  errors,
}: {
  register: UseFormRegister<LabTestFormValues>
  errors: FieldErrors<LabTestFormValues>
}) {
  return (
    <>
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
        {NUMBER_FIELDS.map((field) => (
          <div key={field.name}>
            <label className={labelClass}>{field.label}</label>
            <input type="number" step="any" inputMode="decimal" className={inputClass} {...register(field.name)} />
          </div>
        ))}
      </div>

      <div>
        <label className={labelClass}>הערות</label>
        <textarea className={inputClass} rows={2} {...register("notes")} />
      </div>

      <div>
        <label className={labelClass}>פעולות לביצוע</label>
        <textarea className={inputClass} rows={2} {...register("actionItems")} />
      </div>
    </>
  )
}
