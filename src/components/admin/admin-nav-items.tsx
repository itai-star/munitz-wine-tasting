import {
  TastingIcon,
  WineIcon,
  InventoryIcon,
  VineyardIcon,
  IntakeIcon,
  FermentationIcon,
} from "@/components/admin/nav-icons"

export type AdminNavItem = {
  href: string
  label: string
  description: string
  icon: (props: { className?: string }) => React.JSX.Element
}

export const adminNavItems: AdminNavItem[] = [
  {
    href: "/admin",
    label: "טעימות",
    description: "ניהול מפגשי טעימה פעילים",
    icon: TastingIcon,
  },
  {
    href: "/admin/wines",
    label: "יינות",
    description: "קטלוג יינות, מחירים ומלאי",
    icon: WineIcon,
  },
  {
    href: "/admin/inventory",
    label: "מלאי",
    description: "מעקב מלאי וסריקת ברקוד",
    icon: InventoryIcon,
  },
  {
    href: "/admin/vineyard",
    label: "כרם",
    description: "בלוקים ודגימות בשלות",
    icon: VineyardIcon,
  },
  {
    href: "/admin/intake",
    label: "קליטת ענבים",
    description: "רישום משקל ומשטחים בקליטה",
    icon: IntakeIcon,
  },
  {
    href: "/admin/fermentation",
    label: "תסיסה",
    description: "מיכלים וקריאות יומיות",
    icon: FermentationIcon,
  },
]

export function isAdminNavItemActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin"
  return pathname.startsWith(href)
}
