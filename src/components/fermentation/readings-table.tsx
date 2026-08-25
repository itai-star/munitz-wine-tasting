import type { FermentationReading } from "@prisma/client"

export function ReadingsTable({
  readings,
  onEdit,
}: {
  readings: FermentationReading[]
  onEdit: (reading: FermentationReading) => void
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-stone-500 text-right">
            <th className="px-4 py-2 font-medium"></th>
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
                <button
                  type="button"
                  onClick={() => onEdit(r)}
                  className="inline-flex items-center gap-1 rounded-lg border border-wine/30 text-wine hover:bg-wine hover:text-white hover:border-wine transition-colors px-2 py-1 text-xs font-medium"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                  עריכה
                </button>
              </td>
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
              <td colSpan={7} className="px-4 py-6 text-center text-stone-400">
                אין עדיין קריאות למיכל זה
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
