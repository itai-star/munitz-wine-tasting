"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { addReading } from "@/server/actions/fermentation-actions"

const FormSchema = z.object({
  readingDate: z.string().min(1, "יש לבחור תאריך"),
  brix: z.string(),
  specificGravity: z.string(),
  temperatureCelsius: z.string(),
  ph: z.string(),
  yeastAdditions: z.string(),
  cellarWork: z.string(),
  so2Addition: z.string(),
  tasteAromaNotes: z.string(),
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
  readingDate: new Date().toISOString().slice(0, 10),
  brix: "",
  specificGravity: "",
  temperatureCelsius: "",
  ph: "",
  yeastAdditions: "",
  cellarWork: "",
  so2Addition: "",
  tasteAromaNotes: "",
}

export function ReadingForm({ batchId }: { batchId: string }) {
  const router = useRouter()
  const [serverError, setServerError] = useState("")
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: emptyValues,
  })

  async function onSubmit(values: FormValues) {
    setServerError("")
    const result = await addReading({
      batchId,
      readingDate: new Date(values.readingDate),
      brix: toNullableNumber(values.brix),
      specificGravity: toNullableNumber(values.specificGravity),
      temperatureCelsius: toNullableNumber(values.temperatureCelsius),
      ph: toNullableNumber(values.ph),
      yeastAdditions: toNullableText(values.yeastAdditions),
      cellarWork: toNullableText(values.cellarWork),
      so2Addition: toNullableText(values.so2Addition),
      tasteAromaNotes: toNullableText(values.tasteAromaNotes),
    })
    if (result.success) {
      reset({ ...emptyValues, readingDate: values.readingDate })
      router.refresh()
    } else {
      setServerError(result.error.message)
    }
  }

  const inputClass =
    "w-full border border-stone-300 rounded-lg px-3 py-3 text-base focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
  const labelClass = "block text-sm font-medium text-stone-700 mb-1"

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 space-y-4"
    >
      {serverError && (
        <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{serverError}</p>
      )}

      <div>
        <label className={labelClass}>תאריך</label>
        <input type="date" className={inputClass} {...register("readingDate")} />
        {errors.readingDate && (
          <p className="text-red-600 text-xs mt-1">{errors.readingDate.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>בומה</label>
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            className={inputClass}
            {...register("brix")}
          />
        </div>
        <div>
          <label className={labelClass}>צפיפות (SG)</label>
          <input
            type="number"
            step="0.001"
            inputMode="decimal"
            className={inputClass}
            {...register("specificGravity")}
          />
        </div>
        <div>
          <label className={labelClass}>טמפרטורה (°C)</label>
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            className={inputClass}
            {...register("temperatureCelsius")}
          />
        </div>
        <div>
          <label className={labelClass}>PH</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            className={inputClass}
            {...register("ph")}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>תוספי שמרים (DAP/נוטריינטים)</label>
        <input className={inputClass} {...register("yeastAdditions")} />
      </div>

      <div>
        <label className={labelClass}>עבודת מרתף (Punch down / Pump over)</label>
        <input className={inputClass} {...register("cellarWork")} />
      </div>

      <div>
        <label className={labelClass}>תוספת SO2</label>
        <input className={inputClass} {...register("so2Addition")} />
      </div>

      <div>
        <label className={labelClass}>הערות ריח/טעם</label>
        <textarea className={inputClass} rows={2} {...register("tasteAromaNotes")} />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-wine text-white px-6 py-3 rounded-lg hover:bg-wine-dark transition-colors font-medium disabled:opacity-50"
      >
        {isSubmitting ? "שומר..." : "שמור קריאה יומית"}
      </button>
    </form>
  )
}
