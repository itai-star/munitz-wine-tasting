"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { createLabTest, updateLabTest } from "@/server/actions/lab-test-actions"
import {
  LabTestFieldInputs,
  LabTestFormSchema,
  emptyLabValues,
  labTestToValues,
  labValuesToFields,
} from "@/components/lab-test/lab-test-fields"
import type { EditableLabTest, LabTestFormValues } from "@/components/lab-test/lab-test-fields"

export type { EditableLabTest }

export function LabTestForm({
  finishedWineId,
  editingTest,
  onDone,
}: {
  finishedWineId: string
  editingTest?: EditableLabTest
  onDone?: () => void
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState("")
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LabTestFormValues>({
    resolver: zodResolver(LabTestFormSchema),
    defaultValues: editingTest ? labTestToValues(editingTest) : emptyLabValues(),
  })

  async function onSubmit(values: LabTestFormValues) {
    setServerError("")
    const fields = labValuesToFields(values)
    const result = editingTest
      ? await updateLabTest({ id: editingTest.id, ...fields })
      : await createLabTest({ finishedWineId, ...fields })
    if (result.success) {
      if (editingTest) {
        onDone?.()
      } else {
        reset(emptyLabValues(values.testDate))
      }
      router.refresh()
    } else {
      setServerError(result.error.message)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 space-y-4"
    >
      {serverError && (
        <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{serverError}</p>
      )}

      <LabTestFieldInputs register={register} errors={errors} />

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-wine text-white px-6 py-3 rounded-lg hover:bg-wine-dark transition-colors font-medium disabled:opacity-50"
        >
          {isSubmitting ? "שומר..." : editingTest ? "שמור שינויים" : "שמור בדיקת מעבדה"}
        </button>
        {editingTest && (
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
