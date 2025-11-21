import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import type { UserPublic } from "@/client"
import { UsersService } from "@/client"
import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/")({
  component: RoleRedirect,
})

function RoleRedirect() {
  const navigate = useNavigate()
  const { data: user, isLoading } = useQuery<UserPublic | null, Error>({
    queryKey: ["currentUser"],
    queryFn: UsersService.readUserMe,
    enabled: isLoggedIn(),
    retry: false,
  })

  useEffect(() => {
    // Wait for user data to load to avoid premature redirects
    if (isLoading || !user) return

    const activeRole = user.active_role
    if (!activeRole) return

    if (activeRole === "customer") {
      navigate({ to: "/buy" })
    } else if (activeRole === "retailer" || activeRole === "wholesaler") {
      navigate({ to: "/sell" })
    } else if (activeRole === "delivery_partner") {
      navigate({ to: "/delivery/available" })
    }
  }, [user, isLoading, navigate])

  return null
}
