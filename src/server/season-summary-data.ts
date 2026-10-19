import { prisma } from "@/lib/prisma"
import {
  calculateExtractionByVariety,
  groupIntakeByVarietyAndWeek,
  sumIntakeByVariety,
  type IntakeByVarietyAndWeek,
  type VarietyExtractionRow,
  type VarietyWeightRow,
} from "@/lib/season-summary"

export type SeasonSummaryData = IntakeByVarietyAndWeek & {
  varietyTotals: VarietyWeightRow[]
  extractionRows: VarietyExtractionRow[]
}

export async function loadSeasonSummary(vintageId: string): Promise<SeasonSummaryData> {
  const [intakes, finishedWines] = await Promise.all([
    prisma.grapeIntake.findMany({
      where: { vintageId },
      include: { block: { select: { variety: true } } },
    }),
    prisma.finishedWine.findMany({
      where: { vintageId, blockId: { not: null } },
      include: { block: { select: { variety: true } } },
    }),
  ])

  const intakeRecords = intakes.map((intake) => ({
    intakeDate: intake.intakeDate,
    totalWeightKg: intake.totalWeightKg,
    variety: intake.block.variety,
  }))

  const finishedWineRecords = finishedWines
    .filter(
      (wine): wine is typeof wine & { block: { variety: string } } => wine.block !== null
    )
    .map((wine) => ({
      variety: wine.block.variety,
      harvestedWeightKg: wine.harvestedWeightKg,
      litersAfterPressing: wine.litersAfterPressing,
      litersAfterFirstRacking: wine.litersAfterFirstRacking,
      litersAfterSecondRacking: wine.litersAfterSecondRacking,
    }))

  return {
    ...groupIntakeByVarietyAndWeek(intakeRecords),
    varietyTotals: sumIntakeByVariety(intakeRecords),
    extractionRows: calculateExtractionByVariety(finishedWineRecords),
  }
}
