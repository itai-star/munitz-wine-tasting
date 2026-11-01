import { PrismaClient } from "@prisma/client"

// A block's grower and price are financial data. Every block query leaves them out unless it asks for them,
// so a screen that lists blocks for someone without the growers permission cannot pass them to the browser.
function createClient() {
  return new PrismaClient({ omit: { vineyardBlock: { growerId: true, pricePerKgAgorot: true } } })
}

const globalForPrisma = globalThis as unknown as { prisma: ReturnType<typeof createClient> }

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
