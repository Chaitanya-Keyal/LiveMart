import { Card, EmptyState, Flex, SimpleGrid, VStack } from "@chakra-ui/react"
import { FiSearch } from "react-icons/fi"
import type { ProductPublic } from "@/client"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination"
import { SkeletonText } from "@/components/ui/skeleton"
import { ProductCard } from "./ProductCard"

interface ProductGridProps {
  products: ProductPublic[]
  count: number
  isLoading?: boolean
  pageSize?: number
  currentPage?: number
  onPageChange?: (page: number) => void
}

const ProductCardSkeleton = () => (
  <Card.Root size="sm" variant="outline">
    <Card.Body p={0}>
      <Flex
        w="100%"
        aspectRatio="1"
        bg="gray.100"
        align="center"
        justify="center"
      >
        <SkeletonText noOfLines={1} w="80%" />
      </Flex>
      <Card.Body p={4}>
        <VStack align="stretch" gap={2}>
          <SkeletonText noOfLines={1} w="40%" />
          <SkeletonText noOfLines={2} />
          <SkeletonText noOfLines={1} w="60%" />
        </VStack>
      </Card.Body>
    </Card.Body>
  </Card.Root>
)

export const ProductGrid = ({
  products,
  count,
  isLoading = false,
  pageSize = 12,
  currentPage = 1,
  onPageChange,
}: ProductGridProps) => {
  if (isLoading) {
    return (
      <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap={4} w="100%">
        {[...Array(pageSize)].map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </SimpleGrid>
    )
  }

  if (products.length === 0) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <FiSearch />
          </EmptyState.Indicator>
          <VStack textAlign="center">
            <EmptyState.Title>No products found</EmptyState.Title>
            <EmptyState.Description>
              Try adjusting your filters or check back later
            </EmptyState.Description>
          </VStack>
        </EmptyState.Content>
      </EmptyState.Root>
    )
  }

  return (
    <VStack align="stretch" gap={6}>
      <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap={6} w="100%">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </SimpleGrid>
      {count > pageSize && onPageChange && (
        <Flex justifyContent="center" mt={4}>
          <PaginationRoot
            count={count}
            pageSize={pageSize}
            page={currentPage}
            onPageChange={({ page }) => onPageChange(page)}
          >
            <Flex gap={2} align="center">
              <PaginationPrevTrigger />
              <PaginationItems />
              <PaginationNextTrigger />
            </Flex>
          </PaginationRoot>
        </Flex>
      )}
    </VStack>
  )
}
