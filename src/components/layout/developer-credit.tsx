"use client"

import Image from "next/image"
import { usePathname } from "next/navigation"

// The footer of every page: who built the app. The logo is made for a dark background, so the strip is dark, in the colour of the
// logo's own background. Inside the admin area the phone's bottom bar is fixed over the end of the page, so the strip leaves room
// for it there.
export function DeveloperCredit() {
  const inAdmin = usePathname().startsWith("/admin")
  return (
    <footer
      className={`mt-auto bg-[#0a0e14] text-stone-300 print:hidden ${
        inAdmin ? "pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0" : "pb-[env(safe-area-inset-bottom)]"
      }`}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-3 px-4 py-3">
        <span className="text-sm font-semibold">פותח על ידי תמנון טכנולוגיות</span>
        <Image src="/tamnun-logo.png" alt="תמנון טכנולוגיות" width={56} height={56} className="h-14 w-14 rounded-lg" />
      </div>
    </footer>
  )
}
