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

// The areas the signed-in user may open; the pages themselves are protected separately on the server.
export function useVisibleAreas(): AdminArea[] {
  const user = useContext(AccessContext)
  if (!user) return []
  return adminAreas.filter((area) => !area.permission || canUse(user, area.permission))
}
