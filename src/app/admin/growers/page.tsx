import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { formatShekels } from "@/lib/credit"
import { GrowerCard } from "@/components/growers/grower-card"
import { GrowerCreateForm } from "@/components/growers/grower-create-form"
import { listGrowers } from "@/server/actions/grower-actions"

export const dynamic = "force-dynamic"

export default async function GrowersPage() {
  const [growers, unassigned] = await Promise.all([
    listGrowers(),
    prisma.vineyardBlock.findMany({
      where: { growerId: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, variety: true, pricePerKgAgorot: true },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-stone-900">כורמים</h1>
        <p className="text-base text-stone-600 mt-1">
          הרשימה של הכורמים שמהם קונים ענבים. כל בלוק משויך לכורם ולמחיר לקילו בטאב &quot;נתונים כספיים&quot; של הבלוק.
        </p>
      </div>

      <GrowerCreateForm />

      {growers.success ? (
        <section className="space-y-3" aria-label="הכורמים">
          {growers.data.length === 0 && <p className="text-stone-500">עדיין אין כורמים ברשימה.</p>}
          {growers.data.map((grower) => (
            <GrowerCard key={grower.id} grower={grower} />
          ))}
        </section>
      ) : (
        <p className="text-red-600">{growers.error.message}</p>
      )}

      {unassigned.length > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-2" aria-label="בלוקים בלי כורם">
          <h2 className="text-lg font-extrabold text-amber-900">בלוקים בלי כורם ({unassigned.length})</h2>
          <ul className="divide-y divide-amber-200">
            {unassigned.map((block) => (
              <li key={block.id}>
                <Link
                  href={`/admin/vineyard/${block.id}?tab=finance`}
                  className="flex items-baseline justify-between gap-3 py-2.5 hover:text-wine"
                >
                  <span className="text-base font-bold text-stone-900">
                    {block.name} <span className="font-medium text-stone-600">· {block.variety}</span>
                  </span>
                  <span className="text-sm font-semibold text-amber-900 whitespace-nowrap">
                    {block.pricePerKgAgorot === null ? "אין מחיר" : <bdi>{formatShekels(block.pricePerKgAgorot)} לק״ג</bdi>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
