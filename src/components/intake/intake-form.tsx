"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { createIntake } from "@/server/actions/intake-actions"

const FormSchema = z.object({
  blockId: z.string().min(1, "יש לבחור כרם"),
  intakeDate: z.string().min(1, "יש לבחור תאריך"),
  totalWeightKg: z.string().min(1, "יש להזין משקל"),
  binCount: z.string().min(1, "יש להזין כמות משטחים"),
  notes: z.string(),
})
type FormValues = z.infer<typeof FormSchema>

function toNullableText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function IntakeForm({
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
      intakeDate: new Date().toISOString().slice(0, 10),
      totalWeightKg: "",
      binCount: "",
      notes: "",
    },
  })

  async function onSubmit(values: FormValues) {
    setServerError("")
    const result = await createIntake({
      vintageId,
      blockId: values.blockId,
      intakeDate: new Date(values.intakeDate),
      totalWeightKg: Number(values.totalWeightKg),
      binCount: parseInt(values.binCount),
      notes: toNullableText(values.notes),
    })
    if (result.success) {
      reset({ ...values, totalWeightKg: "", binCount: "", notes: "" })
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
          <input type="date" className={inputClass} {...register("intakeDate")} />
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
      {errors.intakeDate && <p className="text-red-600 text-xs">{errors.intakeDate.message}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>משקל כולל (ק&quot;ג)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            inputMode="decimal"
            className={inputClass}
            {...register("totalWeightKg")}
          />
          {errors.totalWeightKg && (
            <p className="text-red-600 text-xs mt-1">{errors.totalWeightKg.message}</p>
          )}
        </div>
        <div>
          <label className={labelClass}>כמות משטחים</label>
          <input
            type="number"
            step="1"
            min="0"
            inputMode="numeric"
            className={inputClass}
            {...register("binCount")}
          />
          {errors.binCount && (
            <p className="text-red-600 text-xs mt-1">{errors.binCount.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className={labelClass}>הערות</label>
        <textarea className={inputClass} rows={2} {...register("notes")} />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || blocks.length === 0}
        className="w-full bg-wine text-white px-6 py-3 rounded-lg hover:bg-wine-dark transition-colors font-medium disabled:opacity-50"
      >
        {isSubmitting ? "שומר..." : "שמור קליטה"}
      </button>
    </form>
  )
}
