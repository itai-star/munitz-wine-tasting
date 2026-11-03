import { summarizeRoom } from "@/lib/barrel-room"
import { AddBarrelButton, BarrelEditorProvider } from "@/components/barrels/barrel-editor"
import { BarrelsExcelPanel } from "@/components/barrels/barrels-excel-panel"
import { BarrelsList } from "@/components/barrels/barrels-list"
import { BarrelsSummary } from "@/components/barrels/barrels-summary"
import { loadBarrels } from "@/server/barrels-data"

export const dynamic = "force-dynamic"

export default async function BarrelRoomPage() {
  const barrels = await loadBarrels()
  const summary = summarizeRoom(barrels)
  const knownTypes = summary.byType.map((row) => row.type)

  return (
    <BarrelEditorProvider knownTypes={knownTypes}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-stone-800">חדר חביות</h1>
          <AddBarrelButton />
        </div>

        <BarrelsSummary summary={summary} />
        <BarrelsList barrels={barrels} />
        <BarrelsExcelPanel />
      </div>
    </BarrelEditorProvider>
  )
}
