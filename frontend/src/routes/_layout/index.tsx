import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/")({
  component: RoleRedirect,
})

function RoleRedirect() {
  const { activeRole } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!activeRole) return
    if (activeRole === "customer") {
      navigate({ to: "/buy" })
    } else if (activeRole === "retailer" || activeRole === "wholesaler") {
      navigate({ to: "/sell" })
    } else if (activeRole === "delivery_partner") {
      navigate({ to: "/delivery/available" })
    }
  }, [activeRole, navigate])

  return null
}
