import { Box, Heading, SimpleGrid, Text, VStack } from "@chakra-ui/react"
import { useEffect, useMemo, useState } from "react"
import type { AddressPublic, CategoryEnum } from "@/client"
import { FilterSidebar } from "@/components/Common/FilterSidebar"
import { PageContainer } from "@/components/Common/PageContainer"
import { SearchBar } from "@/components/Common/SearchBar"
import { ProductGrid } from "@/components/Products/ProductGrid"
import useAddresses from "@/hooks/useAddresses"
import useAuth from "@/hooks/useAuth"
import { useProducts } from "@/hooks/useProducts"

const PER_PAGE = 12

export const BuyPage = () => {
  const { activeRole } = useAuth()
  const { addresses } = useAddresses()
  const [category, setCategory] = useState<CategoryEnum | null>(null)
  const [search, setSearch] = useState<string>("")
  const [brands, setBrands] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [inStockOnly, setInStockOnly] = useState<boolean>(false)
  const [minPrice, setMinPrice] = useState<number | null>(null)
  const [maxPrice, setMaxPrice] = useState<number | null>(null)
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [radiusKm, setRadiusKm] = useState<number | null>(25)
  const [sortBy, setSortBy] = useState<
    | "newest"
    | "price_asc"
    | "price_desc"
    | "distance_asc"
    | "rating_desc"
    | "rating_asc"
  >("newest")
  const [page, setPage] = useState(1)

  const sellerType = activeRole === "retailer" ? "wholesaler" : "retailer"

  // Default location to active address if available
  const activeAddress = useMemo(() => {
    return (addresses || []).find((a: AddressPublic) => a.is_active) || null
  }, [addresses])
  useEffect(() => {
    if (activeAddress) {
      setLatitude(activeAddress.latitude)
      setLongitude(activeAddress.longitude)
    }
  }, [activeAddress])

  const { products, count, isLoading } = useProducts({
    sellerType,
    category,
    search: search || null,
    brands: brands.length ? brands : null,
    tags: tags.length ? tags : null,
    inStockOnly,
    minPrice,
    maxPrice,
    latitude,
    longitude,
    radiusKm: sortBy === "distance_asc" ? radiusKm : null,
    sortBy,
    skip: (page - 1) * PER_PAGE,
    limit: PER_PAGE,
    isActive: true,
  })

  const heading =
    activeRole === "retailer" ? "Wholesaler Catalog" : "Browse Products"
  const subheading = count
    ? `${count} product${count === 1 ? "" : "s"} available`
    : "Loading..."

  return (
    <PageContainer variant="list">
      <VStack align="stretch" gap={8}>
        <Box>
          <Heading size="xl" mb={2}>
            {heading}
          </Heading>
          <Text color="fg.muted" fontSize="md">
            {subheading}
          </Text>
        </Box>
        <SearchBar
          value={search}
          onChange={setSearch}
          onClear={() => setSearch("")}
        />
        <SimpleGrid columns={{ base: 1, lg: 4 }} gap={8}>
          <Box
            gridColumn={{ base: "1", lg: "span 1" }}
            position={{ base: "static", lg: "sticky" }}
            top={{ lg: "80px" }}
            h={{ lg: "fit-content" }}
            maxH={{ lg: "calc(100vh - 100px)" }}
            overflowY={{ lg: "auto" }}
          >
            <FilterSidebar
              category={category}
              onCategoryChange={setCategory}
              brands={brands}
              onBrandsChange={setBrands}
              tags={tags}
              onTagsChange={setTags}
              inStockOnly={inStockOnly}
              onInStockOnlyChange={setInStockOnly}
              minPrice={minPrice}
              maxPrice={maxPrice}
              onPriceChange={(minV: number | null, maxV: number | null) => {
                setMinPrice(minV)
                setMaxPrice(maxV)
              }}
              latitude={latitude}
              longitude={longitude}
              radiusKm={radiusKm}
              onRadiusChange={setRadiusKm}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              onClearFilters={() => {
                setCategory(null)
                setBrands([])
                setTags([])
                setInStockOnly(false)
                setMinPrice(null)
                setMaxPrice(null)
                setRadiusKm(25)
                setSortBy("newest")
              }}
            />
          </Box>
          <Box gridColumn={{ base: "1", lg: "span 3" }}>
            <ProductGrid
              products={products}
              count={count}
              isLoading={isLoading}
              pageSize={PER_PAGE}
              currentPage={page}
              onPageChange={setPage}
            />
          </Box>
        </SimpleGrid>
      </VStack>
    </PageContainer>
  )
}
