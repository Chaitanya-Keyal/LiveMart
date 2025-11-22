import {
  Box,
  Button,
  Checkbox,
  createListCollection,
  HStack,
  Input,
  Portal,
  Select,
  Text,
  VStack,
} from "@chakra-ui/react"
import type { CategoryEnum } from "@/client"

interface FilterSidebarProps {
  category: CategoryEnum | null
  onCategoryChange: (c: CategoryEnum | null) => void
  brands: string[]
  onBrandsChange: (b: string[]) => void
  tags: string[]
  onTagsChange: (t: string[]) => void
  inStockOnly: boolean
  onInStockOnlyChange: (v: boolean) => void
  minPrice: number | null
  maxPrice: number | null
  onPriceChange: (min: number | null, max: number | null) => void
  latitude: number | null
  longitude: number | null
  radiusKm: number | null
  onRadiusChange: (v: number | null) => void
  sortBy:
    | "newest"
    | "price_asc"
    | "price_desc"
    | "distance_asc"
    | "rating_desc"
    | "rating_asc"
  onSortByChange: (
    v:
      | "newest"
      | "price_asc"
      | "price_desc"
      | "distance_asc"
      | "rating_desc"
      | "rating_asc",
  ) => void
  onClearFilters: () => void
}

const CATEGORY_OPTIONS: Array<{ value: CategoryEnum; label: string }> = [
  { value: "electronics", label: "Electronics" },
  { value: "clothing", label: "Clothing" },
  { value: "food_beverage", label: "Food & Beverage" },
  { value: "home_garden", label: "Home & Garden" },
  { value: "health_beauty", label: "Health & Beauty" },
  { value: "sports", label: "Sports" },
  { value: "toys", label: "Toys" },
  { value: "books", label: "Books" },
  { value: "automotive", label: "Automotive" },
  { value: "office_supplies", label: "Office Supplies" },
  { value: "pet_supplies", label: "Pet Supplies" },
  { value: "jewellery", label: "Jewellery" },
  { value: "furniture", label: "Furniture" },
]

export const FilterSidebar = (props: FilterSidebarProps) => {
  const {
    category,
    onCategoryChange,
    brands,
    onBrandsChange,
    tags,
    onTagsChange,
    inStockOnly,
    onInStockOnlyChange,
    minPrice,
    maxPrice,
    onPriceChange,
    radiusKm,
    onRadiusChange,
    sortBy,
    onSortByChange,
    onClearFilters,
  } = props

  return (
    <Box
      borderWidth="1px"
      borderColor="border.default"
      rounded="xl"
      p={6}
      bg="bg.surface"
      shadow="sm"
    >
      <VStack align="stretch" gap={6}>
        <HStack justify="space-between" pb={2} borderBottomWidth="1px">
          <Text fontWeight="700" fontSize="lg">
            Filters
          </Text>
          <Button size="sm" variant="ghost" onClick={onClearFilters}>
            Clear all
          </Button>
        </HStack>

        <Box>
          <Text fontSize="sm" fontWeight="600" mb={3} color="fg.emphasis">
            Category
          </Text>
          <Select.Root
            collection={createListCollection({
              items: [
                { label: "All Categories", value: "" },
                ...CATEGORY_OPTIONS,
              ],
            })}
            size="sm"
            value={[category || ""]}
            onValueChange={(e) =>
              onCategoryChange((e.value[0] || null) as CategoryEnum | null)
            }
          >
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText />
              </Select.Trigger>
              <Select.IndicatorGroup>
                <Select.Indicator />
              </Select.IndicatorGroup>
            </Select.Control>
            <Portal>
              <Select.Positioner>
                <Select.Content>
                  <Select.Item item={{ label: "All Categories", value: "" }}>
                    All Categories
                    <Select.ItemIndicator />
                  </Select.Item>
                  {CATEGORY_OPTIONS.map((c) => (
                    <Select.Item item={c} key={c.value}>
                      {c.label}
                      <Select.ItemIndicator />
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Portal>
          </Select.Root>
        </Box>

        <Box>
          <Text fontSize="sm" fontWeight="600" mb={3} color="fg.emphasis">
            Brands
          </Text>
          <Input
            value={brands.join(", ")}
            onChange={(e) =>
              onBrandsChange(
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
            placeholder="e.g. Nike, Adidas"
          />
        </Box>

        <Box>
          <Text fontSize="sm" fontWeight="600" mb={3} color="fg.emphasis">
            Tags
          </Text>
          <Input
            value={tags.join(", ")}
            onChange={(e) =>
              onTagsChange(
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
            placeholder="e.g. featured, bestseller"
          />
        </Box>

        <Box>
          <Text fontSize="sm" fontWeight="600" mb={3} color="fg.emphasis">
            Price Range
          </Text>
          <HStack>
            <Input
              type="number"
              placeholder="Min"
              value={minPrice ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onPriceChange(
                  e.target.value ? Number(e.target.value) : null,
                  maxPrice,
                )
              }
            />
            <Input
              type="number"
              placeholder="Max"
              value={maxPrice ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onPriceChange(
                  minPrice,
                  e.target.value ? Number(e.target.value) : null,
                )
              }
            />
          </HStack>
        </Box>

        <Checkbox.Root
          checked={inStockOnly}
          onCheckedChange={(e) => onInStockOnlyChange(!!e.checked)}
        >
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label>In Stock only</Checkbox.Label>
        </Checkbox.Root>

        <Box>
          <Text fontSize="sm" fontWeight="600" mb={3} color="fg.emphasis">
            Sort By
          </Text>
          <Select.Root
            collection={createListCollection({
              items: [
                { label: "Newest", value: "newest" },
                { label: "Price: Low to High", value: "price_asc" },
                { label: "Price: High to Low", value: "price_desc" },
                { label: "Rating: High to Low", value: "rating_desc" },
                { label: "Rating: Low to High", value: "rating_asc" },
                { label: "Nearest", value: "distance_asc" },
              ],
            })}
            size="sm"
            value={[sortBy]}
            onValueChange={(e) => onSortByChange(e.value[0] as any)}
          >
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText />
              </Select.Trigger>
              <Select.IndicatorGroup>
                <Select.Indicator />
              </Select.IndicatorGroup>
            </Select.Control>
            <Portal>
              <Select.Positioner>
                <Select.Content>
                  <Select.Item item={{ label: "Newest", value: "newest" }}>
                    Newest
                    <Select.ItemIndicator />
                  </Select.Item>
                  <Select.Item
                    item={{ label: "Price: Low to High", value: "price_asc" }}
                  >
                    Price: Low to High
                    <Select.ItemIndicator />
                  </Select.Item>
                  <Select.Item
                    item={{ label: "Price: High to Low", value: "price_desc" }}
                  >
                    Price: High to Low
                    <Select.ItemIndicator />
                  </Select.Item>
                  <Select.Item
                    item={{
                      label: "Rating: High to Low",
                      value: "rating_desc",
                    }}
                  >
                    Rating: High to Low
                    <Select.ItemIndicator />
                  </Select.Item>
                  <Select.Item
                    item={{ label: "Rating: Low to High", value: "rating_asc" }}
                  >
                    Rating: Low to High
                    <Select.ItemIndicator />
                  </Select.Item>
                  <Select.Item
                    item={{ label: "Nearest", value: "distance_asc" }}
                  >
                    Nearest
                    <Select.ItemIndicator />
                  </Select.Item>
                </Select.Content>
              </Select.Positioner>
            </Portal>
          </Select.Root>
        </Box>

        {sortBy === "distance_asc" && (
          <VStack align="stretch" gap={2}>
            <HStack justify="space-between">
              <Text fontWeight="semibold">Distance</Text>
            </HStack>
            <Input
              type="number"
              min={1}
              max={200}
              step={1}
              value={radiusKm ?? 25}
              onChange={(e) => onRadiusChange(Number(e.target.value))}
            />
            <Text fontSize="xs" color="fg.muted">
              Radius (km)
            </Text>
          </VStack>
        )}
      </VStack>
    </Box>
  )
}

export default FilterSidebar
