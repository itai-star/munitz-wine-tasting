const path = require("path")
const root = "C:/Users/Itai Munitz/.claude/projects/C--Users-Itai-Munitz/PROJECTS-MAIN/Hellow"
const { PrismaClient } = require(path.join(root, "node_modules/@prisma/client"))
;(async () => {
  const prisma = new PrismaClient()
  const rows = await prisma.grapeIntake.findMany({ include: { block: { select: { variety: true } } }, orderBy: { intakeDate: "asc" } })
  const byMonth = {}
  const byDay = {}
  for (const r of rows) {
    const d = r.intakeDate.toISOString().slice(0, 10)
    const m = d.slice(0, 7)
    byMonth[m] ??= { kg: 0, n: 0, v: new Set() }
    byMonth[m].kg += r.totalWeightKg; byMonth[m].n++; byMonth[m].v.add(r.block.variety)
    byDay[d] = (byDay[d] ?? 0) + r.totalWeightKg
  }
  for (const [m, x] of Object.entries(byMonth)) console.log(m, Math.round(x.kg), "kg", x.n, "deliveries", x.v.size, "varieties:", [...x.v].join(","))
  console.log(Object.entries(byDay).map(([d, k]) => d + ":" + Math.round(k)).join(" "))
  console.log("bins", rows.reduce((s, r) => s + r.binCount, 0))
  await prisma.$disconnect()
})()
