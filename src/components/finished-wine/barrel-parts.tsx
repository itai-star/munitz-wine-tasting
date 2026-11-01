const VARIETY_COLORS = [
  "#722F37",
  "#a16207",
  "#166534",
  "#1d4ed8",
  "#7e22ce",
  "#0f766e",
  "#c2410c",
  "#4d7c0f",
  "#be185d",
  "#475569",
  "#0e7490",
  "#854d0e",
]

// A variety keeps its colour wherever it appears, because colours follow the alphabetical order of the names.
export function colorsByVariety(varieties: string[]): Map<string, string> {
  const sorted = Array.from(new Set(varieties)).sort((a, b) => a.localeCompare(b, "he"))
  return new Map(sorted.map((variety, index) => [variety, VARIETY_COLORS[index % VARIETY_COLORS.length]]))
}

const MAX_ICONS = 60

function stripes(colors: string[]): string {
  if (colors.length <= 1) return colors[0] ?? "#a8a29e"
  const width = 100 / colors.length
  const stops = colors.map((color, index) => `${color} ${index * width}% ${(index + 1) * width}%`)
  return `linear-gradient(90deg, ${stops.join(", ")})`
}

// A barrel drawn in plain CSS. A mixed barrel is striped with the colours of the varieties that share it.
function BarrelIcon({ colors }: { colors: string[] }) {
  return (
    <span
      className="relative inline-block h-8 w-6 overflow-hidden rounded-[45%/18%] ring-1 ring-black/25"
      style={{ background: stripes(colors) }}
      aria-hidden="true"
    >
      <span className="absolute inset-x-0 top-[22%] h-[3px] bg-white/55" />
      <span className="absolute inset-x-0 bottom-[22%] h-[3px] bg-white/55" />
    </span>
  )
}

export function BarrelRow({ count, colors }: { count: number; colors: string[] }) {
  if (count <= 0) return null
  const shown = Math.min(count, MAX_ICONS)
  return (
    <div className="flex flex-wrap gap-1.5" role="img" aria-label={`${count} חביות`}>
      {Array.from({ length: shown }, (_, index) => (
        <BarrelIcon key={index} colors={colors} />
      ))}
      {count > shown && <span className="self-center text-sm font-bold text-stone-600">+{count - shown}</span>}
    </div>
  )
}

export function barrelsText(count: number): string {
  if (count === 1) return "חבית אחת"
  return `${count.toLocaleString("he-IL")} חביות`
}

export function litersText(value: number): string {
  return `${value.toLocaleString("he-IL")} ליטר`
}
