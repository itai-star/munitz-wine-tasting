import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { TastingFlow } from "@/components/tasting/tasting-flow"

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ id: string }>
}

export default async function TastingPage({ params }: Props) {
  const { id } = await params
  const session = await prisma.tastingSession.findUnique({
    where: { id },
    include: {
      wines: {
        include: { wine: true },
        orderBy: { order: "asc" },
      },
    },
  })

  if (!session) notFound()

  if (!session.isActive) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-800 mb-2">
            הטעימה אינה פעילה
          </h1>
          <p className="text-stone-500">הטעימה הזו נסגרה על ידי המנהל</p>
        </div>
      </main>
    )
  }

  const wines = session.wines.map((sw) => ({
    sessionWineId: sw.id,
    name: sw.wine.name,
    year: sw.wine.year,
    type: sw.wine.type,
    description: sw.wine.description,
    imageUrl: sw.wine.imageUrl,
    price: sw.wine.price,
  }))

  return (
    <TastingFlow
      sessionId={session.id}
      sessionName={session.name}
      wines={wines}
    />
  )
}
