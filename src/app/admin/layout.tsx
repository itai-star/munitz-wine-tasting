import Link from "next/link"
import Image from "next/image"
import { AdminNav } from "@/components/admin/admin-nav"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-wine text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="יקב מוניץ"
                width={100}
                height={44}
                className="brightness-0 invert"
              />
              <span className="text-lg font-bold">ניהול טעימות</span>
            </Link>
            <AdminNav />
          </div>
          <Link
            href="/"
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            חזרה לעמוד הראשי
          </Link>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 pb-24 md:pb-8">
        {children}
      </main>
    </div>
  )
}
