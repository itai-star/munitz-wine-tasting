"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { createBatch } from "@/server/actions/fermentation-actions"

const FormSchema = z.object({
  tankName: z.string().min(1, "יש להזין שם/מספר מיכל"),
  volumeLiters: z.string(),
  yeastStrain: z.string(),
  startDate: z.string().min(1, "יש לבחור תאריך התחלה"),
  notes: z.string(),
  blockIds: z.array(z.string().min(1)).min(1, "יש לבחור לפחות בלוק אחד"),
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

export function BatchForm({
  vintageId,
  blocks,
}: {
  vintageId: string
  blocks: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState("")
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      tankName: "",
      volumeLiters: "",
      yeastStrain: "",
      startDate: new Date().toISOString().slice(0, 10),
      notes: "",
      blockIds: [],
    },
  })

  async function onSubmit(values: FormValues) {
    setServerError("")
    const result = await createBatch({
      vintageId,
      tankName: values.tankName,
      volumeLiters: toNullableNumber(values.volumeLiters),
      yeastStrain: toNullableText(values.yeastStrain),
      startDate: new Date(values.startDate),
      notes: toNullableText(values.notes),
      blockIds: values.blockIds,
    })
    if (result.success) {
      router.push("/admin/fermentation")
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
        <label className={labelClass}>שם/מספר מיכל *</label>
        <input className={inputClass} {...register("tankName")} />
        {errors.tankName && <p className="text-red-600 text-xs mt-1">{errors.tankName.message}</p>}
      </div>

      <div>
        <label className={labelClass}>תאריך התחלה *</label>
        <input type="date" className={inputClass} {...register("startDate")} />
        {errors.startDate && <p className="text-red-600 text-xs mt-1">{errors.startDate.message}</p>}
      </div>

      <div>
        <label className={labelClass}>נפח (ליטר)</label>
        <input type="number" className={inputClass} {...register("volumeLiters")} />
      </div>

      <div>
        <label className={labelClass}>זן שמרים (מוזרע/ספונטני)</label>
        <input className={inputClass} {...register("yeastStrain")} />
      </div>

      <div className="sm:col-span-2">
        <label className={labelClass}>בלוקי כרם שהענבים הגיעו מהם *</label>
        <div className="grid gap-2 sm:grid-cols-2 max-h-48 overflow-y-auto border border-stone-200 rounded-lg p-3">
          {blocks.map((block) => (
            <label key={block.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                value={block.id}
                {...register("blockIds")}
                className="accent-wine w-4 h-4"
              />
              {block.name}
            </label>
          ))}
        </div>
        {errors.blockIds && <p className="text-red-600 text-xs mt-1">{errors.blockIds.message}</p>}
      </div>

      <div className="sm:col-span-2">
        <label className={labelClass}>הערות</label>
        <textarea className={inputClass} rows={2} {...register("notes")} />
      </div>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={isSubmitting || blocks.length === 0}
          className="bg-wine text-white px-8 py-2.5 rounded-lg hover:bg-wine-dark transition-colors font-medium disabled:opacity-50"
        >
          {isSubmitting ? "יוצר..." : "צור מיכל"}
        </button>
      </div>
    </form>
  )
}
