import { prisma } from "@/lib/prisma"
import { dominantVariety, labOf, remainingLiters, roundLiters } from "@/lib/blending"
import type { BlendWineView, PileBarrel } from "@/lib/blending"
import type { WinePart } from "@/lib/barrel-wine"

export type BlendingYear = {
  wines: BlendWineView[]
  // Barrels with wine in the year that still hold some, grouped on screen by variety.
  pile: PileBarrel[]
}

function partsOf(components: { blockId: string; percent: number; block: { name: string; variety: string } }[]): WinePart[] {
  return components
    .map((part) => ({ blockId: part.blockId, blockName: part.block.name, variety: part.block.variety, percent: part.percent }))
    .sort((a, b) => b.percent - a.percent || a.blockName.localeCompare(b.blockName, "he"))
}

export async function loadBlending(year: number): Promise<BlendingYear> {
  const [fills, wines] = await Promise.all([
    prisma.barrelFill.findMany({
      where: { year, components: { some: {} } },
      include: {
        barrel: { select: { number: true, type: true } },
        components: { include: { block: { select: { name: true, variety: true } } } },
        draws: { select: { liters: true } },
        tests: { select: { testDate: true, createdAt: true, ethanol: true, ph: true } },
      },
    }),
    prisma.blendWine.findMany({
      where: { year },
      orderBy: { createdAt: "asc" },
      include: { draws: { include: { fill: { include: { barrel: { select: { number: true, type: true } }, components: { include: { block: { select: { name: true, variety: true } } } }, tests: { select: { testDate: true, createdAt: true, ethanol: true, ph: true } } } } } } },
    }),
  ])

  const pile = fills
    .map((fill): PileBarrel => {
      const parts = partsOf(fill.components)
      return {
        fillId: fill.id,
        number: fill.barrel.number,
        type: fill.barrel.type,
        parts,
        variety: dominantVariety(parts) ?? "",
        remaining: remainingLiters(fill.draws.reduce((sum, draw) => sum + draw.liters, 0)),
        score: fill.score,
        tastingNotes: fill.tastingNotes,
        lab: labOf(fill.tests),
      }
    })
    .filter((barrel) => barrel.remaining > 0)
    .sort((a, b) => a.number.localeCompare(b.number, "he", { numeric: true }))

  return {
    pile,
    wines: wines.map(
      (wine): BlendWineView => ({
        id: wine.id,
        year: wine.year,
        name: wine.name,
        description: wine.description,
        finalized: wine.finalized,
        draws: wine.draws
          .map((draw) => ({
            fillId: draw.fillId,
            number: draw.fill.barrel.number,
            type: draw.fill.barrel.type,
            liters: roundLiters(draw.liters),
            parts: partsOf(draw.fill.components),
            score: draw.fill.score,
            lab: labOf(draw.fill.tests),
          }))
          .sort((a, b) => a.number.localeCompare(b.number, "he", { numeric: true })),
      }),
    ),
  }
}
