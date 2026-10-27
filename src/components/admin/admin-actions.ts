import {
  FermentationIcon,
  FinishedWineIcon,
  IntakeIcon,
  VineyardIcon,
} from "@/components/admin/nav-icons"
import type { AdminIcon } from "@/components/admin/admin-areas"

export type QuickAction = { label: string; href: string; icon: AdminIcon }

export type PrimaryAction =
  | { kind: "link"; label: string; href: string }
  | { kind: "menu"; label: string; title: string; actions: QuickAction[] }

// Forms that sit at the top of their own screen are reached by scrolling to an anchor.
const DIRECT_ACTIONS: Record<string, { label: string; href: string }> = {
  "/admin/intake": { label: "קליטה חדשה", href: "#intake-form" },
  "/admin/vineyard/samples": { label: "דגימה חדשה", href: "#sample-form" },
  "/admin/fermentation": { label: "מיכל חדש", href: "/admin/fermentation/new" },
  "/admin/finished-wine": { label: "רשומה חדשה", href: "/admin/finished-wine/new" },
  "/admin/vineyard": { label: "בלוק חדש", href: "/admin/vineyard/new" },
  "/admin/tastings": { label: "טעימה חדשה", href: "/admin/sessions/new" },
}

const HOME_ACTIONS: QuickAction[] = [
  { label: "קליטת ענבים", href: "/admin/intake#intake-form", icon: IntakeIcon },
  { label: "דגימת הבשלה", href: "/admin/vineyard/samples#sample-form", icon: VineyardIcon },
  { label: "מיכל תסיסה", href: "/admin/fermentation/new", icon: FermentationIcon },
  { label: "יין מוכן", href: "/admin/finished-wine/new", icon: FinishedWineIcon },
]

export function primaryActionFor(pathname: string): PrimaryAction | null {
  if (pathname === "/admin") {
    return { kind: "menu", label: "הוספה", title: "מה להוסיף?", actions: HOME_ACTIONS }
  }
  const direct = DIRECT_ACTIONS[pathname]
  return direct ? { kind: "link", ...direct } : null
}
