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
            <th className="px-4 py-2 font-medium">תאריך</th>
            <th className="px-4 py-2 font-medium">בומה</th>
            <th className="px-4 py-2 font-medium">SG</th>
            <th className="px-4 py-2 font-medium">טמפ&apos;</th>
            <th className="px-4 py-2 font-medium">PH</th>
            <th className="px-4 py-2 font-medium">הערות</th>
            <th className="px-4 py-2 font-medium"></th>
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
              <td className="px-4 py-2">
                <button
                  type="button"
                  onClick={() => onEdit(r)}
                  className="text-wine hover:text-wine-dark text-xs font-medium"
                >
                  עריכה
                </button>
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
