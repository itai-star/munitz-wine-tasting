"use client"

import { createContext, useContext } from "react"
import { adminAreas } from "@/components/admin/admin-areas"
import type { AdminArea } from "@/components/admin/admin-areas"
import { canUse } from "@/lib/permissions"
import type { SessionUser } from "@/lib/permissions"

type AccessUser = Pick<SessionUser, "role" | "permissions">

const AccessContext = createContext<AccessUser | null>(null)

export function AdminAccessProvider({ user, children }: { user: AccessUser; children: React.ReactNode }) {
  return <AccessContext.Provider value={user}>{children}</AccessContext.Provider>
}

// The areas, and the items inside them, that the signed-in user may open. The pages themselves
// are protected separately on the server.
export function useVisibleAreas(): AdminArea[] {
  const user = useContext(AccessContext)
  if (!user) return []

  return adminAreas.flatMap((area) => {
    const items = area.items.filter((item) => {
      const permission = item.permission ?? area.permission
      return !permission || canUse(user, permission)
    })
    if (items.length === 0) return []
    const href = items.some((item) => item.href === area.href) ? area.href : items[0].href
    return [{ ...area, href, items }]
  })
}
