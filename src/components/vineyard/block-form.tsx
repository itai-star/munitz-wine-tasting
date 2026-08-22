"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { createBlock, updateBlock } from "@/server/actions/vineyard-actions"

const FormSchema = z.object({
  name: z.string().min(1, "שם הבלוק נדרש"),
  location: z.string(),
  elevationMeters: z.string(),
  slopeDirection: z.string(),
  slopeAngleDegrees: z.string(),
  soilType: z.string(),
  variety: z.string().min(1, "זן הגפן נדרש"),
  rootstock: z.string(),
  plantingYear: z.string(),
  plantingDensity: z.string(),
  rowDirection: z.string(),
  trellisMethod: z.string(),
  irrigationType: z.string(),
  estimatedYieldPerDunam: z.string(),
  diseaseHistory: z.string(),
})
type FormValues = z.infer<typeof FormSchema>

type BlockRecord = {
  id: string
  name: string
  location: string | null
  elevationMeters: number | null
  slopeDirection: string | null
  slopeAngleDegrees: number | null
  soilType: string | null
  variety: string
  rootstock: string | null
  plantingYear: number | null
  plantingDensity: string | null
  rowDirection: string | null
  trellisMethod: string | null
  irrigationType: string | null
  estimatedYieldPerDunam: number | null
  diseaseHistory: string | null
}

function toInputText(value: string | null): string {
  return value ?? ""
}
function toInputNumber(value: number | null): string {
  return value == null ? "" : String(value)
}
function toNullableText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}
function toNullableNumber(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  const num = Number(trimmed)
  return Number.isFinite(num) ? num : null
}

function toDefaultValues(block?: BlockRecord): FormValues {
  return {
    name: block?.name ?? "",
    location: toInputText(block?.location ?? null),
    elevationMeters: toInputNumber(block?.elevationMeters ?? null),
    slopeDirection: toInputText(block?.slopeDirection ?? null),
    slopeAngleDegrees: toInputNumber(block?.slopeAngleDegrees ?? null),
    soilType: toInputText(block?.soilType ?? null),
    variety: block?.variety ?? "",
    rootstock: toInputText(block?.rootstock ?? null),
    plantingYear: toInputNumber(block?.plantingYear ?? null),
    plantingDensity: toInputText(block?.plantingDensity ?? null),
    rowDirection: toInputText(block?.rowDirection ?? null),
    trellisMethod: toInputText(block?.trellisMethod ?? null),
    irrigationType: toInputText(block?.irrigationType ?? null),
    estimatedYieldPerDunam: toInputNumber(block?.estimatedYieldPerDunam ?? null),
    diseaseHistory: toInputText(block?.diseaseHistory ?? null),
  }
}

export function BlockForm({ block }: { block?: BlockRecord }) {
  const router = useRouter()
  const [serverError, setServerError] = useState("")
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: toDefaultValues(block),
  })

  async function onSubmit(values: FormValues) {
    setServerError("")
    const payload = {
      name: values.name,
      variety: values.variety,
      location: toNullableText(values.location),
      elevationMeters: toNullableNumber(values.elevationMeters),
      slopeDirection: toNullableText(values.slopeDirection),
      slopeAngleDegrees: toNullableNumber(values.slopeAngleDegrees),
      soilType: toNullableText(values.soilType),
      rootstock: toNullableText(values.rootstock),
      plantingYear: toNullableNumber(values.plantingYear),
      plantingDensity: toNullableText(values.plantingDensity),
      rowDirection: toNullableText(values.rowDirection),
      trellisMethod: toNullableText(values.trellisMethod),
      irrigationType: toNullableText(values.irrigationType),
      estimatedYieldPerDunam: toNullableNumber(values.estimatedYieldPerDunam),
      diseaseHistory: toNullableText(values.diseaseHistory),
    }

    const result = block
      ? await updateBlock({ ...payload, id: block.id })
      : await createBlock(payload)

    if (result.success) {
      router.push("/admin/vineyard")
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
      className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 grid gap-4 sm:grid-cols-2"
    >
      {serverError && (
        <p className="sm:col-span-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded">
          {serverError}
        </p>
      )}

      <div>
        <label className={labelClass}>שם הבלוק *</label>
        <input className={inputClass} {...register("name")} />
        {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className={labelClass}>זן *</label>
        <input className={inputClass} {...register("variety")} />
        {errors.variety && <p className="text-red-600 text-xs mt-1">{errors.variety.message}</p>}
      </div>

      <div>
        <label className={labelClass}>מיקום (קואורדינטות / גוש-חלקה)</label>
        <input className={inputClass} {...register("location")} />
      </div>

      <div>
        <label className={labelClass}>גובה מעל פני הים (מ&apos;)</label>
        <input type="number" className={inputClass} {...register("elevationMeters")} />
      </div>

      <div>
        <label className={labelClass}>כיוון מדרון</label>
        <input className={inputClass} {...register("slopeDirection")} />
      </div>

      <div>
        <label className={labelClass}>זווית שיפוע (מעלות)</label>
        <input type="number" className={inputClass} {...register("slopeAngleDegrees")} />
      </div>

      <div>
        <label className={labelClass}>סוג קרקע</label>
        <input className={inputClass} {...register("soilType")} />
      </div>

      <div>
        <label className={labelClass}>כנה (rootstock)</label>
        <input className={inputClass} {...register("rootstock")} />
      </div>

      <div>
        <label className={labelClass}>שנת נטיעה</label>
        <input type="number" className={inputClass} {...register("plantingYear")} />
      </div>

      <div>
        <label className={labelClass}>צפיפות נטיעה</label>
        <input className={inputClass} {...register("plantingDensity")} placeholder='לדוגמה: 2.5x1.2 מ׳' />
      </div>

      <div>
        <label className={labelClass}>כיוון שורות</label>
        <input className={inputClass} {...register("rowDirection")} />
      </div>

      <div>
        <label className={labelClass}>שיטת גיזום/טרליס</label>
        <input className={inputClass} {...register("trellisMethod")} />
      </div>

      <div>
        <label className={labelClass}>השקיה</label>
        <input className={inputClass} {...register("irrigationType")} placeholder="מטפטפים / בעל" />
      </div>

      <div>
        <label className={labelClass}>יבול משוער לדונם</label>
        <input type="number" className={inputClass} {...register("estimatedYieldPerDunam")} />
      </div>

      <div className="sm:col-span-2">
        <label className={labelClass}>היסטוריית מחלות ומזיקים</label>
        <textarea className={inputClass} rows={3} {...register("diseaseHistory")} />
      </div>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-wine text-white px-8 py-2.5 rounded-lg hover:bg-wine-dark transition-colors font-medium disabled:opacity-50"
        >
          {isSubmitting ? "שומר..." : block ? "עדכן בלוק" : "צור בלוק"}
        </button>
      </div>
    </form>
  )
}
