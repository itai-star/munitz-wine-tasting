import { prisma } from "@/lib/prisma"
import { formatMonthKey, percentPaid } from "@/lib/grower-payments"

export type PriceSource = "vintage" | "default" | "missing"

export type PaymentLine = {
  blockId: string
  blockName: string
  variety: string
  kg: number
  priceAgorot: number | null
  defaultPriceAgorot: number | null
  priceSource: PriceSource
  amountAgorot: number
}

export type VarietyLine = { variety: string; kg: number; amountAgorot: number; avgPriceAgorot: number }

export type InstallmentRow = {
  id: string
  sequence: number
  dueMonth: string
  amountAgorot: number
  paid: boolean
}

export type GrowerPayment = {
  id: string
  name: string
  kg: number
  amountAgorot: number
  paidAgorot: number
  openAgorot: number
  paidPercent: number
  lines: PaymentLine[]
  varieties: VarietyLine[]
  plan: { firstMonth: string; count: number } | null
  installments: InstallmentRow[]
  // The schedule no longer adds up to what is owed, for example after a new intake or a price change.
  scheduleOutOfDate: boolean
}

export type MonthPayment = {
  month: string
  label: string
  expectedAgorot: number
  paidAgorot: number
  openAgorot: number
  paidPercent: number
  items: { installmentId: string; growerId: string; growerName: string; sequence: number; amountAgorot: number; paid: boolean }[]
}

export type PaymentsOverview = {
  vintages: { year: number; label: string }[]
  vintage: { id: string; year: number; label: string } | null
  growers: GrowerPayment[]
  months: MonthPayment[]
  totals: {
    kg: number
    amountAgorot: number
    paidAgorot: number
    openAgorot: number
    paidPercent: number
    unscheduledAgorot: number
  }
  unassigned: { kg: number; blocks: { name: string; variety: string; kg: number }[] }
}

function varietiesOf(lines: PaymentLine[]): VarietyLine[] {
  const byVariety = new Map<string, { kg: number; amountAgorot: number }>()
  for (const line of lines) {
    const entry = byVariety.get(line.variety) ?? { kg: 0, amountAgorot: 0 }
    entry.kg += line.kg
    entry.amountAgorot += line.amountAgorot
    byVariety.set(line.variety, entry)
  }
  return [...byVariety]
    .map(([variety, entry]) => ({
      variety,
      ...entry,
      avgPriceAgorot: entry.kg > 0 ? Math.round(entry.amountAgorot / entry.kg) : 0,
    }))
    .sort((a, b) => b.amountAgorot - a.amountAgorot)
}

export async function loadPaymentsOverview(vintageParam: string | undefined): Promise<PaymentsOverview> {
  const vintages = await prisma.vintage.findMany({ orderBy: { year: "desc" }, select: { id: true, year: true, label: true } })
  return buildOverview(vintages, vintages.find((row) => String(row.year) === vintageParam) ?? vintages[0] ?? null)
}

export async function loadPaymentsOverviewById(vintageId: string): Promise<PaymentsOverview> {
  const vintages = await prisma.vintage.findMany({ orderBy: { year: "desc" }, select: { id: true, year: true, label: true } })
  return buildOverview(vintages, vintages.find((row) => row.id === vintageId) ?? null)
}

type VintageRow = { id: string; year: number; label: string }

async function buildOverview(vintages: VintageRow[], vintage: VintageRow | null): Promise<PaymentsOverview> {
  const empty: PaymentsOverview = {
    vintages: vintages.map(({ year, label }) => ({ year, label })),
    vintage,
    growers: [],
    months: [],
    totals: { kg: 0, amountAgorot: 0, paidAgorot: 0, openAgorot: 0, paidPercent: 0, unscheduledAgorot: 0 },
    unassigned: { kg: 0, blocks: [] },
  }
  if (!vintage) return empty

  const [intakes, overrides, plans, growers] = await Promise.all([
    prisma.grapeIntake.groupBy({ by: ["blockId"], where: { vintageId: vintage.id }, _sum: { totalWeightKg: true } }),
    prisma.blockVintagePrice.findMany({ where: { vintageId: vintage.id } }),
    prisma.growerPaymentPlan.findMany({
      where: { vintageId: vintage.id },
      include: { installments: { orderBy: { sequence: "asc" } } },
    }),
    prisma.grower.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ])

  const kgByBlock = new Map(intakes.map((row) => [row.blockId, row._sum.totalWeightKg ?? 0]))
  const blocks = await prisma.vineyardBlock.findMany({
    where: { id: { in: [...kgByBlock.keys()] } },
    select: { id: true, name: true, variety: true, growerId: true, pricePerKgAgorot: true },
  })
  const overrideByBlock = new Map(overrides.map((row) => [row.blockId, row.pricePerKgAgorot]))
  const planByGrower = new Map(plans.map((plan) => [plan.growerId, plan]))

  const linesByGrower = new Map<string, PaymentLine[]>()
  const unassignedBlocks: PaymentsOverview["unassigned"]["blocks"] = []
  for (const block of blocks) {
    const kg = kgByBlock.get(block.id) ?? 0
    if (!block.growerId) {
      unassignedBlocks.push({ name: block.name, variety: block.variety, kg })
      continue
    }
    const vintagePrice = overrideByBlock.get(block.id)
    const priceAgorot = vintagePrice ?? block.pricePerKgAgorot
    const line: PaymentLine = {
      blockId: block.id,
      blockName: block.name,
      variety: block.variety,
      kg,
      priceAgorot,
      defaultPriceAgorot: block.pricePerKgAgorot,
      priceSource: vintagePrice !== undefined ? "vintage" : block.pricePerKgAgorot !== null ? "default" : "missing",
      amountAgorot: priceAgorot === null ? 0 : Math.round(kg * priceAgorot),
    }
    linesByGrower.set(block.growerId, [...(linesByGrower.get(block.growerId) ?? []), line])
  }

  const growerRows: GrowerPayment[] = growers
    .filter((grower) => linesByGrower.has(grower.id) || planByGrower.has(grower.id))
    .map((grower) => {
      const lines = (linesByGrower.get(grower.id) ?? []).sort((a, b) => a.blockName.localeCompare(b.blockName, "he"))
      const plan = planByGrower.get(grower.id)
      const installments: InstallmentRow[] = (plan?.installments ?? []).map((row) => ({
        id: row.id,
        sequence: row.sequence,
        dueMonth: row.dueMonth,
        amountAgorot: row.amountAgorot,
        paid: row.paidAt !== null,
      }))
      const amountAgorot = lines.reduce((sum, line) => sum + line.amountAgorot, 0)
      const scheduled = installments.reduce((sum, row) => sum + row.amountAgorot, 0)
      const paidAgorot = installments.filter((row) => row.paid).reduce((sum, row) => sum + row.amountAgorot, 0)
      return {
        id: grower.id,
        name: grower.name,
        kg: lines.reduce((sum, line) => sum + line.kg, 0),
        amountAgorot,
        paidAgorot,
        openAgorot: amountAgorot - paidAgorot,
        paidPercent: percentPaid(paidAgorot, amountAgorot),
        lines,
        varieties: varietiesOf(lines),
        plan: plan ? { firstMonth: plan.firstMonth, count: plan.installmentCount } : null,
        installments,
        scheduleOutOfDate: plan !== undefined && scheduled !== amountAgorot,
      }
    })

  const byMonth = new Map<string, MonthPayment>()
  for (const grower of growerRows) {
    for (const row of grower.installments) {
      const month =
        byMonth.get(row.dueMonth) ??
        { month: row.dueMonth, label: formatMonthKey(row.dueMonth), expectedAgorot: 0, paidAgorot: 0, openAgorot: 0, paidPercent: 0, items: [] }
      month.expectedAgorot += row.amountAgorot
      if (row.paid) month.paidAgorot += row.amountAgorot
      month.items.push({
        installmentId: row.id,
        growerId: grower.id,
        growerName: grower.name,
        sequence: row.sequence,
        amountAgorot: row.amountAgorot,
        paid: row.paid,
      })
      byMonth.set(row.dueMonth, month)
    }
  }
  const months = [...byMonth.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((month) => ({
      ...month,
      openAgorot: month.expectedAgorot - month.paidAgorot,
      paidPercent: percentPaid(month.paidAgorot, month.expectedAgorot),
      items: month.items.sort((a, b) => a.growerName.localeCompare(b.growerName, "he")),
    }))

  const amountAgorot = growerRows.reduce((sum, grower) => sum + grower.amountAgorot, 0)
  const paidAgorot = growerRows.reduce((sum, grower) => sum + grower.paidAgorot, 0)
  return {
    ...empty,
    growers: growerRows,
    months,
    totals: {
      kg: growerRows.reduce((sum, grower) => sum + grower.kg, 0),
      amountAgorot,
      paidAgorot,
      openAgorot: amountAgorot - paidAgorot,
      paidPercent: percentPaid(paidAgorot, amountAgorot),
      unscheduledAgorot: growerRows.filter((grower) => !grower.plan).reduce((sum, grower) => sum + grower.amountAgorot, 0),
    },
    unassigned: { kg: unassignedBlocks.reduce((sum, block) => sum + block.kg, 0), blocks: unassignedBlocks },
  }
}
