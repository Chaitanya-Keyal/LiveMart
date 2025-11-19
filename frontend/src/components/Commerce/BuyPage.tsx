import { Container, Heading, VStack } from "@chakra-ui/react"
import { useState } from "react"
import type { CategoryEnum } from "@/client"
import { CategoryFilter } from "@/components/Products/CategoryFilter"
import { ProductGrid } from "@/components/Products/ProductGrid"
import useAuth from "@/hooks/useAuth"
import { useProducts } from "@/hooks/useProducts"

const PER_PAGE = 12

export const BuyPage = () => {
  const { activeRole } = useAuth()
  const [category, setCategory] = useState<CategoryEnum | null>(null)
  const [page, setPage] = useState(1)

  const sellerType = activeRole === "retailer" ? "wholesaler" : "retailer"

  const { products, count, isLoading } = useProducts({
    sellerType,
    category,
    skip: (page - 1) * PER_PAGE,
    limit: PER_PAGE,
    isActive: true,
  })

  const heading =
    activeRole === "retailer" ? "Wholesaler Catalog" : "Browse Products"

  return (
    <Container maxW="full">
      <VStack align="stretch" gap={6} pt={4}>
        <Heading size="lg">{heading}</Heading>
        <CategoryFilter value={category} onChange={setCategory} />
        <ProductGrid
          products={products}
          count={count}
          isLoading={isLoading}
          pageSize={PER_PAGE}
          currentPage={page}
          onPageChange={setPage}
        />
      </VStack>
    </Container>
  )
}
