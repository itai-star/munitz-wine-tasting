const MIN_BAR_PERCENT = 4

export function HarvestWeeklyIntake({ weeks }: { weeks: { label: string; totalKg: number }[] }) {
  if (weeks.length === 0) {
    return <p className="text-sm text-stone-400 py-4 text-center">אין עדיין נתוני קליטה</p>
  }

  const largest = Math.max(...weeks.map((week) => week.totalKg), 1)

  return (
    <div>
      <div className="flex items-end gap-1.5 h-24" role="img" aria-label="קליטה שבועית בק״ג">
        {weeks.map((week) => (
          <span
            key={week.label}
            title={`משבוע ${week.label}: ${week.totalKg.toLocaleString("he-IL")} ק״ג`}
            className="flex-1 rounded-t bg-wine"
            style={{ height: `${Math.max((week.totalKg / largest) * 100, MIN_BAR_PERCENT)}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-stone-400 mt-1.5">
        <bdi>{weeks[0].label}</bdi>
        <span>
          שיא שבועי: <bdi>{largest.toLocaleString("he-IL")}</bdi> ק״ג
        </span>
        <bdi>{weeks[weeks.length - 1].label}</bdi>
      </div>
    </div>
  )
}
