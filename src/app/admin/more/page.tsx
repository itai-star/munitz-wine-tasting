import Link from "next/link"
import { TastingIcon } from "@/components/admin/nav-icons"

type MoreLink = {
  href: string
  title: string
  description: string
  icon: (props: { className?: string }) => React.JSX.Element
}

const LINKS: MoreLink[] = [
  {
    href: "/",
    title: "לאתר הטעימות",
    description: "העמוד שהאורחים רואים, עם הטעימות הפעילות",
    icon: TastingIcon,
  },
]

export default function MorePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">עוד</h1>

      <div className="grid gap-3">
        {LINKS.map((link) => {
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-4 bg-white rounded-xl shadow-sm border border-stone-200 p-4 hover:border-wine/40 active:bg-stone-50 transition-colors"
            >
              <span className="inline-flex items-center justify-center w-11 h-11 shrink-0 rounded-full bg-wine-soft text-wine">
                <Icon className="w-5 h-5" />
              </span>
              <span>
                <span className="block font-semibold text-stone-800">{link.title}</span>
                <span className="block text-xs text-stone-500 mt-0.5">{link.description}</span>
              </span>
            </Link>
          )
        })}
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
        <h2 className="font-semibold text-stone-800 mb-2">התקנה על מסך הבית של הטלפון</h2>
        <ul className="text-sm text-stone-600 space-y-2">
          <li>
            <b>באייפון:</b> פותחים את האתר ב-Safari, לוחצים על כפתור השיתוף ובוחרים
            "הוסף למסך הבית".
          </li>
          <li>
            <b>באנדרואיד:</b> פותחים ב-Chrome, לוחצים על שלוש הנקודות ובוחרים "התקן אפליקציה".
          </li>
        </ul>
      </section>
    </div>
  )
}
