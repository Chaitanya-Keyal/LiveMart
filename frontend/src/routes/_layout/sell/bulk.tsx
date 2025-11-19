import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import type { UserPublic } from "@/client"
import { BulkUploadForm } from "@/components/Wholesaler/BulkUploadForm"

export const Route = createFileRoute("/_layout/sell/bulk")({
  component: SellBulkUploadPage,
})

function SellBulkUploadPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
    if (!currentUser || currentUser.active_role !== "wholesaler") {
      navigate({
        to: "/sell",
        search: { error: "Bulk upload is for wholesalers" },
      })
    }
  }, [queryClient, navigate])

  return <BulkUploadForm />
}
