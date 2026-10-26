import { loadCreditOverview } from "@/server/credit-data"
import { CreditGate } from "@/components/credit/credit-gate"
import { CreditYearlyChart } from "@/components/credit/credit-yearly-chart"
import { CreditMonthView } from "@/components/credit/credit-month-view"
import { CreditCardManager } from "@/components/credit/credit-card-manager"
import { CreditLogoutButton } from "@/components/credit/credit-logout-button"
import { BankImportPanel } from "@/components/credit/bank-import-panel"
import { isBankImportAvailable } from "@/server/actions/credit-bank-actions"

export const dynamic = "force-dynamic"

type SearchParams = { month?: string; card?: string; year?: string }

async function CreditContent({ searchParams }: { searchParams: SearchParams }) {
  const overview = await loadCreditOverview(searchParams)
  const bankImportAvailable = await isBankImportAvailable()
  const hasCards = overview.cards.length > 0
  const hasData = overview.availableMonths.length > 0

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <CreditLogoutButton />
      </div>

      {!hasData && (
        <p className="text-stone-500">
          עדיין לא יובאו עסקאות.
          {bankImportAvailable
            ? " אפשר למשוך אותן מהבנק בחלק \"משיכה מהבנק\" בתחתית העמוד."
            : " המשיכה מהבנק זמינה כשהאפליקציה רצה על המחשב."}
        </p>
      )}

      {hasCards && hasData && (
        <>
          <CreditYearlyChart
            year={overview.year}
            years={overview.availableYears}
            cards={overview.cards}
            rows={overview.yearly}
          />
          <CreditMonthView
            cards={overview.cards}
            availableMonths={overview.availableMonths}
            selectedMonth={overview.selectedMonth}
            selectedCardId={overview.selectedCardId}
            transactions={overview.transactions}
            totalAgorot={overview.monthTotalAgorot}
          />
        </>
      )}

      {bankImportAvailable ? (
        <details open={!hasData}>
          <summary className="cursor-pointer text-sm font-medium text-wine">משיכה מהבנק</summary>
          <div className="mt-3">
            <BankImportPanel />
          </div>
        </details>
      ) : (
        <p className="text-xs text-stone-400">
          משיכת נתונים מהבנק זמינה רק כשהאפליקציה רצה על המחשב. כאן מוצגים הנתונים השמורים.
        </p>
      )}

      <details>
        <summary className="cursor-pointer text-sm font-medium text-wine">ניהול כרטיסים</summary>
        <div className="mt-3">
          <CreditCardManager cards={overview.cards} />
        </div>
      </details>
    </div>
  )
}

export default async function CreditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">מעקב אשראי</h1>
      <CreditGate>
        <CreditContent searchParams={params} />
      </CreditGate>
    </div>
  )
}
