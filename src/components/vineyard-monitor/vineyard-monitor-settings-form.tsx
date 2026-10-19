"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { saveVineyardMonitorSettings } from "@/server/actions/vineyard-monitor-actions"

const FormSchema = z.object({
  applicationKey: z.string().trim().min(1, "יש להזין Application Key"),
  apiKey: z.string().trim().min(1, "יש להזין API Key"),
  mac: z.string().trim().min(1, "יש להזין כתובת MAC של המכשיר"),
})
type FormValues = z.infer<typeof FormSchema>

export function VineyardMonitorSettingsForm({
  defaultMac,
  onSaved,
}: {
  defaultMac?: string
  onSaved?: () => void
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState("")
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { applicationKey: "", apiKey: "", mac: defaultMac ?? "" },
  })

  async function onSubmit(values: FormValues) {
    setServerError("")
    const result = await saveVineyardMonitorSettings(values)
    if (result.success) {
      onSaved?.()
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
        <label className={labelClass}>Application Key *</label>
        <input
          type="password"
          className={inputClass}
          autoComplete="off"
          dir="ltr"
          {...register("applicationKey")}
        />
        {errors.applicationKey && (
          <p className="text-red-600 text-xs mt-1">{errors.applicationKey.message}</p>
        )}
      </div>

      <div>
        <label className={labelClass}>API Key *</label>
        <input
          type="password"
          className={inputClass}
          autoComplete="off"
          dir="ltr"
          {...register("apiKey")}
        />
        {errors.apiKey && <p className="text-red-600 text-xs mt-1">{errors.apiKey.message}</p>}
      </div>

      <div className="sm:col-span-2">
        <label className={labelClass}>כתובת MAC של המכשיר *</label>
        <input
          className={inputClass}
          placeholder="AA:BB:CC:DD:EE:FF"
          autoComplete="off"
          dir="ltr"
          {...register("mac")}
        />
        {errors.mac && <p className="text-red-600 text-xs mt-1">{errors.mac.message}</p>}
      </div>

      <p className="sm:col-span-2 text-xs text-stone-400">
        המפתחות נוצרים באתר ecowitt.net בעמוד הפרופיל, תחת API. הם נשמרים מוצפנים במסד הנתונים
        ולא נחשפים בקוד או בממשק.
      </p>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-wine text-white px-8 py-2.5 rounded-lg hover:bg-wine-dark transition-colors font-medium disabled:opacity-50"
        >
          {isSubmitting ? "שומר..." : "שמור והתחבר"}
        </button>
      </div>
    </form>
  )
}
