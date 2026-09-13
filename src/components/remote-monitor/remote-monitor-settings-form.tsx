"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { saveRemoteMonitorSettings } from "@/server/actions/remote-monitor-actions"

const FormSchema = z.object({
  host: z.string().trim().min(1, "יש להזין כתובת בקר"),
  username: z.string().trim().min(1, "יש להזין שם משתמש"),
  password: z.string().min(1, "יש להזין סיסמה"),
})
type FormValues = z.infer<typeof FormSchema>

export function RemoteMonitorSettingsForm({
  defaultHost,
  defaultUsername,
  onSaved,
}: {
  defaultHost?: string
  defaultUsername?: string
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
    defaultValues: {
      host: defaultHost ?? "2.55.77.102",
      username: defaultUsername ?? "",
      password: "",
    },
  })

  async function onSubmit(values: FormValues) {
    setServerError("")
    const result = await saveRemoteMonitorSettings(values)
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

      <div className="sm:col-span-2">
        <label className={labelClass}>כתובת הבקר *</label>
        <input className={inputClass} placeholder="2.55.77.102" {...register("host")} />
        {errors.host && <p className="text-red-600 text-xs mt-1">{errors.host.message}</p>}
      </div>

      <div>
        <label className={labelClass}>שם משתמש *</label>
        <input className={inputClass} autoComplete="username" {...register("username")} />
        {errors.username && <p className="text-red-600 text-xs mt-1">{errors.username.message}</p>}
      </div>

      <div>
        <label className={labelClass}>סיסמה *</label>
        <input
          type="password"
          className={inputClass}
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>}
      </div>

      <p className="sm:col-span-2 text-xs text-stone-400">
        פרטי ההתחברות נשמרים מוצפנים במסד הנתונים של האפליקציה, ולא נחשפים בקוד.
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
