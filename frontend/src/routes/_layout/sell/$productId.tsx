import { Box, Heading, HStack, Spinner, Text, VStack } from "@chakra-ui/react"
import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import type { UserPublic } from "@/client"
import PageContainer from "@/components/Common/PageContainer"
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
      <PageContainer variant="form">
        <HStack justify="center" py={12}>
          <Spinner size="xl" />
          <Text fontSize="lg" color="fg.muted">
            Loading product...
          </Text>
        </HStack>
      </PageContainer>
    )
  }

  if (!product) {
    return (
      <PageContainer variant="form">
        <Box textAlign="center" py={12}>
          <Heading size="lg" mb={2}>
            Product Not Found
          </Heading>
          <Text color="fg.muted">
            The product you're looking for doesn't exist.
          </Text>
        </Box>
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="form">
      <VStack align="start" gap={8} w="100%">
        <Box>
          <Heading size="xl" mb={2}>
            Edit Product
          </Heading>
          <Text fontSize="lg" color="fg.muted">
            Update your product information
          </Text>
        </Box>
        <ProductForm
          product={product}
          onSuccess={() => navigate({ to: "/sell" })}
          onCancel={() => navigate({ to: "/sell" })}
        />
      </VStack>
    </PageContainer>
  )
}
