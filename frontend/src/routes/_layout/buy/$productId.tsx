import { Container, Spinner, VStack } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
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
      <Container maxW="6xl" py={8}>
        <VStack gap={4}>
          <Spinner size="xl" />
        </VStack>
      </Container>
    )
  }

  if (!product) {
    return (
      <Container maxW="6xl" py={8}>
        <VStack gap={4}>
          <p>Product not found</p>
        </VStack>
      </Container>
    )
  }

  return <ProductDetail product={product} />
}
