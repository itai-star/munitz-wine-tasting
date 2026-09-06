"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { createFinishedWine, updateFinishedWine } from "@/server/actions/finished-wine-actions"

const FormSchema = z.object({
  vintageId: z.string().min(1, "יש לבחור בציר"),
  tank: z.string().min(1, "יש להזין שם/מספר מכל"),
  harvestedWeightKg: z.string().min(1, "יש להזין כמות שנבצרה"),
  litersAfterPressing: z.string(),
  litersAfterFirstRacking: z.string(),
  litersAfterSecondRacking: z.string(),
})
type FormValues = z.infer<typeof FormSchema>

function toNullableInt(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  const num = Number(trimmed)
  return Number.isFinite(num) ? Math.round(num) : null
}
function toInputNumber(value: number | null): string {
  return value == null ? "" : String(value)
}

export type EditableFinishedWine = {
  id: string
  vintageId: string
  tank: string
  harvestedWeightKg: number
  litersAfterPressing: number | null
  litersAfterFirstRacking: number | null
  litersAfterSecondRacking: number | null
}

export function FinishedWineForm({
  vintageId,
  vintages,
  editingWine,
}: {
  vintageId: string
  vintages: { id: string; label: string }[]
  editingWine?: EditableFinishedWine
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState("")
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: editingWine
      ? {
          vintageId: editingWine.vintageId,
          tank: editingWine.tank,
          harvestedWeightKg: toInputNumber(editingWine.harvestedWeightKg),
          litersAfterPressing: toInputNumber(editingWine.litersAfterPressing),
          litersAfterFirstRacking: toInputNumber(editingWine.litersAfterFirstRacking),
          litersAfterSecondRacking: toInputNumber(editingWine.litersAfterSecondRacking),
        }
      : {
          vintageId,
          tank: "",
          harvestedWeightKg: "",
          litersAfterPressing: "",
          litersAfterFirstRacking: "",
          litersAfterSecondRacking: "",
        },
  })

  async function onSubmit(values: FormValues) {
    setServerError("")
    const payload = {
      vintageId: values.vintageId,
      tank: values.tank,
      harvestedWeightKg: toNullableInt(values.harvestedWeightKg) ?? 0,
      litersAfterPressing: toNullableInt(values.litersAfterPressing),
      litersAfterFirstRacking: toNullableInt(values.litersAfterFirstRacking),
      litersAfterSecondRacking: toNullableInt(values.litersAfterSecondRacking),
    }

    const result = editingWine
      ? await updateFinishedWine({ id: editingWine.id, ...payload })
      : await createFinishedWine(payload)

    if (result.success) {
      router.push(editingWine ? `/admin/finished-wine/${editingWine.id}` : "/admin/finished-wine")
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
        <label className={labelClass}>בציר *</label>
        <select className={inputClass} {...register("vintageId")}>
          {vintages.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
        {errors.vintageId && <p className="text-red-600 text-xs mt-1">{errors.vintageId.message}</p>}
      </div>

      <div>
        <label className={labelClass}>מכל *</label>
        <input className={inputClass} {...register("tank")} />
        {errors.tank && <p className="text-red-600 text-xs mt-1">{errors.tank.message}</p>}
      </div>

      <div>
        <label className={labelClass}>כמות שנבצרה (ק&quot;ג) *</label>
        <input type="number" className={inputClass} {...register("harvestedWeightKg")} />
        {errors.harvestedWeightKg && (
          <p className="text-red-600 text-xs mt-1">{errors.harvestedWeightKg.message}</p>
        )}
      </div>

      <div>
        <label className={labelClass}>כמות בליטרים אחרי פראס</label>
        <input type="number" className={inputClass} {...register("litersAfterPressing")} />
      </div>

      <div>
        <label className={labelClass}>כמות בליטרים אחרי שפייה ראשונה</label>
        <input type="number" className={inputClass} {...register("litersAfterFirstRacking")} />
      </div>

      <div>
        <label className={labelClass}>כמות בליטרים אחרי שפייה שנייה</label>
        <input type="number" className={inputClass} {...register("litersAfterSecondRacking")} />
      </div>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-wine text-white px-8 py-2.5 rounded-lg hover:bg-wine-dark transition-colors font-medium disabled:opacity-50"
        >
          {isSubmitting ? "שומר..." : editingWine ? "שמור שינויים" : "צור רשומה"}
        </button>
      </div>
    </form>
  )
}
