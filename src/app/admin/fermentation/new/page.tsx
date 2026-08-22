import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { BatchForm } from "@/components/fermentation/batch-form"

export const dynamic = "force-dynamic"

export default async function NewBatchPage({
  searchParams,
}: {
  searchParams: Promise<{ vintage?: string }>
}) {
  const { vintage: vintageParam } = await searchParams
  const vintages = await prisma.vintage.findMany({ orderBy: { year: "desc" } })
  if (vintages.length === 0) redirect("/admin/fermentation")

  const selectedVintage =
    vintages.find((v) => v.year === Number(vintageParam)) ?? vintages[0]

  const blocks = await prisma.vineyardBlock.findMany({ orderBy: { name: "asc" } })

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">
        מיכל תסיסה חדש — {selectedVintage.label}
      </h1>
      {blocks.length === 0 ? (
        <p className="text-stone-500">יש להוסיף בלוקי כרם לפני פתיחת מיכל.</p>
      ) : (
        <BatchForm vintageId={selectedVintage.id} blocks={blocks} />
      )}
    </div>
  )
}
