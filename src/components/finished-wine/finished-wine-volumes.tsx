import {
  FINISHED_WINE_TYPE_COLORS,
  FINISHED_WINE_TYPE_LABELS,
  summarizeStageVolumes,
} from "@/lib/finished-wine-volumes"
import type { StageVolumes, TypeStageVolume, VolumeRecord } from "@/lib/finished-wine-volumes"

const UNSET_COLOR = "#a8a29e"

function formatLiters(value: number): string {
  return value.toLocaleString("he-IL")
}

function typeLabel(type: TypeStageVolume["type"]): string {
  return type === "UNSET" ? "ללא סוג מוגדר" : FINISHED_WINE_TYPE_LABELS[type]
}

function typeColor(type: TypeStageVolume["type"]): string {
  return type === "UNSET" ? UNSET_COLOR : FINISHED_WINE_TYPE_COLORS[type]
}

// A solid bar is a final figure; diagonal stripes mark a figure that still misses tanks.
function barBackground(color: string, isFinal: boolean): string {
  if (isFinal) return color
  return `repeating-linear-gradient(135deg, ${color} 0, ${color} 6px, #ffffff 6px, #ffffff 10px)`
}

function StatusBadge({ stage }: { stage: StageVolumes }) {
  if (stage.isFinal) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1 text-sm font-extrabold">
        <span aria-hidden="true">✓</span> נתון סופי
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 text-sm font-extrabold">
      <span aria-hidden="true">◐</span> נתון חלקי
    </span>
  )
}

function StageCard({ stage, maxLiters }: { stage: StageVolumes; maxLiters: number }) {
  const accent = stage.isFinal ? "border-s-emerald-500" : "border-s-amber-500"

  return (
    <section className={`bg-white rounded-2xl shadow-sm border border-stone-200 border-s-8 ${accent} p-4 sm:p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-lg font-extrabold text-stone-900">{stage.label}</h4>
        <StatusBadge stage={stage} />
      </div>
      <p className="mt-1 text-sm font-semibold text-stone-600">
        נמדדו <bdi>{stage.measured}</bdi> מתוך <bdi>{stage.tanks}</bdi> מכלים
      </p>
      <p className="mt-3 text-3xl font-extrabold text-stone-900 leading-none">
        <bdi>{formatLiters(stage.totalLiters)}</bdi> <span className="text-base font-bold text-stone-600">ליטר</span>
      </p>

      <ul className="mt-4 space-y-3.5">
        {stage.types.map((entry) => (
          <li key={entry.type}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex items-center gap-2 text-base font-bold text-stone-900">
                <span className="h-3.5 w-3.5 rounded-sm" style={{ backgroundColor: typeColor(entry.type) }} aria-hidden="true" />
                {typeLabel(entry.type)}
              </span>
              <span className="text-base font-extrabold text-stone-900 whitespace-nowrap">
                <bdi>{formatLiters(entry.liters)}</bdi>
              </span>
            </div>
            <div className="mt-1.5 h-3.5 rounded-full bg-stone-100 overflow-hidden" aria-hidden="true">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${entry.liters > 0 ? Math.max((entry.liters / maxLiters) * 100, 2) : 0}%`,
                  background: barBackground(typeColor(entry.type), entry.isFinal),
                  outline: entry.isFinal ? undefined : `1px solid ${typeColor(entry.type)}`,
                  outlineOffset: "-1px",
                }}
              />
            </div>
            <p className={`mt-1 text-sm font-bold ${entry.isFinal ? "text-emerald-800" : "text-amber-800"}`}>
              {entry.isFinal ? "✓ סופי" : "◐ חלקי"} · <bdi>{entry.measured}</bdi> מתוך <bdi>{entry.tanks}</bdi> מכלים
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function FinishedWineVolumes({ records }: { records: VolumeRecord[] }) {
  const stages = summarizeStageVolumes(records)
  const maxLiters = Math.max(1, ...stages.flatMap((stage) => stage.types.map((entry) => entry.liters)))

  return (
    <div>
      <h3 className="text-lg font-extrabold text-stone-900">כמות יין בליטרים לפי סוג ושלב</h3>
      <p className="text-sm text-stone-600 mt-1 mb-4">
        נתון סופי הוא נתון שכל המכלים נמדדו בשלב שלו. פס מפוספס הוא נתון חלקי, שעדיין חסרים בו מכלים.
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        {stages.map((stage) => (
          <StageCard key={stage.key} stage={stage} maxLiters={maxLiters} />
        ))}
      </div>
    </div>
  )
}
