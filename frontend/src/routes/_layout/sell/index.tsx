import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import type { UserPublic } from "@/client"
import { SellPage } from "@/components/Commerce/SellPage"

export const Route = createFileRoute("/_layout/sell/")({
  component: SellRouteComponent,
})

function SellRouteComponent() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
    // Wait for user data to load to avoid premature redirects
    if (currentUser === undefined) return
    const role = currentUser?.active_role
    if (!currentUser || (role !== "retailer" && role !== "wholesaler")) {
      navigate({
        to: "/",
        search: { error: "Sell page is for retailers and wholesalers" },
      })
    }
  }, [queryClient, navigate])

  return <SellPage />
}
