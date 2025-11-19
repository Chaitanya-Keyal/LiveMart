import { Container, Heading } from "@chakra-ui/react"
import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import type { UserPublic } from "@/client"
import { ProductForm } from "@/components/Retailer/ProductForm"

export const Route = createFileRoute("/_layout/sell/new")({
  component: SellNewProductPage,
})

function SellNewProductPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
    const role = currentUser?.active_role
    if (!currentUser || (role !== "retailer" && role !== "wholesaler")) {
      navigate({
        to: "/",
        search: { error: "Sell page is for retailers and wholesalers" },
      })
    }
  }, [queryClient, navigate])

  return (
    <Container maxW="4xl" py={8}>
      <Heading size="lg" mb={6}>
        Add Product
      </Heading>
      <ProductForm
        onSuccess={() => navigate({ to: "/sell" })}
        onCancel={() => navigate({ to: "/sell" })}
      />
    </Container>
  )
}
