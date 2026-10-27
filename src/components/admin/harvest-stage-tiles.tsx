import Link from "next/link"
import {
  CellarControllerIcon,
  FermentationIcon,
  FinishedWineIcon,
  IntakeIcon,
  SeasonSummaryIcon,
  VineyardIcon,
  VineyardMonitorIcon,
} from "@/components/admin/nav-icons"

const ICONS = {
  vineyard: VineyardIcon,
  intake: IntakeIcon,
  fermentation: FermentationIcon,
  finished: FinishedWineIcon,
  vineyardMonitor: VineyardMonitorIcon,
  cellarController: CellarControllerIcon,
  summary: SeasonSummaryIcon,
} as const

export type HarvestStage = {
  href: string
  icon: keyof typeof ICONS
  title: string
  status: string
  wide?: boolean
}

export function HarvestStageTiles({ stages }: { stages: HarvestStage[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {stages.map((stage) => {
        const Icon = ICONS[stage.icon]
        return (
          <Link
            key={stage.href}
            href={stage.href}
            className={`group flex flex-col gap-3 bg-white rounded-xl shadow-sm border border-stone-200 p-4 min-h-[7.5rem] hover:border-wine/40 hover:shadow-md active:bg-stone-50 transition-all ${
              stage.wide ? "col-span-2 lg:col-span-1" : ""
            }`}
          >
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-wine-soft text-wine">
              <Icon className="w-5 h-5" />
            </span>
            <span>
              <span className="block font-semibold text-stone-800">{stage.title}</span>
              <span className="block text-xs text-stone-500 mt-0.5 leading-snug">{stage.status}</span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}
