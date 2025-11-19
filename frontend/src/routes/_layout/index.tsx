import {
  Box,
  Container,
  Flex,
  Heading,
  Link,
  Text,
  VStack,
} from "@chakra-ui/react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { ProductGrid } from "@/components/Products/ProductGrid"
import useAuth from "@/hooks/useAuth"
import { useProducts } from "@/hooks/useProducts"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
})

function Dashboard() {
  const { user: currentUser, activeRole } = useAuth()
  const navigate = useNavigate()

  // Show featured products for customers
  const { products, isLoading } = useProducts({
    tags: ["featured"],
    limit: 6,
    isActive: true,
  })

  // Fallback to first 6 products if no featured products
  const displayProducts = products.length > 0 ? products : []
  const showFeatured = activeRole === "customer" || !activeRole

  return (
    <Container maxW="full">
      <Box pt={12} m={4}>
        <Text fontSize="2xl" truncate maxW="sm" mb={2}>
          Hi, {currentUser?.full_name || currentUser?.email} 👋🏼
        </Text>
        <Text mb={8}>Welcome back, nice to see you again!</Text>

        {showFeatured && (
          <VStack align="stretch" gap={4}>
            <Flex justify="space-between" align="center">
              <Heading size="md">Featured Products</Heading>
              <Link
                as="button"
                onClick={() => navigate({ to: "/buy" })}
                color="blue.500"
                textDecoration="underline"
              >
                View All
              </Link>
            </Flex>
            {displayProducts.length > 0 ? (
              <ProductGrid
                products={displayProducts}
                count={displayProducts.length}
                isLoading={isLoading}
                pageSize={6}
              />
            ) : (
              <Box p={8} textAlign="center" bg="gray.50" borderRadius="md">
                <Text color="gray.600">No featured products available</Text>
                <Link
                  as="button"
                  onClick={() => navigate({ to: "/buy" })}
                  mt={2}
                  color="blue.500"
                  textDecoration="underline"
                >
                  Browse all products
                </Link>
              </Box>
            )}
          </VStack>
        )}
      </Box>
    </Container>
  )
}
