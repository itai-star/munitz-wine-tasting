"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { createSample, updateSample } from "@/server/actions/sample-actions"

const FormSchema = z.object({
  blockId: z.string().min(1, "יש לבחור כרם"),
  sampleDate: z.string().min(1, "יש לבחור תאריך"),
  brix: z.string(),
  ph: z.string(),
  titratableAcidity: z.string(),
  clusterWeight: z.string(),
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

export type EditableSample = {
  id: string
  blockId: string
  sampleDate: string | Date
  brix: number | null
  ph: number | null
  titratableAcidity: number | null
  clusterWeight: number | null
  color: string | null
}

function numberToText(value: number | null): string {
  return value == null ? "" : String(value)
}

export function SampleForm({
  vintageId,
  blocks,
  editingSample,
  onDone,
}: {
  vintageId: string
  blocks: { id: string; name: string }[]
  editingSample?: EditableSample
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
    defaultValues: editingSample
      ? {
          blockId: editingSample.blockId,
          sampleDate: new Date(editingSample.sampleDate).toISOString().slice(0, 10),
          brix: numberToText(editingSample.brix),
          ph: numberToText(editingSample.ph),
          titratableAcidity: numberToText(editingSample.titratableAcidity),
          clusterWeight: numberToText(editingSample.clusterWeight),
          color: editingSample.color ?? "",
        }
      : {
          blockId: blocks[0]?.id ?? "",
          sampleDate: new Date().toISOString().slice(0, 10),
          brix: "",
          ph: "",
          titratableAcidity: "",
          clusterWeight: "",
          color: "",
        },
  })

  async function onSubmit(values: FormValues) {
    setServerError("")
    const fields = {
      blockId: values.blockId,
      sampleDate: new Date(values.sampleDate),
      brix: toNullableNumber(values.brix),
      ph: toNullableNumber(values.ph),
      titratableAcidity: toNullableNumber(values.titratableAcidity),
      clusterWeight: toNullableNumber(values.clusterWeight),
      color: toNullableText(values.color),
    }
    const result = editingSample
      ? await updateSample({ id: editingSample.id, ...fields })
      : await createSample({ vintageId, ...fields })
    if (result.success) {
      if (editingSample) {
        onDone?.()
      } else {
        reset({ ...values, brix: "", ph: "", titratableAcidity: "", clusterWeight: "", color: "" })
      }
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>משקל אשכול (גרם)</label>
          <input
            type="number"
            step="1"
            inputMode="numeric"
            className={inputClass}
            {...register("clusterWeight")}
          />
        </div>
        <div>
          <label className={labelClass}>צבע</label>
          <input className={inputClass} {...register("color")} />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting || blocks.length === 0}
          className="flex-1 bg-wine text-white px-6 py-3 rounded-lg hover:bg-wine-dark transition-colors font-medium disabled:opacity-50"
        >
          {isSubmitting ? "שומר..." : editingSample ? "שמור שינויים" : "שמור דגימה"}
        </button>
        {editingSample && (
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
