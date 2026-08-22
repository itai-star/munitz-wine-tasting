import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ReadingForm } from "@/components/fermentation/reading-form"
import { FermentationCharts } from "@/components/fermentation/fermentation-charts"
import { BatchStatusControl } from "@/components/fermentation/batch-status-control"

export const dynamic = "force-dynamic"

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const batch = await prisma.fermentationBatch.findUnique({
    where: { id },
    include: { blocks: { include: { block: true } } },
  })
  if (!batch) notFound()

  const readings = await prisma.fermentationReading.findMany({
    where: { batchId: id },
    orderBy: { readingDate: "asc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{batch.tankName}</h1>
          <p className="text-sm text-stone-500 mt-1">
            {batch.blocks.map((b) => b.block.name).join(", ")}
            {batch.volumeLiters != null && ` · ${batch.volumeLiters} ליטר`}
            {batch.yeastStrain && ` · ${batch.yeastStrain}`}
          </p>
        </div>
        <BatchStatusControl batchId={batch.id} status={batch.status} />
      </div>

      <ReadingForm batchId={batch.id} />

      <FermentationCharts
        readings={readings.map((r) => ({
          readingDate: r.readingDate,
          brix: r.brix,
          specificGravity: r.specificGravity,
          temperatureCelsius: r.temperatureCelsius,
          ph: r.ph,
          tankName: batch.tankName,
        }))}
      />

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-stone-500 text-right">
              <th className="px-4 py-2 font-medium">תאריך</th>
              <th className="px-4 py-2 font-medium">בומה</th>
              <th className="px-4 py-2 font-medium">SG</th>
              <th className="px-4 py-2 font-medium">טמפ&apos;</th>
              <th className="px-4 py-2 font-medium">PH</th>
              <th className="px-4 py-2 font-medium">הערות</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((r) => (
              <tr key={r.id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-2">
                  {new Date(r.readingDate).toLocaleDateString("he-IL")}
                </td>
                <td className="px-4 py-2">{r.brix ?? "—"}</td>
                <td className="px-4 py-2">{r.specificGravity ?? "—"}</td>
                <td className="px-4 py-2">{r.temperatureCelsius ?? "—"}</td>
                <td className="px-4 py-2">{r.ph ?? "—"}</td>
                <td className="px-4 py-2 text-stone-500">
                  {[r.yeastAdditions, r.cellarWork, r.so2Addition, r.tasteAromaNotes]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>
              </tr>
            ))}
            {readings.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-stone-400">
                  אין עדיין קריאות למיכל זה
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
