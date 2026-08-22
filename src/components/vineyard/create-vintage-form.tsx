"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { createVintage } from "@/server/actions/vintage-actions"

const FormSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  label: z.string().min(1, "יש להזין תווית לעונה"),
})
type FormValues = z.infer<typeof FormSchema>

export function CreateVintageForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState("")
  const currentYear = new Date().getFullYear()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { year: currentYear, label: `בציר ${currentYear}` },
  })

  async function onSubmit(values: FormValues) {
    setServerError("")
    const result = await createVintage(values)
    if (result.success) {
      router.push(`?vintage=${values.year}`)
      router.refresh()
    } else {
      setServerError(result.error.message)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-wrap items-end gap-3 bg-white rounded-xl border border-stone-200 p-4"
    >
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">שנה</label>
        <input
          type="number"
          {...register("year")}
          className="w-24 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
        />
        {errors.year && <p className="text-red-600 text-xs mt-1">{errors.year.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">תווית</label>
        <input
          type="text"
          {...register("label")}
          className="w-48 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
        />
        {errors.label && <p className="text-red-600 text-xs mt-1">{errors.label.message}</p>}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-wine text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-wine-dark transition-colors disabled:opacity-50"
      >
        {isSubmitting ? "יוצר..." : "צור עונה"}
      </button>
      {serverError && <p className="text-red-600 text-sm w-full">{serverError}</p>}
    </form>
  )
}
