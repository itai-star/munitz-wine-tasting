import {
  CellarControllerIcon,
  CreditIcon,
  FermentationIcon,
  FinishedWineIcon,
  GrapesIcon,
  HomeIcon,
  IntakeIcon,
  InventoryIcon,
  MonthlySummaryIcon,
  MoreIcon,
  RemoteMonitorIcon,
  SeasonSummaryIcon,
  TastingIcon,
  VineyardIcon,
  VineyardMonitorIcon,
  WineIcon,
} from "@/components/admin/nav-icons"
import type { PermissionKey } from "@/lib/permissions"

export type AdminIcon = (props: { className?: string }) => React.JSX.Element

export type AdminItem = {
  href: string
  label: string
  title: string
  icon: AdminIcon
  // Overrides the permission of the area, for areas that hold items of different functions.
  permission?: PermissionKey
  // Extra path prefixes that belong to this item (detail pages, creation forms).
  alsoMatches?: string[]
}

export type AdminArea = {
  id: string
  label: string
  title: string
  icon: AdminIcon
  href: string
  // Left out for areas every signed-in user may open, or whose items each carry their own.
  permission?: PermissionKey
  items: AdminItem[]
}

export const adminAreas: AdminArea[] = [
  {
    id: "harvest",
    label: "בציר",
    title: "הבציר",
    icon: GrapesIcon,
    href: "/admin",
    permission: "HARVEST",
    items: [
      { href: "/admin", label: "מבט על", title: "מבט על הבציר", icon: HomeIcon },
      { href: "/admin/vineyard", label: "כרם", title: "כרם ודגימות", icon: VineyardIcon },
      { href: "/admin/intake", label: "קליטה", title: "קליטת ענבים", icon: IntakeIcon },
      { href: "/admin/fermentation", label: "תסיסה", title: "תסיסה", icon: FermentationIcon },
      { href: "/admin/finished-wine", label: "יין מוכן", title: "יין מוכן", icon: FinishedWineIcon },
      { href: "/admin/season-summary", label: "סיכום עונה", title: "סיכום עונה", icon: SeasonSummaryIcon },
    ],
  },
  {
    id: "remote",
    label: "בקרה מרחוק",
    title: "בקרה מרחוק",
    icon: RemoteMonitorIcon,
    href: "/admin/vineyard-monitor",
    permission: "REMOTE_CONTROL",
    items: [
      { href: "/admin/vineyard-monitor", label: "ניטור כרמים", title: "ניטור כרמים", icon: VineyardMonitorIcon },
      { href: "/admin/remote-monitor", label: "בקר יקב", title: "בקר יקב", icon: CellarControllerIcon },
    ],
  },
  {
    id: "wine",
    label: "יינות ומלאי",
    title: "יינות ומלאי",
    icon: WineIcon,
    href: "/admin/inventory",
    permission: "INVENTORY",
    items: [
      { href: "/admin/inventory", label: "מלאי", title: "מלאי", icon: InventoryIcon },
      { href: "/admin/wines", label: "יינות", title: "ניהול יינות", icon: WineIcon },
    ],
  },
  {
    id: "tastings",
    label: "טעימות",
    title: "טעימות",
    icon: TastingIcon,
    href: "/admin/tastings",
    permission: "TASTINGS",
    items: [
      {
        href: "/admin/tastings",
        label: "מפגשים",
        title: "טעימות",
        icon: TastingIcon,
        alsoMatches: ["/admin/sessions"],
      },
    ],
  },
  {
    id: "finance",
    label: "כספים",
    title: "כספים",
    icon: CreditIcon,
    href: "/admin/credit",
    items: [
      { href: "/admin/credit", label: "אשראי", title: "מעקב אשראי", icon: CreditIcon, permission: "CREDIT" },
      {
        href: "/admin/monthly-summary",
        label: "סיכום חודשי",
        title: "סיכום חודשי",
        icon: MonthlySummaryIcon,
        permission: "SALES",
      },
      {
        href: "/admin/growers",
        label: "כורמים",
        title: "כורמים ומחירי ענבים",
        icon: VineyardIcon,
        permission: "GROWERS",
      },
    ],
  },
  {
    id: "more",
    label: "עוד",
    title: "עוד",
    icon: MoreIcon,
    href: "/admin/more",
    items: [{ href: "/admin/more", label: "עוד", title: "עוד", icon: MoreIcon }],
  },
]

function matchesPath(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function itemMatches(pathname: string, item: AdminItem): boolean {
  return matchesPath(pathname, item.href) || (item.alsoMatches ?? []).some((prefix) => matchesPath(pathname, prefix))
}

export function findActive(pathname: string): { area: AdminArea; item: AdminItem } | null {
  for (const area of adminAreas) {
    const item = area.items.find((candidate) => itemMatches(pathname, candidate))
    if (item) return { area, item }
  }
  return null
}

// Pages that read the selected vintage from the ?vintage= parameter.
const VINTAGE_PATHS = [
  "/admin",
  "/admin/vineyard/samples",
  "/admin/intake",
  "/admin/fermentation",
  "/admin/finished-wine",
  "/admin/season-summary",
]

export function showsVintage(pathname: string): boolean {
  return VINTAGE_PATHS.includes(pathname)
}

// Keeps the chosen vintage when moving between screens that depend on it.
export function withVintage(href: string, vintageParam: string | null): string {
  return vintageParam && VINTAGE_PATHS.includes(href) ? `${href}?vintage=${vintageParam}` : href
}
