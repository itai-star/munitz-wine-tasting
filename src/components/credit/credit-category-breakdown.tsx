import { formatShekels } from "@/lib/credit"
import type { CategoryBreakdownRow } from "@/server/credit-data"

export function CreditCategoryBreakdown({
  categories,
  totalAgorot,
}: {
  categories: CategoryBreakdownRow[]
  totalAgorot: number
}) {
  const visible = categories.filter((category) => category.totalAgorot > 0)
  if (visible.length === 0 || totalAgorot <= 0) return null

  return (
    <div className="mb-5">
      <h3 className="text-sm font-medium text-stone-700 mb-2">פילוח לפי קטגוריה</h3>
      <ul className="space-y-2.5">
        {visible.map((category) => {
          const share = (category.totalAgorot / totalAgorot) * 100
          return (
            <li key={category.label}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-stone-700 break-words min-w-0">{category.label}</span>
                <span className="text-stone-700 whitespace-nowrap">
                  <bdi>{formatShekels(category.totalAgorot)}</bdi>{" "}
                  <span className="text-xs text-stone-400">
                    (<bdi>{share.toFixed(0)}%</bdi> · <bdi>{category.count}</bdi>)
                  </span>
                </span>
              </div>
              <span className="mt-1 block h-2.5 rounded bg-stone-100 overflow-hidden" aria-hidden="true">
                <span
                  className="block h-full rounded bg-wine"
                  style={{ width: `${Math.max(share, 1.5)}%` }}
                />
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
