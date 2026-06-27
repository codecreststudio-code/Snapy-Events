// src/lib/auth/rbac.ts
// Pure role-based access control helpers. No DB, no I/O.

import type { Permission, UserRole } from "@/lib/types"

const WILDCARD = "*" as const

export function hasPermission(role: UserRole, granted: Permission[], required: Permission | typeof WILDCARD): boolean {
  if (granted.includes(WILDCARD as unknown as Permission)) return true
  if (granted.includes(required as Permission)) return true
  // Owner has implicit wildcard
  if (role === "owner") return true
  // Pattern match: e.g. "events:*" matches "events:create"
  const [scope] = (required as string).split(":")
  if (granted.includes(`${scope}:*` as Permission)) return true
  return false
}

export function isAdminRole(role: UserRole): boolean {
  return role === "owner" || role === "admin"
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  owner: "Full access including billing and account deletion",
  admin: "Manage events, users, and settings (no billing)",
  member: "Create and manage own events and galleries",
  viewer: "Read-only access to events and galleries",
}
