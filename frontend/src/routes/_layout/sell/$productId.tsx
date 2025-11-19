import { Container, Heading, Spinner, VStack } from "@chakra-ui/react"
import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import type { UserPublic } from "@/client"
import { ProductForm } from "@/components/Retailer/ProductForm"
import { useProduct } from "@/hooks/useProducts"

export const Route = createFileRoute("/_layout/sell/$productId")({
  component: SellEditProductPage,
})

function SellEditProductPage() {
  const { productId } = Route.useParams()
  const { product, isLoading } = useProduct(productId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
    // If user data isn't loaded yet, do nothing to avoid false redirects
    if (currentUser === undefined) return
    const role = currentUser?.active_role
    if (!currentUser || (role !== "retailer" && role !== "wholesaler")) {
      navigate({
        to: "/",
        search: { error: "Sell page is for retailers and wholesalers" },
      })
    }
  }, [queryClient, navigate])

  if (isLoading) {
    return (
      <Container maxW="4xl" py={8}>
        <VStack gap={4}>
          <Spinner size="xl" />
        </VStack>
      </Container>
    )
  }

  if (!product) {
    return (
      <Container maxW="4xl" py={8}>
        <VStack gap={4}>
          <p>Product not found</p>
        </VStack>
      </Container>
    )
  }

  return (
    <Container maxW="4xl" py={8}>
      <Heading size="lg" mb={6}>
        Edit Product
      </Heading>
      <ProductForm
        product={product}
        onSuccess={() => navigate({ to: "/sell" })}
        onCancel={() => navigate({ to: "/sell" })}
      />
    </Container>
  )
}
