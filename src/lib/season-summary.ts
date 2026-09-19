export type IntakeVarietyRecord = {
  intakeDate: Date
  totalWeightKg: number
  variety: string
}

export type WeekIntakeRow = {
  weekStart: Date
  label: string
  byVariety: Record<string, number>
  total: number
}

export type IntakeByVarietyAndWeek = {
  weeks: WeekIntakeRow[]
  varieties: string[]
}

function startOfWeekUTC(date: Date): Date {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
  start.setUTCDate(start.getUTCDate() - start.getUTCDay())
  return start
}

function formatDdMm(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0")
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${day}/${month}`
}

export function groupIntakeByVarietyAndWeek(
  intakes: IntakeVarietyRecord[]
): IntakeByVarietyAndWeek {
  const varietySet = new Set<string>()
  const weekMap = new Map<number, WeekIntakeRow>()

  for (const intake of intakes) {
    varietySet.add(intake.variety)
    const weekStart = startOfWeekUTC(intake.intakeDate)
    const key = weekStart.getTime()

    let week = weekMap.get(key)
    if (!week) {
      week = { weekStart, label: formatDdMm(weekStart), byVariety: {}, total: 0 }
      weekMap.set(key, week)
    }
    week.byVariety[intake.variety] = (week.byVariety[intake.variety] ?? 0) + intake.totalWeightKg
    week.total += intake.totalWeightKg
  }

  const weeks = [...weekMap.values()].sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
  const varieties = [...varietySet].sort((a, b) => a.localeCompare(b, "he"))

  return { weeks, varieties }
}

export type VarietyWeightRow = {
  variety: string
  totalWeightKg: number
}

export function sumIntakeByVariety(intakes: IntakeVarietyRecord[]): VarietyWeightRow[] {
  const totals = new Map<string, number>()
  for (const intake of intakes) {
    totals.set(intake.variety, (totals.get(intake.variety) ?? 0) + intake.totalWeightKg)
  }
  return [...totals.entries()]
    .map(([variety, totalWeightKg]) => ({ variety, totalWeightKg }))
    .sort((a, b) => b.totalWeightKg - a.totalWeightKg)
}

export type FinishedWineVarietyRecord = {
  variety: string
  harvestedWeightKg: number
  litersAfterPressing: number | null
  litersAfterFirstRacking: number | null
  litersAfterSecondRacking: number | null
}

export type VarietyExtractionRow = {
  variety: string
  harvestedWeightKg: number
  afterPressingPercent: number | null
  afterFirstRackingPercent: number | null
  afterSecondRackingPercent: number | null
}

function ratioPercent(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null
  return (numerator / denominator) * 100
}

export function calculateExtractionByVariety(
  wines: FinishedWineVarietyRecord[]
): VarietyExtractionRow[] {
  const totals = new Map<
    string,
    { harvestedWeightKg: number; afterPressing: number; afterFirstRacking: number; afterSecondRacking: number }
  >()

  for (const wine of wines) {
    const entry = totals.get(wine.variety) ?? {
      harvestedWeightKg: 0,
      afterPressing: 0,
      afterFirstRacking: 0,
      afterSecondRacking: 0,
    }
    entry.harvestedWeightKg += wine.harvestedWeightKg
    entry.afterPressing += wine.litersAfterPressing ?? 0
    entry.afterFirstRacking += wine.litersAfterFirstRacking ?? 0
    entry.afterSecondRacking += wine.litersAfterSecondRacking ?? 0
    totals.set(wine.variety, entry)
  }

  return [...totals.entries()]
    .map(([variety, sums]) => ({
      variety,
      harvestedWeightKg: sums.harvestedWeightKg,
      afterPressingPercent: ratioPercent(sums.afterPressing, sums.harvestedWeightKg),
      afterFirstRackingPercent: ratioPercent(sums.afterFirstRacking, sums.afterPressing),
      afterSecondRackingPercent: ratioPercent(sums.afterSecondRacking, sums.afterFirstRacking),
    }))
    .sort((a, b) => b.harvestedWeightKg - a.harvestedWeightKg)
}
