import type { ReactNode } from "react"

// Simplified stub RoleGuard: returns children directly (authorization handled elsewhere)
export function RoleGuard({ children }: { children: ReactNode }) {
  return <>{children}</>
}
