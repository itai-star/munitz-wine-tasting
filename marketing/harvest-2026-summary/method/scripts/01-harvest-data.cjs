const path = require("path")
const root = "C:/Users/Itai Munitz/.claude/projects/C--Users-Itai-Munitz/PROJECTS-MAIN/Hellow"
const { PrismaClient } = require(path.join(root, "node_modules/@prisma/client"))

async function main() {
  const prisma = new PrismaClient()
  const vintages = await prisma.vintage.findMany({ orderBy: { year: "desc" } })
  console.log("vintages:", vintages.map((v) => `${v.year}:${v.label}`).join(" | "))
  for (const v of vintages) {
    const intakes = await prisma.grapeIntake.findMany({
      where: { vintageId: v.id },
      include: { block: { select: { variety: true, name: true, location: true } } },
      orderBy: { intakeDate: "asc" },
    })
    console.log(`\n== ${v.year}: ${intakes.length} intakes`)
    const byVariety = {}
    for (const i of intakes) {
      const key = i.block.variety
      byVariety[key] ??= { kg: 0, bins: 0, n: 0, first: i.intakeDate, last: i.intakeDate, places: new Set() }
      const row = byVariety[key]
      row.kg += i.totalWeightKg
      row.bins += i.binCount
      row.n += 1
      if (i.intakeDate < row.first) row.first = i.intakeDate
      if (i.intakeDate > row.last) row.last = i.intakeDate
      if (i.block.location) row.places.add(i.block.location)
    }
    let total = 0
    for (const [variety, r] of Object.entries(byVariety)) {
      total += r.kg
      console.log(
        `${variety}\t${Math.round(r.kg)} kg\t${r.bins} bins\t${r.n} deliveries\t${r.first.toISOString().slice(0, 10)} -> ${r.last.toISOString().slice(0, 10)}\t${[...r.places].join(",")}`
      )
    }
    console.log(`TOTAL ${Math.round(total)} kg`)
  }
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error("ERR", e.message.split("\n")[0])
  process.exit(1)
})
