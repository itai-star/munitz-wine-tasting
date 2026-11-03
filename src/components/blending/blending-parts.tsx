import { BARREL_LITERS } from "@/lib/barrel-plan"
import type { WinePart } from "@/lib/barrel-wine"
import type { VarietyShare } from "@/lib/blending"

const NEUTRAL = "#a8a29e"

// The varieties of a barrel with their shares, as a colour that is striped when the wine is a blend.
export function stripesOf(parts: WinePart[], colors: Map<string, string>): string {
  const shares = new Map<string, number>()
  for (const part of parts) shares.set(part.variety, (shares.get(part.variety) ?? 0) + part.percent)
  const entries = Array.from(shares, ([variety, percent]) => ({ color: colors.get(variety) ?? NEUTRAL, percent }))
  if (entries.length <= 1) return entries[0]?.color ?? NEUTRAL

  let from = 0
  const stops = entries.map((entry) => {
    const to = from + entry.percent
    const stop = `${entry.color} ${from}% ${to}%`
    from = to
    return stop
  })
  return `linear-gradient(90deg, ${stops.join(", ")})`
}

// Marks a barrel that has no lab test in its year, so the alcohol and the pH of a wine cannot count it.
export function NoLabMark({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[11px] font-extrabold leading-none text-stone-900 ring-1 ring-amber-700/50 ${className ?? ""}`}
      title="אין בדיקות מעבדה לחבית הזו, ולכן היא לא נספרת בחישוב האלכוהול וה-pH"
      role="img"
      aria-label="אין בדיקות מעבדה לחבית"
    >
      !
    </span>
  )
}

// A barrel drawn in plain CSS. The colour inside rises to the share of the 225 liters that is still in the barrel, so a barrel
// that gave part of its wine away shows lower. The number is under it, and a score, when there is one, on its corner.
export function BarrelGlyph({
  number,
  remaining,
  parts,
  colors,
  score,
  selected,
  noLab,
}: {
  number: string
  remaining: number
  parts: WinePart[]
  colors: Map<string, string>
  score?: number | null
  selected?: boolean
  noLab?: boolean
}) {
  const level = Math.max(0, Math.min(100, (remaining / BARREL_LITERS) * 100))
  return (
    <span className="relative inline-flex w-14 flex-col items-center gap-0.5">
      <span className={`relative block h-[4.25rem] w-12 overflow-hidden rounded-[42%/14%] bg-stone-200 ring-2 ${selected ? "ring-wine" : "ring-black/25"}`} aria-hidden="true">
        <span className="absolute inset-x-0 bottom-0 transition-[height] duration-300" style={{ height: `${level}%`, background: stripesOf(parts, colors) }} />
        <span className="absolute inset-x-0 top-[22%] h-[2px] bg-black/25" />
        <span className="absolute inset-x-0 bottom-[22%] h-[2px] bg-black/25" />
      </span>
      {score != null && (
        <span className="absolute -top-1.5 -end-1 rounded-full bg-white px-1.5 py-px text-[11px] font-extrabold leading-tight text-wine ring-1 ring-wine/40">
          <bdi>{score}</bdi>
        </span>
      )}
      {noLab && <NoLabMark className="absolute -top-1.5 -start-1" />}
      <span className="text-sm font-extrabold leading-none text-stone-900">
        <bdi>{number}</bdi>
      </span>
      {remaining < BARREL_LITERS && (
        <span className="text-[11px] font-bold leading-none text-stone-600">
          <bdi>{remaining}</bdi> ל׳
        </span>
      )}
    </span>
  )
}

// The composition of a wine as a tank: the varieties stacked, each as high as its share of the wine.
export function TankBar({ shares, colors, className }: { shares: VarietyShare[]; colors: Map<string, string>; className?: string }) {
  return (
    <div className={`flex flex-col overflow-hidden rounded-2xl border-2 border-stone-300 bg-stone-100 ${className ?? "h-56 w-24"}`} role="img" aria-label="הרכב היין לפי זן">
      {shares.length === 0 ? (
        <span className="m-auto px-2 text-center text-xs font-bold text-stone-400">גרור חביות לכאן</span>
      ) : (
        shares.map((share) => (
          <span
            key={share.variety}
            className="flex items-center justify-center text-xs font-extrabold text-white"
            style={{ height: `${share.percent}%`, backgroundColor: colors.get(share.variety) ?? NEUTRAL, textShadow: "0 1px 2px rgba(0,0,0,.55)" }}
            title={`${share.variety} ${share.percent}%`}
          >
            {share.percent >= 9 && <bdi>{share.percent}%</bdi>}
          </span>
        ))
      )}
    </div>
  )
}
