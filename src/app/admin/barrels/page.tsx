import { summarizeYear } from "@/lib/barrel-room"
import { todayKey } from "@/lib/calendar-events"
import { AddBarrelButton, BarrelEditorProvider } from "@/components/barrels/barrel-editor"
import { BarrelTestsExcelPanel } from "@/components/barrels/barrel-tests-excel-panel"
import { BarrelWineExcelPanel } from "@/components/barrels/barrel-wine-excel-panel"
import { BarrelsExcelPanel } from "@/components/barrels/barrels-excel-panel"
import { BarrelsList } from "@/components/barrels/barrels-list"
import { BarrelsSummary } from "@/components/barrels/barrels-summary"
import { RemovedBarrels } from "@/components/barrels/removed-barrels"
import { YearSelect } from "@/components/barrels/year-select"
import { loadBarrelYear, loadBarrelYears, loadBarrels, loadBlockSupply } from "@/server/barrels-data"

export const dynamic = "force-dynamic"

export default async function BarrelRoomPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const currentYear = Number(todayKey().slice(0, 4))
  const [barrels, years] = await Promise.all([loadBarrels(), loadBarrelYears(currentYear)])

  const requested = Number((await searchParams).year)
  const year = years.includes(requested) ? requested : currentYear
  const [rows, supply] = await Promise.all([loadBarrelYear(year, barrels), loadBlockSupply(year)])
  const knownTypes = Array.from(new Set(barrels.map((barrel) => barrel.type))).sort((a, b) => a.localeCompare(b, "he"))

  return (
    <BarrelEditorProvider knownTypes={knownTypes} supply={supply} year={year} rows={rows}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-stone-800">חדר חביות</h1>
          <div className="flex flex-wrap items-center gap-3">
            <YearSelect year={year} years={years} />
            <AddBarrelButton />
          </div>
        </div>

        <BarrelsSummary summary={summarizeYear(rows)} year={year} />
        <BarrelsList rows={rows} year={year} />
        <RemovedBarrels barrels={barrels.filter((barrel) => barrel.removed)} />

        <div className="grid gap-3 lg:grid-cols-2">
          <BarrelWineExcelPanel year={year} />
          <BarrelTestsExcelPanel year={year} />
          <BarrelsExcelPanel />
        </div>
      </div>
    </BarrelEditorProvider>
  )
}
