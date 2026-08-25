"use client"

import { useState } from "react"
import type { FermentationReading } from "@prisma/client"
import { ReadingForm } from "@/components/fermentation/reading-form"
import { ReadingsTable } from "@/components/fermentation/readings-table"

export function FermentationLog({
  batchId,
  readings,
}: {
  batchId: string
  readings: FermentationReading[]
}) {
  const [editingReading, setEditingReading] = useState<FermentationReading | null>(null)

  return (
    <div className="space-y-6">
      <ReadingForm
        batchId={batchId}
        editingReading={editingReading}
        onDone={() => setEditingReading(null)}
      />
      <ReadingsTable readings={readings} onEdit={setEditingReading} />
    </div>
  )
}
