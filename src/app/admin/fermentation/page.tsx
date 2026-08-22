import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { CreateVintageForm } from "@/components/vineyard/create-vintage-form"
import { VintageSelect } from "@/components/vineyard/vintage-select"

export const dynamic = "force-dynamic"

export default async function FermentationPage({
  searchParams,
}: {
  searchParams: Promise<{ vintage?: string }>
}) {
  const { vintage: vintageParam } = await searchParams
  const vintages = await prisma.vintage.findMany({ orderBy: { year: "desc" } })

  if (vintages.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-stone-800 mb-6">תסיסה</h1>
        <p className="text-stone-500 mb-4">
          יש ליצור עונה/בציר ראשון לפני פתיחת מיכלי תסיסה.
        </p>
        <CreateVintageForm />
      </div>
    )
  }

  const selectedVintage =
    vintages.find((v) => v.year === Number(vintageParam)) ?? vintages[0]

  const batches = await prisma.fermentationBatch.findMany({
    where: { vintageId: selectedVintage.id },
    include: { blocks: { include: { block: true } }, readings: { orderBy: { readingDate: "desc" }, take: 1 } },
    orderBy: { startDate: "desc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-stone-800">מיכלים — {selectedVintage.label}</h1>
        <div className="flex gap-4 items-center flex-wrap">
          <VintageSelect
            vintages={vintages.map((v) => ({ year: v.year, label: v.label }))}
            selectedYear={selectedVintage.year}
          />
          <Link
            href="/admin/fermentation/new"
            className="bg-wine text-white px-4 py-2 rounded-lg hover:bg-wine-dark transition-colors text-sm font-medium"
          >
            + מיכל חדש
          </Link>
        </div>
      </div>

      {batches.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-stone-200">
          <p className="text-stone-500 text-lg">אין עדיין מיכלי תסיסה לעונה זו</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((batch) => {
            const lastReading = batch.readings[0]
            return (
              <Link
                key={batch.id}
                href={`/admin/fermentation/${batch.id}`}
                className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 hover:border-wine/40 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <p className="font-medium text-stone-800">{batch.tankName}</p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      batch.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-stone-100 text-stone-500"
                    }`}
                  >
                    {batch.status === "active" ? "פעיל" : "הסתיים"}
                  </span>
                </div>
                <p className="text-sm text-stone-500 mt-1">
                  {batch.blocks.map((b) => b.block.name).join(", ")}
                </p>
                {lastReading && (
                  <p className="text-xs text-stone-400 mt-2">
                    קריאה אחרונה: {new Date(lastReading.readingDate).toLocaleDateString("he-IL")}
                    {lastReading.brix != null && ` · בומה ${lastReading.brix}`}
                    {lastReading.specificGravity != null && ` · SG ${lastReading.specificGravity}`}
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
