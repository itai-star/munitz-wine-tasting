"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { createSample } from "@/server/actions/sample-actions"

const FormSchema = z.object({
  blockId: z.string().min(1, "יש לבחור כרם"),
  sampleDate: z.string().min(1, "יש לבחור תאריך"),
  brix: z.string(),
  ph: z.string(),
  titratableAcidity: z.string(),
  color: z.string(),
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

export function SampleForm({
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
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      blockId: blocks[0]?.id ?? "",
      sampleDate: new Date().toISOString().slice(0, 10),
      brix: "",
      ph: "",
      titratableAcidity: "",
      color: "",
    },
  })

  async function onSubmit(values: FormValues) {
    setServerError("")
    const result = await createSample({
      vintageId,
      blockId: values.blockId,
      sampleDate: new Date(values.sampleDate),
      brix: toNullableNumber(values.brix),
      ph: toNullableNumber(values.ph),
      titratableAcidity: toNullableNumber(values.titratableAcidity),
      color: toNullableText(values.color),
    })
    if (result.success) {
      reset({ ...values, brix: "", ph: "", titratableAcidity: "", color: "" })
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>תאריך</label>
          <input type="date" className={inputClass} {...register("sampleDate")} />
        </div>
        <div>
          <label className={labelClass}>כרם</label>
          <select className={inputClass} {...register("blockId")}>
            {blocks.map((block) => (
              <option key={block.id} value={block.id}>
                {block.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {errors.blockId && <p className="text-red-600 text-xs">{errors.blockId.message}</p>}
      {errors.sampleDate && <p className="text-red-600 text-xs">{errors.sampleDate.message}</p>}

      <div className="grid grid-cols-3 gap-3">
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
          <label className={labelClass}>PH</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            className={inputClass}
            {...register("ph")}
          />
        </div>
        <div>
          <label className={labelClass}>חמיצות</label>
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            className={inputClass}
            {...register("titratableAcidity")}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>צבע</label>
        <input className={inputClass} {...register("color")} />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || blocks.length === 0}
        className="w-full bg-wine text-white px-6 py-3 rounded-lg hover:bg-wine-dark transition-colors font-medium disabled:opacity-50"
      >
        {isSubmitting ? "שומר..." : "שמור דגימה"}
      </button>
    </form>
  )
}
