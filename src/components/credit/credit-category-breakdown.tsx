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
      <ul className="space-y-1.5">
        {visible.map((category) => {
          const share = (category.totalAgorot / totalAgorot) * 100
          return (
            <li key={category.label} className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-sm">
              <span className="text-stone-700 truncate" title={category.label}>
                {category.label}
              </span>
              <span className="h-3 rounded bg-stone-100 overflow-hidden" aria-hidden="true">
                <span
                  className="block h-full rounded bg-wine"
                  style={{ width: `${Math.max(share, 1.5)}%` }}
                />
              </span>
              <span className="text-stone-600 whitespace-nowrap text-left">
                <bdi>{formatShekels(category.totalAgorot)}</bdi>{" "}
                <span className="text-xs text-stone-400">
                  (<bdi>{share.toFixed(0)}%</bdi> · <bdi>{category.count}</bdi> עסקאות)
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
