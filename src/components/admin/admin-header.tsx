import Link from "next/link"
import Image from "next/image"
import { prisma } from "@/lib/prisma"
import { AdminAreaTabs } from "@/components/admin/admin-area-tabs"
import { AdminHeaderTitle } from "@/components/admin/admin-header-title"
import { AdminVintageChip } from "@/components/admin/admin-vintage-chip"

export async function AdminHeader() {
  const vintages = await prisma.vintage.findMany({
    orderBy: { year: "desc" },
    select: { year: true, label: true },
  })

  return (
    <header className="sticky top-0 z-30 bg-wine text-white print:hidden">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/admin" aria-label="למסך הבית של הניהול" className="shrink-0">
            <Image
              src="/logo.png"
              alt="יקב מוניץ"
              width={84}
              height={37}
              className="brightness-0 invert h-8 w-auto"
              priority
            />
          </Link>
          <AdminHeaderTitle />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <AdminVintageChip vintages={vintages} />
          <Link
            href="/"
            className="hidden md:inline text-sm text-white/75 hover:text-white transition-colors"
          >
            לאתר הטעימות
          </Link>
        </div>
      </div>
      <AdminAreaTabs />
    </header>
  )
}
