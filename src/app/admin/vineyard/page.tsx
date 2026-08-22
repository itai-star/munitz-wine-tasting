import Link from "next/link"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function VineyardPage() {
  const blocks = await prisma.vineyardBlock.findMany({
    orderBy: { name: "asc" },
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-stone-800">כרם</h1>
        <div className="flex gap-3">
          <Link
            href="/admin/vineyard/samples"
            className="text-sm text-wine underline self-center"
          >
            דגימות הבשלה
          </Link>
          <Link
            href="/admin/vineyard/new"
            className="bg-wine text-white px-4 py-2 rounded-lg hover:bg-wine-dark transition-colors text-sm font-medium"
          >
            + בלוק חדש
          </Link>
        </div>
      </div>

      {blocks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-stone-200">
          <p className="text-stone-500 text-lg">אין עדיין בלוקי כרם במערכת</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {blocks.map((block) => (
            <Link
              key={block.id}
              href={`/admin/vineyard/${block.id}`}
              className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 hover:border-wine/40 transition-colors"
            >
              <p className="font-medium text-stone-800">{block.name}</p>
              <p className="text-sm text-stone-500">{block.variety}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
