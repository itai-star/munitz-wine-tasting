import { prisma } from "@/lib/prisma"
import { compareBarrels } from "@/lib/barrel-room"
import type { BarrelRow } from "@/lib/barrel-room"

export async function loadBarrels(): Promise<BarrelRow[]> {
  const barrels = await prisma.barrel.findMany()
  return barrels
    .map(
      (barrel): BarrelRow => ({
        id: barrel.id,
        number: barrel.number,
        type: barrel.type,
        year: barrel.year,
        removed: barrel.removedAt !== null,
        removedOn: barrel.removedAt ? barrel.removedAt.toISOString().slice(0, 10) : null,
        removalNote: barrel.removalNote,
      }),
    )
    .sort(compareBarrels)
}
