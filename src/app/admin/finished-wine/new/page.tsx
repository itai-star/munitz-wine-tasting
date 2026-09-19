import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { FinishedWineForm } from "@/components/finished-wine/finished-wine-form"

export const dynamic = "force-dynamic"

export default async function NewFinishedWinePage({
  searchParams,
}: {
  searchParams: Promise<{ vintage?: string }>
}) {
  const { vintage: vintageParam } = await searchParams
  const [vintages, blocks] = await Promise.all([
    prisma.vintage.findMany({ orderBy: { year: "desc" } }),
    prisma.vineyardBlock.findMany({ orderBy: { name: "asc" } }),
  ])
  if (vintages.length === 0) redirect("/admin/finished-wine")

  const selectedVintage =
    vintages.find((v) => v.year === Number(vintageParam)) ?? vintages[0]

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">
        רשומת יין מוכן חדשה — {selectedVintage.label}
      </h1>
      <FinishedWineForm
        vintageId={selectedVintage.id}
        vintages={vintages.map((v) => ({ id: v.id, label: v.label }))}
        blocks={blocks.map((b) => ({ id: b.id, name: b.name }))}
      />
    </div>
  )
}
