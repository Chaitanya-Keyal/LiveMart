import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import type { UserPublic } from "@/client"
import { BuyPage } from "@/components/Commerce/BuyPage"

export const Route = createFileRoute("/_layout/buy/")({
  component: BuyRouteComponent,
})

function BuyRouteComponent() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
    const role = currentUser?.active_role
    if (!currentUser || (role !== "customer" && role !== "retailer")) {
      navigate({
        to: "/sell",
        search: { error: "Buy page is for customers and retailers" },
      })
    }
  }, [queryClient, navigate])

  return <BuyPage />
}
