import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { CreateVintageForm } from "@/components/vineyard/create-vintage-form"
import { HarvestStageTiles } from "@/components/admin/harvest-stage-tiles"
import { HarvestWeeklyIntake } from "@/components/admin/harvest-weekly-intake"
import { loadSeasonSummary } from "@/server/season-summary-data"

export const dynamic = "force-dynamic"

function formatDate(date: Date | null | undefined): string | null {
  return date ? date.toLocaleDateString("he-IL", { timeZone: "UTC" }) : null
}

export default async function HarvestHomePage({
  searchParams,
}: {
  searchParams: Promise<{ vintage?: string }>
}) {
  const { vintage: vintageParam } = await searchParams
  const vintages = await prisma.vintage.findMany({ orderBy: { year: "desc" } })

  if (vintages.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-stone-800 mb-6">הבציר שלי</h1>
        <p className="text-stone-500 mb-4">יש ליצור עונה/בציר ראשון כדי להתחיל לעקוב.</p>
        <CreateVintageForm />
      </div>
    )
  }

  const vintage = vintages.find((v) => v.year === Number(vintageParam)) ?? vintages[0]
  const where = { vintageId: vintage.id }

  const [summary, intakeCount, lastSample, batchCount, tankCount, lastLabTest, stationCount] =
    await Promise.all([
      loadSeasonSummary(vintage.id),
      prisma.grapeIntake.count({ where }),
      prisma.ripenessSample.findFirst({ where, orderBy: { sampleDate: "desc" }, select: { sampleDate: true } }),
      prisma.fermentationBatch.count({ where }),
      prisma.finishedWine.count({ where }),
      prisma.labTest.findFirst({
        where: { finishedWine: where },
        orderBy: { testDate: "desc" },
        select: { testDate: true },
      }),
      prisma.ecowittStation.count(),
    ])

  const keepVintage = (href: string) => `${href}?vintage=${vintage.year}`
  const totalKg = summary.varietyTotals.reduce((sum, row) => sum + row.totalWeightKg, 0)
  const tons = (totalKg / 1000).toLocaleString("he-IL", { maximumFractionDigits: 1 })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-stone-800">{vintage.label}</h1>

      <div className="grid grid-cols-3 gap-3">
        <Kpi value={totalKg > 0 ? tons : "—"} label="טון ענבים נקלטו" />
        <Kpi value={String(summary.varietyTotals.length)} label="זנים" />
        <Kpi value={String(tankCount)} label="מכלי יין מוכן" />
      </div>

      <Link
        href={keepVintage("/admin/intake")}
        className="block bg-white rounded-xl shadow-sm border border-stone-200 p-4 hover:border-wine/40 transition-colors"
      >
        <h2 className="text-sm font-semibold text-stone-700 mb-3">מעקב בצירים: קליטה לפי שבוע</h2>
        <HarvestWeeklyIntake weeks={summary.weeks.map((week) => ({ label: week.label, totalKg: week.total }))} />
      </Link>

      <div>
        <h2 className="text-sm font-semibold text-stone-700 mb-2">מהכרם ועד היין</h2>
        <HarvestStageTiles
          stages={[
            {
              href: "/admin/vineyard",
              icon: "vineyard",
              title: "כרם ודגימות",
              status: lastSample ? `דגימה אחרונה: ${formatDate(lastSample.sampleDate)}` : "אין עדיין דגימות הבשלה",
            },
            {
              href: keepVintage("/admin/intake"),
              icon: "intake",
              title: "קליטת ענבים",
              status: intakeCount > 0 ? `${intakeCount} קליטות · ${tons} טון` : "אין עדיין קליטות",
            },
            {
              href: keepVintage("/admin/fermentation"),
              icon: "fermentation",
              title: "תסיסה",
              status: batchCount > 0 ? `${batchCount} מיכלים` : "אין עדיין מיכלי תסיסה",
            },
            {
              href: keepVintage("/admin/finished-wine"),
              icon: "finished",
              title: "יין מוכן",
              status:
                tankCount > 0
                  ? `${tankCount} מכלים${lastLabTest ? ` · בדיקה אחרונה ${formatDate(lastLabTest.testDate)}` : ""}`
                  : "אין עדיין מכלים",
            },
            {
              href: keepVintage("/admin/season-summary"),
              icon: "summary",
              title: "סיכום עונה",
              status: "ייצוא לאקסל ול-PDF",
              wide: true,
            },
          ]}
        />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-stone-700 mb-2">בקרה מרחוק</h2>
        <HarvestStageTiles
          stages={[
            {
              href: "/admin/vineyard-monitor",
              icon: "vineyardMonitor",
              title: "ניטור כרמים",
              status: stationCount > 0 ? `${stationCount} תחנות בכרמים` : "טרם הוגדרו תחנות",
            },
            {
              href: "/admin/remote-monitor",
              icon: "cellarController",
              title: "בקר יקב",
              status: "טמפרטורה ולחות ביקב",
            },
          ]}
        />
      </div>
    </div>
  )
}

function Kpi({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-3">
      <p className="text-xl sm:text-2xl font-bold text-wine">
        <bdi>{value}</bdi>
      </p>
      <p className="text-xs text-stone-500 mt-0.5">{label}</p>
    </div>
  )
}
