import Link from "next/link"
import Image from "next/image"

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
            <nav className="flex gap-4 text-sm text-white/80">
              <Link href="/admin" className="hover:text-white transition-colors">
                טעימות
              </Link>
              <Link
                href="/admin/wines"
                className="hover:text-white transition-colors"
              >
                יינות
              </Link>
              <Link
                href="/admin/inventory"
                className="hover:text-white transition-colors"
              >
                מלאי
              </Link>
            </nav>
          </div>
          <Link
            href="/"
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            חזרה לעמוד הראשי
          </Link>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {children}
      </main>
    </div>
  )
}
