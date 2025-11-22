import { Heading, Spinner, Text, VStack } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { PageContainer } from "@/components/Common/PageContainer"
import { ProductDetail } from "@/components/Products/ProductDetail"
import { useProduct } from "@/hooks/useProducts"

export const Route = createFileRoute("/_layout/buy/$productId")({
  component: BuyProductDetailPage,
})

function BuyProductDetailPage() {
  const { productId } = Route.useParams()
  const { product, isLoading } = useProduct(productId)

  if (isLoading) {
    return (
      <PageContainer variant="detail">
        <VStack gap={6} py={20} align="center">
          <Spinner size="xl" />
          <Text color="fg.muted">Loading product details...</Text>
        </VStack>
      </PageContainer>
    )
  }

  if (!product) {
    return (
      <PageContainer variant="detail">
        <VStack gap={6} py={20} align="center">
          <Heading size="lg" color="fg.muted">
            Product not found
          </Heading>
          <Text color="fg.muted">
            The product you're looking for doesn't exist or has been removed.
          </Text>
        </VStack>
      </PageContainer>
    )
  }

  return <ProductDetail product={product} />
}
