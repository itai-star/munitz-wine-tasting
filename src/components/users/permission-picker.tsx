"use client"

import { PERMISSIONS, PERMISSION_LABELS } from "@/lib/permissions"
import type { PermissionKey, UserRoleKey } from "@/lib/permissions"

type Props = {
  role: UserRoleKey
  permissions: PermissionKey[]
  disabled?: boolean
  onRoleChange: (role: UserRoleKey) => void
  onPermissionsChange: (permissions: PermissionKey[]) => void
}

// Role and function checkboxes, shared by the create form and the user cards.
export function PermissionPicker({ role, permissions, disabled, onRoleChange, onPermissionsChange }: Props) {
  function toggle(permission: PermissionKey) {
    onPermissionsChange(
      permissions.includes(permission) ? permissions.filter((p) => p !== permission) : [...permissions, permission]
    )
  }

  return (
    <div className="space-y-3">
      <fieldset disabled={disabled} className="flex gap-4">
        <legend className="text-sm font-medium text-stone-700 mb-1">תפקיד</legend>
        {(["USER", "ADMIN"] as const).map((value) => (
          <label key={value} className="inline-flex items-center gap-2 min-h-10 text-sm">
            <input type="radio" checked={role === value} onChange={() => onRoleChange(value)} />
            {value === "ADMIN" ? "מנהל (גישה לכל הפונקציות וניהול משתמשים)" : "משתמש"}
          </label>
        ))}
      </fieldset>

      <fieldset disabled={disabled || role === "ADMIN"} className="space-y-1">
        <legend className="text-sm font-medium text-stone-700 mb-1">פונקציות זמינות</legend>
        <div className="grid sm:grid-cols-2 gap-x-4">
          {PERMISSIONS.map((permission) => (
            <label key={permission} className="inline-flex items-center gap-2 min-h-10 text-sm">
              <input
                type="checkbox"
                checked={role === "ADMIN" || permissions.includes(permission)}
                onChange={() => toggle(permission)}
              />
              {PERMISSION_LABELS[permission]}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )
}
